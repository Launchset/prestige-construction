import { config } from "dotenv";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

config({ path: ".env.import" });

// quick env check
console.log("R2 key loaded:", !!process.env.R2_ACCESS_KEY_ID);
console.log("Supabase URL loaded:", !!process.env.SUPABASE_URL);

// ---------- R2 CLIENT ----------
const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.R2_BUCKET;


// ---------- SUPABASE CLIENT ----------
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE,
    { auth: { persistSession: false } }
);

async function listAllR2Keys() {
    let continuationToken = undefined;
    const allKeys = [];

    while (true) {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET,
            MaxKeys: 1000,
            ContinuationToken: continuationToken
        });

        const response = await r2.send(command);

        const keys = (response.Contents || []).map(item => item.Key);
        allKeys.push(...keys);

        console.log(`Fetched ${allKeys.length} keys so far...`);

        if (!response.IsTruncated) {
            break;
        }

        continuationToken = response.NextContinuationToken;
    }

    console.log("Total keys fetched:", allKeys.length);

    return allKeys;
}

import readline from "readline";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


function normaliseParsed(p) {
    const product = p.product.trim().toUpperCase();

    const categories = (p.categories || [])
        .map(s => s.trim())
        .filter(Boolean)
        .filter(c => c.toUpperCase() !== product)
        .filter((c, i, arr) =>
            i === 0 || c.toLowerCase() !== arr[i - 1].toLowerCase()
        );

    const mediaType = p.mediaType || null;

    return { ...p, product, categories, mediaType };
}

function buildCanonicalPath({ product, mediaType, fileName }) {
    const safeProduct = product.trim().toUpperCase();
    const safeFile = fileName.trim();

    // Your clean internal hierarchy:
    // CD345/media/image.jpg  OR  CD345/image.jpg
    if (mediaType) return `${safeProduct}/${mediaType}/${safeFile}`;
    return `${safeProduct}/${safeFile}`;
}


async function main() {
    const keys = await listAllR2Keys();

    if (!keys.length) {
        console.log("No keys found.");
        return;
    }

    let processed = 0;
    let i = 0;
    let retryCount = 0;

    while (i < keys.length) {
        const key = keys[i];

        const parsed = parsePath(key);
        if (!parsed) {
            i++;
            continue;
        }

        const canonical = normaliseParsed(parsed);
        const canonicalPath = buildCanonicalPath(canonical);

        try {
            const categoryId = await getOrCreateCategoryChain(canonical.categories);

            const productId = await upsertProduct({
                productName: canonical.product,
                categoryId
            });

            await upsertProductImage({
                productId,
                filePath: canonicalPath,
                mediaType: canonical.mediaType,
                sourcePath: canonical.filePath
            });

            processed++;
            if (processed % 100 === 0) {
                console.log(`Processed ${processed} files...`);
            }

            retryCount = 0; // reset retry counter on success
            i++; // move forward normally

        } catch (err) {
            console.error("Error processing:", key);
            console.error(err);

            const isNetworkError =
                err?.message?.includes("fetch failed") ||
                err?.message?.includes("ECONNRESET");

            if (isNetworkError) {
                retryCount++;

                if (retryCount > 5) {
                    console.log("Too many retries. Skipping forward.");
                    retryCount = 0;
                    i++;
                    continue;
                }

                console.log("⚠️ Network error detected. Rewinding 20 files...");
                i = Math.max(0, i - 20);

                await new Promise(r => setTimeout(r, 2000));
            } else {
                // non-network error → skip forward
                i++;
            }
        }
    }

    console.log("Ingestion complete.");
}

main().catch((err) => {
    console.error("Fatal error:", err);
});

const CATEGORY_REVIEW_LOG = "category_rejections.json";

function logCategoryRejection(name, slug, parentId) {
    const entry = {
        name,
        slug,
        parentId,
        timestamp: new Date().toISOString()
    };

    let existing = [];

    if (fs.existsSync(CATEGORY_REVIEW_LOG)) {
        try {
            existing = JSON.parse(fs.readFileSync(CATEGORY_REVIEW_LOG, "utf8"));
        } catch (err) {
            console.error("Failed to parse category_rejections.json. Resetting file.");
            existing = [];
        }
    }

    existing.push(entry);

    fs.writeFileSync(
        CATEGORY_REVIEW_LOG,
        JSON.stringify(existing, null, 2)
    );
}


const FAIL_LOG = "parse_failures.json";

function logFailure(filePath, reason) {
    const failure = {
        file: filePath,
        reason,
        timestamp: new Date().toISOString()
    };

    const existing = fs.existsSync(FAIL_LOG)
        ? JSON.parse(fs.readFileSync(FAIL_LOG, "utf8"))
        : [];

    existing.push(failure);

    fs.writeFileSync(FAIL_LOG, JSON.stringify(existing, null, 2));
}


function normalizeFolderName(name) {
    return name
        .trim()
        .toLowerCase()
        .replace(/[-_]/g, " ")
        .replace(/\s+/g, " ")
        .replace(/[^a-z0-9 ]/g, "");
}

function levenshtein(a, b) {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// Normalized key -> canonical label to store in DB
const MEDIA_FOLDERS = {
    "product shot": "Product Shot",
    "products shots": "Product Shot",
    "product": "Product Shot",
    "product images": "Product Shot",
    "product image": "Product Shot",

    "lifestyle": "Lifestyle",
    "lifestyle shot": "Lifestyle",
    "lifestyle shots": "Lifestyle",
    "lifestyle images": "Lifestyle",

    "spec sheet": "Spec Sheet",
    "spec sheets": "Spec Sheet",
    "spec": "Spec Sheet",

    "technical drawing": "Technical Drawing",
    "technical drawings": "Technical Drawing"
};


function detectMediaFolder(folderName) {
    const normalized = normalizeFolderName(folderName);

    // Exact match
    if (MEDIA_FOLDERS[normalized]) return MEDIA_FOLDERS[normalized];

    // 1-character typo tolerance
    for (const key of Object.keys(MEDIA_FOLDERS)) {
        if (levenshtein(normalized, key) <= 1) {
            return MEDIA_FOLDERS[key];
        }
    }

    return null;
}


function looksLikeSKU(name) {
    const s = name.trim();

    // Remove allowed separators before checking rules
    const cleaned = s.replace(/[-_\s]/g, "");

    // Must be alphanumeric after removing separators
    if (!/^[a-z0-9]+$/i.test(cleaned)) return false;

    const hasLetter = /[a-z]/i.test(cleaned);
    const hasNumber = /\d/.test(cleaned);
    const isAllCaps = /^[A-Z]+$/.test(cleaned);

    // Rules:
    // 1) letters + numbers (e.g. Di632, CGi920RED)
    // OR
    // 2) all caps letters only (e.g. BUCH)
    return (hasLetter && hasNumber) || isAllCaps;
}



function parsePath(path) {
    // 🔒 Skip folder placeholders from R2
    if (path.endsWith("/")) return null;

    const cleaned = path.replace(/^•/, "");

    // Clean split: trims and removes empty segments (prevents // issues)
    let segments = cleaned
        .split("/")
        .map(s => s.trim())
        .filter(Boolean);

    // 🔍 If path contains Product Shot/WEB or Lifestyle/WEB → skip file
    for (let i = 0; i < segments.length - 1; i++) {
        const current = segments[i].toLowerCase();
        const next = segments[i + 1]?.toLowerCase();

        const isMedia =
            current === "product shot" ||
            current === "lifestyle";

        if (isMedia && next === "web") {
            return null; // 🚫 skip smaller web version
        }
    }

    const fileName = segments.pop();

    if (!fileName) {
        logFailure(cleaned, "Missing file name");
        return null;
    }

    if (segments.length === 0) {
        logFailure(cleaned, "No folder structure above file");
        return null;
    }

    // -------------------------
    // 1) Peel off trailing media folders
    // -------------------------
    let mediaType = null;

    while (segments.length > 0) {
        const maybeMedia = detectMediaFolder(segments[segments.length - 1]);
        if (!maybeMedia) break;

        // IMPORTANT: this matches your old behavior:
        // if multiple media folders exist, the higher-level one wins (closest to product)
        mediaType = maybeMedia;
        segments.pop();
    }

    const detectedMedia = mediaType;

    if (segments.length === 0) {
        logFailure(cleaned, "No product folder found after removing media folders");
        return null;
    }

    // -------------------------
    // 2) Decide product + categories
    // -------------------------
    let product = null;
    let categories = [];

    const potentialProduct = segments[segments.length - 1];

    if (detectedMedia) {
        // We expect: categories/.../product/(media...)/file

        if (looksLikeSKU(potentialProduct)) {
            // Normal case: product is the folder right above media
            product = segments.pop();
            categories = segments;
        } else {
            // Your fallback: if filename contains the product folder name (case-insensitive), accept it
            const normalizedFolder = potentialProduct.trim().toLowerCase();
            const normalizedFile = fileName.trim().toLowerCase();

            if (normalizedFile.includes(normalizedFolder)) {
                product = segments.pop();
                categories = segments;
            } else {
                logFailure(
                    cleaned,
                    `Expected SKU product folder above media folder, got: "${potentialProduct}"`
                );
                return null;
            }
        }
    } else {
        // No media detected: either categories/.../SKU/file OR flat Category/FILENAME contains SKU

        if (looksLikeSKU(potentialProduct)) {
            // Normal: categories/.../SKU/file
            product = segments.pop();
            categories = segments;
        } else {
            // Flat: Category/FILENAME contains SKU (and maybe media)
            const parts = fileName.match(/[A-Za-z0-9-]+/g) || [];

            // Keep your intent: prefer the FIRST token if it qualifies,
            // otherwise fall back to any token that qualifies.
            let filenameSku = null;
            if (parts.length > 0 && looksLikeSKU(parts[0])) {
                filenameSku = parts[0];
            } else {
                filenameSku = parts.find(p => looksLikeSKU(p)) || null;
            }

            if (filenameSku) {
                product = filenameSku;
                categories = segments; // flat: folder(s) are categories

                // Optional: detect media from filename (Spec Sheet etc.)
                const filenameNormalized = normalizeFolderName(fileName);
                let filenameMedia = null;

                for (const key of Object.keys(MEDIA_FOLDERS)) {
                    if (filenameNormalized.includes(key)) {
                        filenameMedia = MEDIA_FOLDERS[key];
                        break;
                    }
                }

                mediaType = filenameMedia || null;
            } else {
                logFailure(cleaned, `Expected SKU in folder or filename, got folder: "${potentialProduct}"`);
                return null;
            }
        }
    }

    return {
        categories,
        product,
        mediaType,
        fileName,
        filePath: cleaned
    };
}

async function getOrCreateCategoryChain(categoryNames) {
    let parentId = null;
    let slugParts = [];

    for (const rawName of categoryNames) {
        const name = rawName.trim();
        if (!name) continue;

        // build hierarchical slug
        slugParts.push(name);

        const slug = slugParts
            .join("-")
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

        // check if category exists by slug
        const { data: existing, error: selectError } = await supabase
            .from("categories")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();

        if (selectError) throw selectError;

        if (existing) {
            parentId = existing.id;
            continue;
        }

        // 🛑 APPROVAL GATE

        // insert if not exists
        const { data: inserted, error: insertError } = await supabase
            .from("categories")
            .insert([
                {
                    name,
                    slug,
                    parent_id: parentId
                }
            ])
            .select("id")
            .single();

        if (insertError) throw insertError;

        parentId = inserted.id;
    }

    return parentId;
}

async function upsertProduct({ productName, categoryId }) {
    const sku = productName.trim();

    const productSlug = sku
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    const { data: existing, error: selectError } = await supabase
        .from("products")
        .select("id, category_id, slug, name")
        .eq("sku", sku)
        .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
        const needsUpdate =
            existing.category_id !== categoryId ||
            existing.slug !== productSlug ||
            existing.name !== sku;

        if (needsUpdate) {
            const { error: updateError } = await supabase
                .from("products")
                .update({ category_id: categoryId, slug: productSlug, name: sku })
                .eq("id", existing.id);

            if (updateError) throw updateError;
        }

        return existing.id;
    }

    const { data: inserted, error: insertError } = await supabase
        .from("products")
        .insert([{ name: sku, slug: productSlug, sku, category_id: categoryId }])
        .select("id")
        .single();

    if (insertError) throw insertError;

    return inserted.id;
}

async function upsertProductImage({
    productId,
    filePath,     // this will be your CANONICAL path
    mediaType,
    sourcePath    // this will be the ORIGINAL supplier path
}) {
    // Check if image already exists (by canonical path)
    const { data: existing, error: selectError } = await supabase
        .from("product_images")
        .select("id, source_path")
        .eq("product_id", productId)
        .eq("file_path", filePath)
        .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
        // Optional: backfill source_path if missing or different
        if (sourcePath && existing.source_path !== sourcePath) {
            const { error: updateError } = await supabase
                .from("product_images")
                .update({ source_path: sourcePath, media_type: mediaType })
                .eq("id", existing.id);

            if (updateError) throw updateError;
        }

        return existing.id;
    }

    // Insert new image
    const { data: inserted, error: insertError } = await supabase
        .from("product_images")
        .insert([
            {
                product_id: productId,
                file_path: filePath,
                media_type: mediaType,
                source_path: sourcePath
            }
        ])
        .select("id")
        .single();

    if (insertError) throw insertError;

    return inserted.id;
}