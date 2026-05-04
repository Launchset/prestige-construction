import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DONE_PATH = path.join(__dirname, "scraper", "pdf-feature-review-done.json");
const BRANCH_ENV_PATH = path.join(ROOT_DIR, ".env.import");
const MAIN_ENV_PATH = path.join(ROOT_DIR, ".env.local");
const WRITE_TO_MAIN = process.env.PDF_FEATURE_MAIN_WRITE === "1";

function parseJson(raw) {
  return JSON.parse(raw.replace(/^\uFEFF/, ""));
}

async function readEnv(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return dotenv.parse(raw);
}

function requireEnv(env, name, source) {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`Missing ${name} in ${source}`);
  }

  return value;
}

async function loadApprovedDoneRows() {
  const raw = await fs.readFile(DONE_PATH, "utf8");
  const parsed = parseJson(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("pdf-feature-review-done.json must be an array");
  }

  return parsed.filter((row) => row?.pdf_review_status === "approved" && row?.product_id);
}

function createSupabase(env, sourceName) {
  return createClient(
    requireEnv(env, "SUPABASE_URL", sourceName),
    requireEnv(env, "SUPABASE_SERVICE_ROLE", sourceName),
    { auth: { persistSession: false } },
  );
}

function chunk(values, size) {
  const chunks = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

async function fetchBranchProducts(branchSupabase, productIds) {
  const products = [];

  for (const ids of chunk(productIds, 100)) {
    const { data, error } = await branchSupabase
      .from("products")
      .select("id, sku, scraped_features")
      .in("id", ids);

    if (error) {
      throw error;
    }

    products.push(...(data ?? []));
  }

  return products;
}

function normalizeFeatures(features) {
  if (!Array.isArray(features)) {
    return [];
  }

  return features
    .map((feature) => String(feature ?? "").trim())
    .filter(Boolean);
}

async function main() {
  if (WRITE_TO_MAIN) {
    throw new Error(
      "Refusing to write: the branch database is not a reliable source for this sync. Main already matches the approved done ledger by feature count.",
    );
  }

  const [branchEnv, mainEnv, doneRows] = await Promise.all([
    readEnv(BRANCH_ENV_PATH),
    readEnv(MAIN_ENV_PATH),
    loadApprovedDoneRows(),
  ]);
  const branchSupabase = createSupabase(branchEnv, ".env.import");
  const mainSupabase = createSupabase(mainEnv, ".env.local");
  const productIds = [...new Set(doneRows.map((row) => String(row.product_id)))];
  const branchProducts = await fetchBranchProducts(branchSupabase, productIds);
  const branchById = new Map(branchProducts.map((product) => [String(product.id), product]));
  const doneById = new Map(doneRows.map((row) => [String(row.product_id), row]));

  console.log(`Approved done rows: ${doneRows.length}`);
  console.log(`Unique products to sync: ${productIds.length}`);
  console.log(`Branch products found: ${branchProducts.length}`);
  console.log(
    WRITE_TO_MAIN
      ? "Main writes are enabled."
      : "Dry run only. Set PDF_FEATURE_MAIN_WRITE=1 to update main.",
  );

  let updated = 0;
  let skippedMissing = 0;
  let skippedEmpty = 0;
  let skippedCountMismatch = 0;

  for (const productId of productIds) {
    const product = branchById.get(productId);

    if (!product) {
      skippedMissing += 1;
      console.log(`[SKIP missing on branch] ${productId}`);
      continue;
    }

    const features = normalizeFeatures(product.scraped_features);
    const expectedCount = Number(doneById.get(productId)?.extracted_features_count);

    if (Number.isFinite(expectedCount) && features.length !== expectedCount) {
      skippedCountMismatch += 1;
      console.log(
        `[SKIP count mismatch] ${product.sku ?? product.id}: source has ${features.length}, approved count is ${expectedCount}`,
      );
      continue;
    }

    if (features.length === 0 && expectedCount !== 0) {
      skippedEmpty += 1;
      console.log(`[SKIP empty features] ${product.sku ?? product.id}`);
      continue;
    }

    if (!WRITE_TO_MAIN) {
      console.log(`[DRY RUN] ${product.sku ?? product.id}: ${features.length} features`);
      continue;
    }

    const { error } = await mainSupabase
      .from("products")
      .update({
        scraped_features: features,
        scraped_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) {
      throw error;
    }

    updated += 1;
    console.log(`Updated main ${product.sku ?? product.id}: ${features.length} features`);
  }

  console.log(`Updated main rows: ${updated}`);
  console.log(`Skipped missing branch rows: ${skippedMissing}`);
  console.log(`Skipped empty feature rows: ${skippedEmpty}`);
  console.log(`Skipped count mismatches: ${skippedCountMismatch}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
