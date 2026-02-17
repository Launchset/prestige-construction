import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.import" });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const SUPPLIER_ID = process.env.SUPPLIER_ID!;
const BUCKET = process.env.BUCKET || "products";
const IMPORT_ROOT = process.env.IMPORT_ROOT || "imports";
const THROTTLE_MS = Number(process.env.THROTTLE_MS || "120");

if (!SUPABASE_URL || !SERVICE_ROLE || !SUPPLIER_ID) {
  throw new Error("Missing env vars. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE, SUPPLIER_ID in .env.import");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// Product folder naming like CIB600, ABC123, etc.
const PRODUCT_CODE_RE = /^[A-Z]{2,}[A-Z0-9_-]*\d+[A-Z0-9_-]*$/;

const ASSET_FOLDERS = [
  "info",
  "spec",
  "specs",
  "data",
  "drawing",
  "drawings",
  "dimension",
  "dimensions",
  "diagram",
  "diagrams",
  "image",
  "images",
  "product images",
  "professional images",
  "production images",
];

type FileInfo = {
  absPath: string;
  relToProduct: string; // relative path inside the product folder
  ext: string;
  base: string;
  parentFolderLower: string;
};

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function isDirectory(p: string) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function walkDirs(root: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop()!;
    out.push(cur);
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) stack.push(path.join(cur, e.name));
    }
  }
  return out;
}

function walkFiles(root: string): string[] {
  const out: string[] = [];
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop()!;
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else out.push(p);
    }
  }
  return out;
}

function contentTypeFor(ext: string): string {
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function slugFromCode(code: string): string {
  // CIB600 -> cib600
  return code.trim().toLowerCase();
}

function looksLikeProductDir(dirPath: string): boolean {
  const base = path.basename(dirPath);
  if (!PRODUCT_CODE_RE.test(base)) return false;

  // must contain at least one PDF somewhere inside
  const files = walkFiles(dirPath);
  if (!files.some((f) => f.toLowerCase().endsWith(".pdf"))) return false;

  // optional heuristic: contains known asset folders
  const childDirs = fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name.toLowerCase());

  const hasAssetFolder = childDirs.some((d) => ASSET_FOLDERS.includes(d));
  return hasAssetFolder || true; // product code + pdf is already strong enough
}

function classifyAssetType(file: FileInfo): "image" | "drawing" | "production" | "professional" | "document" {
  const nameLower = file.base.toLowerCase();
  const parent = file.parentFolderLower;

  if (file.ext === ".pdf") {
    if (parent.includes("drawing") || parent.includes("dimension") || nameLower.includes("drawing") || nameLower.includes("dimension") || nameLower.includes("diagram")) {
      return "drawing";
    }
    return "document";
  }

  // Images
  if (parent.includes("production") || nameLower.includes("production")) return "production";
  if (parent.includes("professional") || nameLower.includes("professional")) return "professional";
  if (parent.includes("drawing") || parent.includes("dimension") || nameLower.includes("drawing") || nameLower.includes("dimension")) return "drawing";
  return "image";
}

function pickSpecPdf(files: FileInfo[]): FileInfo | null {
  const pdfs = files.filter((f) => f.ext === ".pdf");
  if (!pdfs.length) return null;

  // Prefer PDFs in "info/spec" folders or filenames containing "spec"
  const preferred = pdfs.find((p) =>
    p.parentFolderLower.includes("info") ||
    p.parentFolderLower.includes("spec") ||
    p.base.toLowerCase().includes("spec") ||
    p.base.toLowerCase().includes("data")
  );
  return preferred || pdfs[0];
}

function buildProductPathMeta(productDir: string): { category: string | null; subcategory: string | null; range: string | null } {
  const rel = path.relative(IMPORT_ROOT, productDir);
  const parts = rel.split(path.sep).filter(Boolean);

  // parts like: ["Sinks","Ceramics","InsetButler","CIB600"]
  const category = parts[0] ?? null;
  const subcategory = parts[1] ?? null;

  // range could be multiple levels between subcategory and product code
  const rangeParts = parts.slice(2, -1);
  const range = rangeParts.length ? rangeParts.join(" / ") : null;

  return { category, subcategory, range };
}

async function uploadToStorage(slug: string, relToProduct: string, absPath: string): Promise<string> {
  const ext = path.extname(absPath).toLowerCase();
  const contentType = contentTypeFor(ext);

  // store with original relative folder structure under the product
  const storagePath = `${slug}/${relToProduct}`.replaceAll("\\", "/");

  const buffer = fs.readFileSync(absPath);

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Storage upload failed for ${storagePath}: ${error.message}`);
  }

  // public URL format (bucket should be public)
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

async function productExists(slug: string): Promise<boolean> {
  const { data, error } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return !!data?.id;
}

async function getProductId(slug: string): Promise<string | null> {
  const { data, error } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function upsertProduct(args: {
  name: string;
  slug: string;
  category: string | null;
  subcategory: string | null;
  range: string | null;
  spec_pdf_url: string | null;
}): Promise<{ id: string }> {
  // Use upsert on slug so reruns are safe
  const { data, error } = await supabase
    .from("products")
    .upsert(
      {
        supplier_id: SUPPLIER_ID,
        name: args.name,
        slug: args.slug,
        category: args.category,
        subcategory: args.subcategory,
        range: args.range,
        spec_pdf_url: args.spec_pdf_url,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (error) throw error;
  return data as { id: string };
}

async function insertAsset(productId: string, url: string, type: string) {
  const { error } = await supabase.from("product_assets").insert({
    product_id: productId,
    file_url: url,
    type,
  });
  if (error) throw error;
}

async function processProductDir(productDir: string, index: number, total: number) {
  const code = path.basename(productDir);
  const slug = slugFromCode(code);
  const name = code;

  const { category, subcategory, range } = buildProductPathMeta(productDir);

  console.log(`\n[${index}/${total}] Processing ${code}  (cat=${category} sub=${subcategory} range=${range})`);

  // collect files inside product folder (recursive)
  const filePaths = walkFiles(productDir);

  const files: FileInfo[] = filePaths
    .map((absPath) => {
      const relToProduct = path.relative(productDir, absPath);
      const ext = path.extname(absPath).toLowerCase();
      const base = path.basename(absPath);
      const parentFolderLower = path.basename(path.dirname(absPath)).toLowerCase();
      return { absPath, relToProduct, ext, base, parentFolderLower };
    })
    // only handle common types, skip junk
    .filter((f) => [".pdf", ".jpg", ".jpeg", ".png", ".webp"].includes(f.ext));

  if (!files.length) {
    console.log(`  - No importable files found, skipping.`);
    return;
  }

  const specPdf = pickSpecPdf(files);

  // Upload spec first (so we can store url on product)
  let specUrl: string | null = null;
  if (specPdf) {
    console.log(`  - Uploading spec PDF: ${specPdf.relToProduct}`);
    specUrl = await uploadToStorage(slug, specPdf.relToProduct, specPdf.absPath);
    await sleep(THROTTLE_MS);
  } else {
    console.log(`  - No spec PDF detected (unexpected per your data).`);
  }

  // Upsert product row
  const product = await upsertProduct({
    name,
    slug,
    category,
    subcategory,
    range,
    spec_pdf_url: specUrl,
  });

  // Upload the rest as assets (including extra PDFs)
  for (const f of files) {
    // skip the chosen spec pdf (already stored on products row)
    if (specPdf && f.absPath === specPdf.absPath) continue;

    const type = classifyAssetType(f);
    console.log(`  - Uploading asset (${type}): ${f.relToProduct}`);

    const url = await uploadToStorage(slug, f.relToProduct, f.absPath);
    await insertAsset(product.id, url, type);

    await sleep(THROTTLE_MS);
  }

  console.log(`  ✅ Done: ${code} (slug=${slug})`);
}

async function main() {
  const rootAbs = path.resolve(IMPORT_ROOT);
  if (!isDirectory(rootAbs)) {
    throw new Error(`IMPORT_ROOT folder not found: ${rootAbs}`);
  }

  console.log(`Scanning for product folders in: ${rootAbs}`);

  const allDirs = walkDirs(rootAbs);

  // detect product dirs
  const productDirs = allDirs.filter(looksLikeProductDir);

  // Sort for stable runs
  productDirs.sort((a, b) => a.localeCompare(b));

  console.log(`Found ${productDirs.length} product folders (code-like + contains pdf).`);

  let i = 0;
  for (const dir of productDirs) {
    i += 1;

    // optional: skip if already exists
    const slug = slugFromCode(path.basename(dir));
    const exists = await productExists(slug);
    if (exists) {
      console.log(`\n[${i}/${productDirs.length}] Skipping ${path.basename(dir)} (already in DB)`);
      continue;
    }

    await processProductDir(dir, i, productDirs.length);
  }

  console.log(`\n✅ Import finished.`);
}

main().catch((err) => {
  console.error("\n❌ Import failed:");
  console.error(err);
  process.exit(1);
});
