import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const ENV_PATH = path.join(ROOT_DIR, ".env.import");
const REVIEW_PATH = path.join(__dirname, "scraper", "pdf-feature-review.json");
const DONE_PATH = path.join(__dirname, "scraper", "pdf-feature-review-done.json");

dotenv.config({ path: ENV_PATH, override: true });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const WRITE_TO_SUPABASE = process.env.PDF_FEATURE_WRITE === "1";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  throw new Error("Missing env vars. Need SUPABASE_URL and SUPABASE_SERVICE_ROLE in .env.import");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

async function loadReviewResults() {
  const raw = await fs.readFile(REVIEW_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("pdf-feature-review.json must be an array");
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

function getApprovedRows(rows) {
  return rows.filter((row) => row.pdf_review_status === "approved");
}

async function loadDoneRows() {
  try {
    const raw = await fs.readFile(DONE_PATH, "utf8");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeJson(filePath, rows) {
  await fs.writeFile(filePath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

async function compactReviewFile(reviewResults, approvedRows) {
  const importedAt = new Date().toISOString();
  const approvedIds = new Set(approvedRows.map((row) => String(row.product_id)));
  const remainingRows = reviewResults.filter((row) => !approvedIds.has(String(row.product_id)));
  const doneRows = await loadDoneRows();
  const doneKeys = new Set(doneRows.map((row) => String(row.product_id)));
  const newDoneRows = approvedRows
    .filter((row) => !doneKeys.has(String(row.product_id)))
    .map((row) => ({
      product_id: row.product_id,
      sku: row.sku ?? null,
      extracted_features_count: normalizeFeatures(row.extracted_features).length,
      pdf_review_status: "approved",
      pdf_reviewed_at: row.pdf_reviewed_at ?? null,
      pdf_imported_at: importedAt,
    }));

  await writeJson(REVIEW_PATH, remainingRows);
  await writeJson(DONE_PATH, [...doneRows, ...newDoneRows]);

  return {
    activeRows: remainingRows.length,
    doneRows: doneRows.length + newDoneRows.length,
  };
}

async function updateProductFeatures(row) {
  const features = normalizeFeatures(row.extracted_features);

  if (!row.product_id) {
    throw new Error(`Missing product_id for SKU ${row.sku ?? "unknown"}`);
  }

  if (features.length === 0 && row.allow_no_features !== true) {
    throw new Error(`Refusing to write empty feature list for SKU ${row.sku ?? "unknown"}`);
  }

  const { error } = await supabase
    .from("products")
    .update({
      scraped_features: features,
      scraped_at: new Date().toISOString(),
    })
    .eq("id", row.product_id);

  if (error) {
    throw error;
  }
}

async function main() {
  const reviewResults = await loadReviewResults();
  const approvedRows = getApprovedRows(reviewResults);
  const rejectedCount = reviewResults.filter((row) => row.pdf_review_status === "rejected").length;
  const pendingCount = reviewResults.filter((row) => row.pdf_review_status !== "approved" && row.pdf_review_status !== "rejected").length;

  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Approved rows: ${approvedRows.length}`);
  console.log(`Rejected rows: ${rejectedCount}`);
  console.log(`Pending rows: ${pendingCount}`);

  if (!WRITE_TO_SUPABASE) {
    console.log("Dry run only. Set PDF_FEATURE_WRITE=1 to update Supabase.");

    for (const row of approvedRows) {
      console.log(
        `[DRY RUN] ${row.sku ?? row.product_id}: ${normalizeFeatures(row.extracted_features).length} features`,
      );
    }

    return;
  }

  let updated = 0;

  for (const row of approvedRows) {
    await updateProductFeatures(row);
    updated += 1;
    console.log(`Updated ${row.sku ?? row.product_id}`);
  }

  const compacted = await compactReviewFile(reviewResults, approvedRows);

  console.log(`Imported approved PDF features for ${updated} products.`);
  console.log(`Active review rows remaining: ${compacted.activeRows}`);
  console.log(`Done ledger rows: ${compacted.doneRows}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
