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

const INGEST_CONCURRENCY = Math.max(1, Number.parseInt(process.env.INGEST_CONCURRENCY || "8", 10));
const RETRY_LIMIT = Math.max(0, Number.parseInt(process.env.INGEST_RETRY_LIMIT || "5", 10));
const LOG_FLUSH_INTERVAL = Math.max(1, Number.parseInt(process.env.INGEST_LOG_FLUSH_INTERVAL || "100", 10));

const categoryCache = new Map();
const productCache = new Map();
const productImageCache = new Map();

const categoryInFlight = new Map();
const productInFlight = new Map();
const productImageInFlight = new Map();

const categoryReviewLogBuffer = [];
const parseFailureLogBuffer = [];

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

function readJsonArray(filePath) {
    if (!fs.existsSync(filePath)) {
        return [];
    }

    try {
        const raw = fs.readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error(`Failed to parse ${filePath}. Resetting file.`);
        return [];
    }
}

function flushBufferedLog(filePath, buffer) {
    if (buffer.length === 0) {
        return;
    }

    const existing = readJsonArray(filePath);
    existing.push(...buffer.splice(0, buffer.length));
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
}

function flushLogs() {
    flushBufferedLog(CATEGORY_REVIEW_LOG, categoryReviewLogBuffer);
    flushBufferedLog(FAIL_LOG, parseFailureLogBuffer);
}

function queueBufferedLog(filePath, buffer, entry) {
    buffer.push(entry);

    if (buffer.length >= LOG_FLUSH_INTERVAL) {
        flushBufferedLog(filePath, buffer);
    }
}

process.on("exit", flushLogs);
process.on("SIGINT", () => {
    flushLogs();
    process.exit(130);
});
process.on("SIGTERM", () => {
    flushLogs();
    process.exit(143);
});

async function fetchAllRows(table, columns) {
    const rows = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
        const to = from + pageSize - 1;
        const { data, error } = await supabase
            .from(table)
            .select(columns)
            .range(from, to);

        if (error) throw error;
        if (!data?.length) break;

        rows.push(...data);

        if (data.length < pageSize) break;
        from += pageSize;
    }

    return rows;
}

async function preloadCaches() {
    console.log("Preloading categories and products...");

    const [categories, products] = await Promise.all([
        fetchAllRows("categories", "id, slug"),
        fetchAllRows("products", "id, sku, category_id, slug, name")
    ]);

    for (const category of categories) {
        categoryCache.set(category.slug, category.id);
    }

    for (const product of products) {
        productCache.set(product.sku, product);
    }

    console.log(`Preloaded ${categories.length} categories and ${products.length} products.`);
}

function withInFlight(map, key, factory) {
    if (map.has(key)) {
        return map.get(key);
    }

    const promise = (async () => {
        try {
            return await factory();
        } finally {
            map.delete(key);
        }
    })();

    map.set(key, promise);
    return promise;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(err) {
    const message = String(err?.message || "").toLowerCase();
    const code = String(err?.code || "").toLowerCase();
    const status = Number(err?.status || err?.statusCode || 0);

    return (
        message.includes("fetch failed") ||
        message.includes("econnreset") ||
        message.includes("etimedout") ||
        message.includes("network") ||
        code === "econnreset" ||
        code === "etimedout" ||
        code === "und_err_connect_timeout" ||
        status === 429 ||
        status >= 500
    );
}

async function processWithRetry(key, workerId) {
    let attempt = 0;

    while (true) {
        try {
            return await processKey(key);
        } catch (err) {
            attempt++;

            console.error(`Worker ${workerId} failed on ${key} (attempt ${attempt}/${RETRY_LIMIT + 1})`);
            console.error(err);

            if (!isRetryableError(err) || attempt > RETRY_LIMIT) {
                return "failed";
            }

            const backoffMs = Math.min(1000 * (2 ** (attempt - 1)), 8000);
            await sleep(backoffMs);
        }
    }
}

async function processKey(key) {
    const parsed = parsePath(key);
    if (!parsed) {
        return "skipped";
    }

    const canonical = normaliseParsed(parsed);
    const canonicalPath = buildCanonicalPath(canonical);
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

    return "processed";
}

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

    await preloadCaches();

    console.log(`Using concurrency ${INGEST_CONCURRENCY} with retry limit ${RETRY_LIMIT}.`);

    let nextIndex = 0;
    let processed = 0;
    let insertedOrUpdated = 0;
    let skipped = 0;
    let failed = 0;

    async function worker(workerId) {
        while (true) {
            const currentIndex = nextIndex++;

            if (currentIndex >= keys.length) {
                return;
            }

            const key = keys[currentIndex];
            const result = await processWithRetry(key, workerId);

            if (result === "failed") {
                failed++;
                continue;
            }

            processed++;
            if (result === "processed") {
                insertedOrUpdated++;
            } else {
                skipped++;
            }

            if (processed % 100 === 0) {
                console.log(`Processed ${processed}/${keys.length} keys...`);
            }
        }
    }

    await Promise.all(
        Array.from({ length: INGEST_CONCURRENCY }, (_, index) => worker(index + 1))
    );

    flushLogs();
    console.log(`Ingestion complete. Parsed ${insertedOrUpdated}, skipped ${skipped}, failed ${failed}.`);
}

function safeFlushLogsOnFatalError(err) {
    try {
        flushLogs();
    } catch (flushError) {
        console.error("Failed to flush logs after fatal error:", flushError);
    }

    console.error("Fatal error:", err);
    process.exitCode = 1;
}

main().catch((err) => {
    safeFlushLogsOnFatalError(err);
});

const CATEGORY_REVIEW_LOG = "category_rejections.json";

function logCategoryRejection(name, slug, parentId) {
    queueBufferedLog(CATEGORY_REVIEW_LOG, categoryReviewLogBuffer, {
        name,
        slug,
        parentId,
        timestamp: new Date().toISOString()
    });
}

const FAIL_LOG = "parse_failures.json";

function logFailure(filePath, reason) {
    queueBufferedLog(FAIL_LOG, parseFailureLogBuffer, {
        file: filePath,
        reason,
        timestamp: new Date().toISOString()
    });
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

function extractSkuCandidates(text) {
    return (text.match(/[A-Za-z0-9-]+/g) || [])
        .map(part => part.trim())
        .filter(Boolean)
        .filter(looksLikeSKU);
}

function findSkuInCombinedFolder(folderName, fileName) {
    const folderCandidates = extractSkuCandidates(folderName);
    if (!folderCandidates.length) {
        return null;
    }

    const fileCandidates = extractSkuCandidates(fileName);
    if (!fileCandidates.length) {
        return null;
    }

    const fileCandidateSet = new Set(fileCandidates.map((candidate) => candidate.toUpperCase()));
    return folderCandidates.find((candidate) => fileCandidateSet.has(candidate.toUpperCase())) || null;
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

    // Skip the top-level web export tree entirely.
    if (segments[0]?.toLowerCase() === "web") {
        return null;
    }

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
                const combinedSku = findSkuInCombinedFolder(potentialProduct, fileName);

                if (combinedSku) {
                    segments.pop();
                    product = combinedSku;
                    categories = segments;
                } else {
                    logFailure(
                        cleaned,
                        `Expected SKU product folder above media folder, got: "${potentialProduct}"`
                    );
                    return null;
                }
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
        parentId = await getOrCreateCategory({ name, slug, parentId });
    }

    return parentId;
}

async function getOrCreateCategory({ name, slug, parentId }) {
    if (categoryCache.has(slug)) {
        return categoryCache.get(slug);
    }

    return withInFlight(categoryInFlight, slug, async () => {
        if (categoryCache.has(slug)) {
            return categoryCache.get(slug);
        }

        const { data: existing, error: selectError } = await supabase
            .from("categories")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();

        if (selectError) throw selectError;

        if (existing) {
            categoryCache.set(slug, existing.id);
            return existing.id;
        }

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

        categoryCache.set(slug, inserted.id);
        return inserted.id;
    });
}

async function upsertProduct({ productName, categoryId }) {
    const sku = productName.trim();

    const productSlug = sku
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    return withInFlight(productInFlight, sku, async () => {
        let existing = productCache.get(sku);

        if (!existing) {
            const { data, error: selectError } = await supabase
                .from("products")
                .select("id, category_id, slug, name")
                .eq("sku", sku)
                .maybeSingle();

            if (selectError) throw selectError;
            existing = data || null;
        }

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

                existing = { ...existing, category_id: categoryId, slug: productSlug, name: sku };
            }

            productCache.set(sku, existing);
            return existing.id;
        }

        const { data: inserted, error: insertError } = await supabase
            .from("products")
            .insert([{ name: sku, slug: productSlug, sku, category_id: categoryId }])
            .select("id, category_id, slug, name, sku")
            .single();

        if (insertError) throw insertError;

        productCache.set(sku, inserted);
        return inserted.id;
    });
}

async function upsertProductImage({
    productId,
    filePath,     // this will be your CANONICAL path
    mediaType,
    sourcePath    // this will be the ORIGINAL supplier path
}) {
    const cacheKey = `${productId}:${filePath}`;

    return withInFlight(productImageInFlight, cacheKey, async () => {
        let existing = productImageCache.get(cacheKey);

        if (!existing) {
            const { data, error: selectError } = await supabase
                .from("product_images")
                .select("id, source_path, media_type")
                .eq("product_id", productId)
                .eq("file_path", filePath)
                .maybeSingle();

            if (selectError) throw selectError;
            existing = data || null;
        }

        if (existing) {
            if (
                (sourcePath && existing.source_path !== sourcePath) ||
                existing.media_type !== mediaType
            ) {
                const { error: updateError } = await supabase
                    .from("product_images")
                    .update({ source_path: sourcePath, media_type: mediaType })
                    .eq("id", existing.id);

                if (updateError) throw updateError;

                existing = { ...existing, source_path: sourcePath, media_type: mediaType };
            }

            productImageCache.set(cacheKey, existing);
            return existing.id;
        }

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
            .select("id, source_path, media_type")
            .single();

        if (insertError) throw insertError;

        productImageCache.set(cacheKey, inserted);
        return inserted.id;
    });
}
