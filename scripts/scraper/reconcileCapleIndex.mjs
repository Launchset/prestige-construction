import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const ENV_PATH = path.join(ROOT_DIR, ".env.import");
const CAPLE_INDEX_PATH = path.join(__dirname, "caple-index.json");
const MATCHED_OUTPUT_PATH = path.join(__dirname, "caple-matched-products.json");
const UNMATCHED_OUTPUT_PATH = path.join(__dirname, "caple-unmatched-products.json");
const UNUSED_INDEX_OUTPUT_PATH = path.join(__dirname, "caple-unused-index-entries.json");

dotenv.config({ path: ENV_PATH });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    throw new Error("Missing env vars. Need SUPABASE_URL and SUPABASE_SERVICE_ROLE in .env.import");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false }
});

function normalizeSku(value) {
    return (value ?? "").trim().toUpperCase();
}

function compareBySku(a, b) {
    return a.sku.localeCompare(b.sku);
}

async function loadCapleIndex() {
    const raw = await fs.readFile(CAPLE_INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw);

    const indexEntries = Object.entries(parsed).map(([sku, url]) => ({
        sku: normalizeSku(sku),
        url
    }));

    indexEntries.sort(compareBySku);

    return {
        entries: indexEntries,
        bySku: new Map(indexEntries.map((entry) => [entry.sku, entry.url]))
    };
}

async function fetchProducts() {
    const { data, error } = await supabase
        .from("products")
        .select("id, sku, slug, name, category_id")
        .order("sku");

    if (error) {
        throw error;
    }

    return data ?? [];
}

async function fetchCategories() {
    const { data, error } = await supabase
        .from("categories")
        .select("id, name, parent_id");

    if (error) {
        throw error;
    }

    return data ?? [];
}

function buildCategoryMaps(categories) {
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const categoryPathById = new Map();
    const topLevelCategoryById = new Map();

    function resolvePath(categoryId) {
        if (!categoryId) {
            return "uncategorised";
        }

        if (categoryPathById.has(categoryId)) {
            return categoryPathById.get(categoryId);
        }

        const category = categoryById.get(categoryId);

        if (!category) {
            return "uncategorised";
        }

        const parentPath = category.parent_id ? resolvePath(category.parent_id) : null;
        const pathLabel = parentPath && parentPath !== "uncategorised"
            ? `${parentPath} / ${category.name}`
            : category.name;

        categoryPathById.set(categoryId, pathLabel);
        return pathLabel;
    }

    function resolveTopLevel(categoryId) {
        if (!categoryId) {
            return "uncategorised";
        }

        if (topLevelCategoryById.has(categoryId)) {
            return topLevelCategoryById.get(categoryId);
        }

        const category = categoryById.get(categoryId);

        if (!category) {
            return "uncategorised";
        }

        const topLevel = category.parent_id ? resolveTopLevel(category.parent_id) : category.name;
        topLevelCategoryById.set(categoryId, topLevel);
        return topLevel;
    }

    for (const category of categories) {
        resolvePath(category.id);
        resolveTopLevel(category.id);
    }

    return { categoryPathById, topLevelCategoryById };
}

function countBy(items, keyFn) {
    const counts = new Map();

    for (const item of items) {
        const key = keyFn(item);
        counts.set(key, (counts.get(key) || 0) + 1);
    }

    return [...counts.entries()].sort((a, b) => {
        if (b[1] !== a[1]) {
            return b[1] - a[1];
        }

        return a[0].localeCompare(b[0]);
    });
}

function printCountTable(title, entries) {
    console.log(`\n${title}`);

    if (!entries.length) {
        console.log("  none");
        return;
    }

    for (const [label, count] of entries) {
        console.log(`  ${count.toString().padStart(4, " ")}  ${label}`);
    }
}

async function writeJson(filePath, value) {
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
    const [capleIndex, products, categories] = await Promise.all([
        loadCapleIndex(),
        fetchProducts(),
        fetchCategories()
    ]);

    const { categoryPathById, topLevelCategoryById } = buildCategoryMaps(categories);
    const matchedProducts = [];
    const unmatchedProducts = [];
    const matchedSkus = new Set();

    for (const product of products) {
        const sku = normalizeSku(product.sku);
        const categoryPath = categoryPathById.get(product.category_id) || "uncategorised";
        const topLevelCategory = topLevelCategoryById.get(product.category_id) || "uncategorised";

        if (!sku) {
            unmatchedProducts.push({
                productId: product.id,
                sku: "",
                slug: product.slug,
                name: product.name,
                categoryPath,
                topLevelCategory,
                reason: "missing_sku"
            });
            continue;
        }

        const url = capleIndex.bySku.get(sku);

        if (url) {
            matchedSkus.add(sku);
            matchedProducts.push({
                productId: product.id,
                sku,
                slug: product.slug,
                name: product.name,
                categoryPath,
                url
            });
            continue;
        }

        unmatchedProducts.push({
            productId: product.id,
            sku,
            slug: product.slug,
            name: product.name,
            categoryPath,
            topLevelCategory,
            reason: "missing_in_caple_index"
        });
    }

    const unusedIndexEntries = capleIndex.entries
        .filter((entry) => !matchedSkus.has(entry.sku))
        .map((entry) => ({
            sku: entry.sku,
            url: entry.url,
            reason: "no_matching_product_in_database"
        }));

    matchedProducts.sort(compareBySku);
    unmatchedProducts.sort(compareBySku);
    unusedIndexEntries.sort(compareBySku);

    await Promise.all([
        writeJson(MATCHED_OUTPUT_PATH, matchedProducts),
        writeJson(UNMATCHED_OUTPUT_PATH, unmatchedProducts),
        writeJson(UNUSED_INDEX_OUTPUT_PATH, unusedIndexEntries)
    ]);

    console.log("Caple index reconciliation complete.");
    console.log(`DB products: ${products.length}`);
    console.log(`Index SKUs: ${capleIndex.entries.length}`);
    console.log(`Matched products: ${matchedProducts.length}`);
    console.log(`Unmatched products: ${unmatchedProducts.length}`);
    console.log(`Unused index entries: ${unusedIndexEntries.length}`);

    printCountTable(
        "Unmatched by top-level category",
        countBy(unmatchedProducts, (item) => item.topLevelCategory)
    );

    printCountTable(
        "Unmatched by category path",
        countBy(unmatchedProducts, (item) => item.categoryPath)
    );

    console.log(`\nWrote ${path.relative(ROOT_DIR, MATCHED_OUTPUT_PATH)}`);
    console.log(`Wrote ${path.relative(ROOT_DIR, UNMATCHED_OUTPUT_PATH)}`);
    console.log(`Wrote ${path.relative(ROOT_DIR, UNUSED_INDEX_OUTPUT_PATH)}`);
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exitCode = 1;
});
