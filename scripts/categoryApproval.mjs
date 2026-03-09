import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import readline from "node:readline";

config({ path: ".env.import" });

const DRY_RUN = false;
const MAX_DEPTH = 3;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    throw new Error("Missing env vars. Need SUPABASE_URL and SUPABASE_SERVICE_ROLE in .env.import");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false }
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

function printSeparator() {
    console.log("\n========================================");
}

function getCategoryDepth(category) {
    return category.slug.split("-").length;
}

async function fetchCategories() {
    const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, parent_id");

    if (error) throw error;

    return (data || []).sort((a, b) => a.slug.localeCompare(b.slug));
}

async function fetchProductCounts() {
    const { data, error } = await supabase
        .from("products")
        .select("category_id")
        .not("category_id", "is", null);

    if (error) throw error;

    const countsByCategoryId = new Map();

    for (const row of data || []) {
        const current = countsByCategoryId.get(row.category_id) || 0;
        countsByCategoryId.set(row.category_id, current + 1);
    }

    return countsByCategoryId;
}

async function fetchProductCountForCategory(categoryId) {
    const { count, error } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("category_id", categoryId);

    if (error) throw error;

    return count || 0;
}

async function promptDecision(category, parentCategory, productCount) {
    while (true) {
        printSeparator();
        console.log(`Slug: ${category.slug}`);
        console.log(`Parent: ${parentCategory.slug}`);
        console.log(`Product count: ${productCount}`);

        const answer = (await ask("Choose action: (a) approve, (m) merge into parent, (s) skip: "))
            .trim()
            .toLowerCase();

        if (answer === "a") return "approve";
        if (answer === "m") return "merge";
        if (answer === "s") return "skip";

        console.log("Invalid option. Enter a, m, or s.");
    }
}

async function confirmExecution() {
    while (true) {
        const answer = (await ask("\nExecute migration? (yes/no): "))
            .trim()
            .toLowerCase();

        if (answer === "yes") return true;
        if (answer === "no") return false;

        console.log("Invalid option. Enter yes or no.");
    }
}

async function updateProductsCategory(fromCategoryId, toCategoryId) {
    const { error, count } = await supabase
        .from("products")
        .update({ category_id: toCategoryId })
        .eq("category_id", fromCategoryId)
        .select("*", { count: "exact" });

    if (error) throw error;

    return count || 0;
}

async function deleteCategory(categoryId) {
    const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

    if (error) throw error;
}

async function main() {
    console.log(`DRY_RUN: ${DRY_RUN}`);

    const categories = await fetchCategories();
    const productCounts = await fetchProductCounts();

    const categoriesById = new Map(categories.map((category) => [category.id, category]));
    const mergeDecisions = [];

    console.log(`Loaded ${categories.length} categories.`);

    for (const category of categories) {
        if (category.parent_id === null) {
            continue; // still skip true top-level categories
        }

        const parentCategory = categoriesById.get(category.parent_id);

        if (!parentCategory) {
            throw new Error(
                `Missing parent category for ${category.slug} (${category.parent_id})`
            );
        }

        const productCount = productCounts.get(category.id) || 0;
        const decision = await promptDecision(
            category,
            parentCategory,
            productCount
        );

        if (decision === "merge") {
            mergeDecisions.push({
                category,
                parentCategory,
                productCount
            });
        }
    }

    printSeparator();
    console.log(`Merge decisions recorded: ${mergeDecisions.length}`);
    fs.writeFileSync(
        "category_migration_log.json",
        JSON.stringify(
            mergeDecisions.map((decision) => ({
                from: decision.category.slug,
                to: decision.parentCategory.slug,
                productCount: decision.productCount
            })),
            null,
            2
        )
    );
    console.log("Wrote audit log to category_migration_log.json");

    const shouldExecute = await confirmExecution();

    if (!shouldExecute) {
        console.log("Migration cancelled.");
        return;
    }

    if (!mergeDecisions.length) {
        console.log("No merge decisions to execute.");
        return;
    }

    for (const decision of mergeDecisions) {
        const { category, parentCategory, productCount } = decision;
        const depth = getCategoryDepth(category);

        printSeparator();
        console.log(DRY_RUN ? "[DRY RUN] MERGING" : "MERGING");
        console.log(`From: ${category.slug}`);
        console.log(`To: ${parentCategory.slug}`);
        console.log(`Expected products: ${productCount}`);

        if (category.parent_id === null) {
            throw new Error(`Refusing to merge top-level category: ${category.slug}`);
        }

        if (DRY_RUN) {
            console.log(`[DRY RUN] Actual updated: ${productCount}`);
            console.log(`[DRY RUN] Would update products from category ${category.id} to ${parentCategory.id}`);
            console.log(`[DRY RUN] Would verify source category is empty before delete`);
            console.log(`[DRY RUN] Would delete category ${category.slug} (${category.id})`);
            continue;
        }

        const updatedCount = await updateProductsCategory(category.id, parentCategory.id);
        console.log(`Actual updated: ${updatedCount}`);

        if (updatedCount !== productCount) {
            console.warn(`Warning: expected ${productCount} products but updated ${updatedCount}.`);
        }

        const remainingCount = await fetchProductCountForCategory(category.id);

        if (remainingCount > 0) {
            throw new Error(`Refusing to delete ${category.slug}; ${remainingCount} products still reference it.`);
        }

        await deleteCategory(category.id);
        console.log(`Deleted category ${category.slug}.`);
    }

    printSeparator();
    console.log(DRY_RUN ? "Dry run complete." : "Migration complete.");
}

try {
    await main();
} catch (error) {
    console.error("Fatal error:", error);
    process.exitCode = 1;
} finally {
    rl.close();
}
