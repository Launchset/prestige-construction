import { config } from "dotenv";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRAPE_REVIEW_PATH = path.join(__dirname, "scraper", "scrape-review.json");
const OUTPUT_PATH = path.join(__dirname, "scraper", "pdf-feature-review.json");

config({ path: ".env.import" });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const PDF_LIMIT = Number.parseInt(process.env.PDF_FEATURE_LIMIT ?? "0", 10);
const WRITE_TO_SUPABASE = process.env.PDF_FEATURE_WRITE === "1";
const SKU_FILTER = (process.env.PDF_FEATURE_SKU ?? "")
  .split(",")
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean);

if (
  !SUPABASE_URL ||
  !SUPABASE_SERVICE_ROLE ||
  !R2_ACCOUNT_ID ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !R2_BUCKET
) {
  throw new Error(
    "Missing env vars. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET in .env.import",
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function splitLines(text) {
  return text
    .split(/\r?\n/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean);
}

function cleanFeatureLine(line) {
  return normalizeWhitespace(
    line
      .replace(/^[•\-\u2022\u25AA\u25CF*\s]+/, "")
      .replace(/\s*[;:,.-]\s*$/, ""),
  );
}

function isBadTitleCandidate(line) {
  return /^(dimensions|features|performance|programmes|functions|installation|product code|finish available)$/i.test(
    line,
  );
}

function looksSpacedOutCaps(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 3) return false;
  const shortUpperParts = parts.filter((part) => /^[A-Z]{1,3}$/.test(part));
  return shortUpperParts.length / parts.length >= 0.6;
}

function isLikelyHeading(line) {
  return /^[A-Z][A-Za-z0-9/&,+()' -]{1,60}$/.test(line);
}

function isLikelySectionHeading(line) {
  return /^(specification|specifications|technical specification|dimensions|energy|performance|installation|notes?|guarantee|warranty|model|code|sku)$/i.test(
    line,
  );
}

function looksLikeFeature(line) {
  if (!line) return false;
  if (line.length < 4 || line.length > 160) return false;
  if (/^(page \d+|www\.|https?:\/\/)/i.test(line)) return false;
  if (/^[A-Z0-9-]{3,}$/.test(line)) return false;
  if (/^[\d.]+\s*(mm|cm|kg|kw|db|v|hz|l|litre|litres)\b/i.test(line)) return false;
  return true;
}

function isFeatureSectionHeading(line) {
  return /^(key )?features|product features|benefits$/i.test(line);
}

function isFeatureStopHeading(line) {
  return /^(accessories|optional extras|installation|performance|dimensions|finish available|product code|functions|programmes|specification|specifications|technical specification|notes?|warranty|guarantee)$/i.test(
    line,
  );
}

function dedupe(values) {
  const seen = new Set();
  const out = [];

  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }

  return out;
}

function extractName(lines, fallbackName, sku, existingScrapedName) {
  const skuUpper = (sku ?? "").trim().toUpperCase();

  for (const line of lines.slice(0, 40)) {
    if (!line) continue;
    if (skuUpper && normalizeWhitespace(line).toUpperCase() === skuUpper) continue;
    if (line.length < 8 || line.length > 120) continue;
    if (
      /^(features|key features|benefits|specification|specifications)$/i.test(line) ||
      isBadTitleCandidate(line)
    ) {
      continue;
    }
    if (!isLikelyHeading(line)) continue;
    return line;
  }

  return fallbackName;
}

function extractFeatures(lines) {
  const startIndex = lines.findIndex((line) => isFeatureSectionHeading(cleanFeatureLine(line)));

  if (startIndex === -1) {
    return [];
  }

  const features = [];
  let currentFeature = "";

  for (const rawLine of lines.slice(startIndex + 1)) {
    const trimmedRaw = rawLine.trim();
    const line = cleanFeatureLine(rawLine);
    const isBullet = /^[•\-\u2022\u25AA\u25CF*]/.test(trimmedRaw);

    if (isFeatureStopHeading(line)) {
      break;
    }

    if (!line) {
      continue;
    }

    if (isBullet) {
      if (currentFeature) {
        const cleaned = normalizeWhitespace(currentFeature);
        if (looksLikeFeature(cleaned)) {
          features.push(cleaned);
        }
      }
      currentFeature = line;
      continue;
    }

    if (!currentFeature) {
      if (isLikelySectionHeading(line)) {
        continue;
      }
      currentFeature = line;
      continue;
    }

    currentFeature = normalizeWhitespace(`${currentFeature} ${line}`);
  }

  if (currentFeature) {
    const cleaned = normalizeWhitespace(currentFeature);
    if (looksLikeFeature(cleaned)) {
      features.push(cleaned);
    }
  }

  return dedupe(features);
}

async function streamToBuffer(stream) {
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

async function loadScrapeReviewSet() {
  const raw = await fs.readFile(SCRAPE_REVIEW_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("scrape-review.json must be an array");
  }

  const ids = new Set();
  const skus = new Set();

  for (const row of parsed) {
    if (row?.product_id) ids.add(String(row.product_id));
    if (row?.sku) skus.add(String(row.sku).trim().toUpperCase());
  }

  return { ids, skus, rows: parsed };
}

async function fetchReviewedProducts(scrapeReviewSet) {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      sku,
      name,
      product_images!inner(sort_order)
    `)
    .gt("product_images.sort_order", 0);

  if (error) {
    throw error;
  }

  const uniqueProducts = new Map();

  for (const product of data ?? []) {
    if (!uniqueProducts.has(product.id)) {
      uniqueProducts.set(product.id, {
        id: product.id,
        sku: product.sku,
        name: product.name,
      });
    }
  }

  let products = [...uniqueProducts.values()];
  const allowedIds = scrapeReviewSet.ids;
  const allowedSkus = scrapeReviewSet.skus;

  products = products.filter((product) =>
    allowedIds.has(String(product.id)) ||
    allowedSkus.has(String(product.sku ?? "").trim().toUpperCase()),
  );

  if (SKU_FILTER.length > 0) {
    const allowed = new Set(SKU_FILTER);
    products = products.filter((product) =>
      allowed.has(String(product.sku ?? "").trim().toUpperCase()),
    );
  }

  if (Number.isFinite(PDF_LIMIT) && PDF_LIMIT > 0) {
    products = products.slice(0, PDF_LIMIT);
  }

  return products;
}

async function fetchSpecSheet(productId) {
  const { data, error } = await supabase
    .from("product_images")
    .select("id, file_path, source_path, media_type")
    .eq("product_id", productId)
    .eq("media_type", "Spec Sheet")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function buildCandidateKeys(specSheet) {
  const candidates = [];
  const rawSource = String(specSheet?.source_path ?? "").trim();
  const rawFile = String(specSheet?.file_path ?? "").trim();

  for (const key of [
    rawFile,
    rawSource,
    rawSource ? `•${rawSource.replace(/^•/, "")}` : "",
    rawFile ? `•${rawFile.replace(/^•/, "")}` : "",
  ]) {
    if (!key) continue;
    if (!candidates.includes(key)) {
      candidates.push(key);
    }
  }

  return candidates;
}

async function fetchPdfBuffer(specSheet) {
  const candidateKeys = buildCandidateKeys(specSheet);
  let lastError = null;

  for (const key of candidateKeys) {
    try {
      const response = await r2.send(
        new GetObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
        }),
      );

      if (!response.Body) {
        throw new Error(`R2 returned no body for ${key}`);
      }

      const buffer = await streamToBuffer(response.Body);
      return { buffer, resolvedKey: key };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Unable to resolve PDF key from candidates: ${candidateKeys.join(" | ")}. Last error: ${lastError?.message ?? "unknown"}`,
  );
}

async function parsePdf(buffer) {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

async function updateProduct(productId, payload) {
  const { error } = await supabase
    .from("products")
    .update({
      scraped_name: payload.scraped_name,
      scraped_features: payload.scraped_features,
      scraped_status: payload.scraped_status,
      scraped_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) {
    throw error;
  }
}

async function processProduct(product, index, total) {
  console.log(`\n[${index}/${total}] ${product.sku} (${product.id})`);
  const existingScrapedName = product.scrapeReview?.scraped_name ?? null;
  const existingScrapedFeatures = Array.isArray(product.scrapeReview?.scraped_features)
    ? product.scrapeReview.scraped_features
    : [];

  const specSheet = await fetchSpecSheet(product.id);

  if (!specSheet?.file_path) {
    console.log("  No spec sheet found, skipping.");
    return {
      status: "skipped_no_spec",
      product_id: product.id,
      sku: product.sku,
      product_name: product.name,
    };
  }

  console.log(`  Spec sheet row: ${specSheet.file_path}`);

  const { buffer, resolvedKey } = await fetchPdfBuffer(specSheet);
  const text = await parsePdf(buffer);
  const lines = splitLines(text);

  const pdfTitleCandidate = extractName(
    lines,
    product.name,
    product.sku,
    existingScrapedName,
  );
  const scrapedName = looksSpacedOutCaps(pdfTitleCandidate) && existingScrapedName
    ? existingScrapedName
    : pdfTitleCandidate;
  const scrapedFeatures = extractFeatures(lines);
  const output = {
    status: "ready_for_review",
    product_id: product.id,
    sku: product.sku,
    product_name: product.name,
    existing_scraped_name: existingScrapedName,
    existing_scraped_features: existingScrapedFeatures,
    existing_scraped_features_count: existingScrapedFeatures.length,
    pdf_title_candidate: pdfTitleCandidate,
    spec_sheet_file_path: specSheet.file_path,
    spec_sheet_source_path: specSheet.source_path,
    resolved_r2_key: resolvedKey,
    extracted_name: scrapedName,
    extracted_features: scrapedFeatures,
    extracted_features_count: scrapedFeatures.length,
  };

  console.log(`  Name: ${scrapedName}`);
  console.log(`  Features found: ${scrapedFeatures.length}`);
  console.log(`  R2 key: ${resolvedKey}`);

  if (scrapedFeatures.length > 0) {
    console.log(`  Preview: ${scrapedFeatures.slice(0, 3).join(" | ")}`);
  }

  if (!WRITE_TO_SUPABASE) {
    console.log("  JSON review mode, not updating Supabase.");
    return output;
  }

  await updateProduct(product.id, {
    scraped_name: scrapedName,
    scraped_features: scrapedFeatures,
    scraped_status: scrapedFeatures.length > 0 ? "success" : "partial_success",
  });

  return {
    ...output,
    status: "updated",
  };
}

async function main() {
  const scrapeReviewSet = await loadScrapeReviewSet();
  const products = await fetchReviewedProducts(scrapeReviewSet);
  const scrapeReviewByProductId = new Map(
    scrapeReviewSet.rows
      .filter((row) => row?.product_id)
      .map((row) => [String(row.product_id), row]),
  );

  console.log(
    `Found ${products.length} reviewed products that also exist in scrape-review.json.`,
  );

  const results = [];
  let skipped = 0;

  for (let index = 0; index < products.length; index += 1) {
    const result = await processProduct(
      {
        ...products[index],
        scrapeReview: scrapeReviewByProductId.get(String(products[index].id)) ?? null,
      },
      index + 1,
      products.length,
    );
    results.push(result);

    if (result.status === "updated") {
      continue;
    } else {
      skipped += 1;
    }
  }

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(results, null, 2)}\n`, "utf8");
  console.log(`\nWrote ${results.length} results to ${OUTPUT_PATH}.`);
  console.log(`Skipped ${skipped} products.`);
  console.log(
    WRITE_TO_SUPABASE
      ? "Supabase updates were enabled."
      : "Supabase updates were not performed.",
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
