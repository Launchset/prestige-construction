import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const ENV_PATH = path.join(ROOT_DIR, ".env.import");
const REVIEW_PATH = path.join(__dirname, "scrape-review.json");

dotenv.config({ path: ENV_PATH });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    throw new Error("Missing env vars. Need SUPABASE_URL and SUPABASE_SERVICE_ROLE in .env.import");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { persistSession: false }
});

async function loadReviewResults() {
    const raw = await fs.readFile(REVIEW_PATH, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
        throw new Error("scrape-review.json must be an array");
    }

    return parsed;
}

function normalizeFeatures(features) {
    if (!Array.isArray(features)) {
        return [];
    }

    return features
        .map((feature) => String(feature ?? "").trim())
        .filter(Boolean);
}

async function updateProduct(row) {
    const payload = {
        scraped_name: row.scraped_name ?? null,
        scraped_price: Number.isFinite(row.scraped_price) ? row.scraped_price : null,
        scraped_features: normalizeFeatures(row.scraped_features),
        scraped_url: row.url ?? null,
        scraped_status: row.partial ? "partial_success" : "success",
        scraped_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", row.product_id);

    if (error) {
        throw error;
    }
}

async function main() {
    const reviewResults = await loadReviewResults();

    let updated = 0;

    for (const row of reviewResults) {
        if (!row.product_id) {
            throw new Error(`Missing product_id for SKU ${row.sku ?? "unknown"}`);
        }

        await updateProduct(row);
        updated++;
    }

    console.log(`Imported scrape data for ${updated} products.`);
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exitCode = 1;
});
