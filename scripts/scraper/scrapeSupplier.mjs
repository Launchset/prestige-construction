import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import readline from "node:readline/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const CAPLE_INDEX_PATH = path.join(ROOT_DIR, "scripts", "scraper", "caple-index.json");
const REVIEW_OUTPUT_PATH = path.join(__dirname, "scrape-review.json");
const RUN_REPORT_PATH = path.join(__dirname, "scrape-run-report.json");

dotenv.config({ path: path.join(ROOT_DIR, ".env.local") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !supabaseServiceRole) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in .env.local");
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

const REQUEST_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
};

const PRODUCT_DELAY_MS = 1200;
const RETRY_DELAY_MS = 2000;
const MAX_ATTEMPTS = 3;
const VERBOSE = process.env.SCRAPER_VERBOSE !== "0";
const SKU_FILTER = (process.env.SCRAPER_SKU ?? "")
    .split(",")
    .map(value => value.trim().toUpperCase())
    .filter(Boolean);
const LIMIT = Number.parseInt(process.env.SCRAPER_LIMIT ?? "", 10);
const INTERACTIVE = process.env.SCRAPER_INTERACTIVE !== "0" && process.stdin.isTTY && process.stdout.isTTY;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function logSection(title) {
    console.log(`\n=== ${title} ===`);
}

function logDetail(message) {
    console.log(`  ${message}`);
}

function logWarning(message) {
    console.log(`  Warning: ${message}`);
}

function formatCurrency(value) {
    if (!Number.isFinite(value)) {
        return "n/a";
    }

    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP"
    }).format(value);
}

function summarizeFeatures(features, limit = 3) {
    if (!features.length) {
        return "none";
    }

    const preview = features.slice(0, limit).join(" | ");
    return features.length > limit ? `${preview} | +${features.length - limit} more` : preview;
}

function createPrompt() {
    if (!INTERACTIVE) {
        return null;
    }

    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

async function promptFailureAction(prompt, context) {
    if (!prompt) {
        return "continue";
    }

    logWarning(`${context.reason} for ${context.sku}`);
    if (context.url) {
        logDetail(`URL: ${context.url}`);
    }
    if (context.details) {
        logDetail(context.details);
    }

    while (true) {
        const answer = (await prompt.question(
            "  Action: [enter/c] continue, [r] retry, [s] skip, [q] quit, [u] show URL again: "
        ))
            .trim()
            .toLowerCase();

        if (answer === "" || answer === "c") {
            return "continue";
        }

        if (answer === "r") {
            return "retry";
        }

        if (answer === "s") {
            return "skip";
        }

        if (answer === "q") {
            return "quit";
        }

        if (answer === "u") {
            if (context.url) {
                logDetail(`URL: ${context.url}`);
            } else {
                logDetail("No URL available for this product.");
            }
            continue;
        }

        logDetail("Invalid choice. Use enter/c, r, s, q, or u.");
    }
}

async function loadCapleIndex() {
    const raw = await fs.readFile(CAPLE_INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw);

    return Object.fromEntries(
        Object.entries(parsed).map(([sku, url]) => [sku.toUpperCase(), url])
    );
}

async function fetchProducts() {
    const { data, error } = await supabase
        .from("products")
        .select(`
            id,
            name,
            sku,
            category_id,
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
                name: product.name,
                sku: product.sku,
                category_id: product.category_id
            });
        }
    }

    return [...uniqueProducts.values()];
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

function buildCategoryPathMap(categories) {
    const categoriesById = new Map(categories.map(category => [category.id, category]));
    const pathById = new Map();

    function resolvePath(categoryId) {
        if (!categoryId) {
            return "uncategorised";
        }

        if (pathById.has(categoryId)) {
            return pathById.get(categoryId);
        }

        const category = categoriesById.get(categoryId);

        if (!category) {
            return "uncategorised";
        }

        const parentPath = category.parent_id ? resolvePath(category.parent_id) : null;
        const path = parentPath && parentPath !== "uncategorised"
            ? `${parentPath} / ${category.name}`
            : category.name;

        pathById.set(categoryId, path);
        return path;
    }

    for (const category of categories) {
        resolvePath(category.id);
    }

    return pathById;
}

function filterProducts(products) {
    let filtered = [...products];

    if (SKU_FILTER.length > 0) {
        const allowed = new Set(SKU_FILTER);
        filtered = filtered.filter(product => allowed.has((product.sku ?? "").trim().toUpperCase()));
    }

    if (Number.isFinite(LIMIT) && LIMIT > 0) {
        filtered = filtered.slice(0, LIMIT);
    }

    return filtered;
}

function findProductUrl(index, sku) {
    if (!sku) {
        return null;
    }

    return index[sku.toUpperCase()] ?? null;
}

async function findProductUrlBySearch(sku) {
    const { data } = await axios.get(`https://www.caple.co.uk/?s=${encodeURIComponent(sku)}`, {
        headers: REQUEST_HEADERS,
        timeout: 30000
    });

    const $ = cheerio.load(data);
    const urls = $('a[href*="/online-shop/"]')
        .map((_, element) => $(element).attr("href"))
        .get()
        .filter(Boolean)
        .filter(url => url !== "https://www.caple.co.uk/online-shop/");

    const normalizedSku = sku.toLowerCase();

    const exactMatch = urls.find(url => {
        try {
            return new URL(url).pathname.endsWith(`/${normalizedSku}/`);
        } catch {
            return false;
        }
    });

    return exactMatch ?? urls[0] ?? null;
}

function parsePrice(rawPrice) {
    const normalized = rawPrice.replace(/[^0-9.]/g, "");
    const value = Number.parseFloat(normalized);

    return Number.isFinite(value) ? value : NaN;
}

function scrapeProductMarkup(html) {
    const $ = cheerio.load(html);

    const scrapedName = $("h1").first().text().trim();
    const rawPrice = $(".price").first().text().trim();
    const scrapedPrice = parsePrice(rawPrice);
    const scrapedFeatures = [];

    $("h4.features-title")
        .next("ul")
        .find("li")
        .each((_, element) => {
            const feature = $(element).text().trim();

            if (feature) {
                scrapedFeatures.push(feature);
            }
        });

    return {
        scraped_name: scrapedName,
        scraped_price: scrapedPrice,
        scraped_features: scrapedFeatures
    };
}

function isValidScrape(scraped) {
    return Boolean(
        scraped.scraped_name &&
            Number.isFinite(scraped.scraped_price) &&
            scraped.scraped_features.length > 0
    );
}

function buildReviewResult(productId, sku, url, scraped, partial = false) {
    return {
        product_id: productId,
        sku,
        url,
        scraped_name: scraped.scraped_name,
        scraped_price: scraped.scraped_price,
        scraped_features: scraped.scraped_features,
        partial
    };
}

async function scrapeWithRetry(url, sku) {
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const { data } = await axios.get(url, {
                headers: REQUEST_HEADERS,
                timeout: 30000
            });

            return scrapeProductMarkup(data);
        } catch (error) {
            lastError = error;
            console.log(
                `[${sku}] Attempt ${attempt}/${MAX_ATTEMPTS} failed: ${error.message}`
            );

            if (attempt < MAX_ATTEMPTS) {
                await sleep(RETRY_DELAY_MS);
            }
        }
    }

    throw lastError;
}

async function run() {
    const prompt = createPrompt();

    logSection("Caple Scraper");
    logDetail(`Index file: ${CAPLE_INDEX_PATH}`);
    logDetail(`Review output: ${REVIEW_OUTPUT_PATH}`);
    logDetail(`Run report: ${RUN_REPORT_PATH}`);
    logDetail(`Interactive mode: ${INTERACTIVE ? "on" : "off"}`);

    console.log("Loading Caple index...");
    const capleIndex = await loadCapleIndex();
    logDetail(`Loaded ${Object.keys(capleIndex).length} indexed SKUs`);

    console.log("Loading products from Supabase...");
    const allProducts = await fetchProducts();
    const categories = await fetchCategories();
    const categoryPathById = buildCategoryPathMap(categories);
    const products = filterProducts(allProducts);
    const startedAt = Date.now();

    logDetail(`Fetched ${allProducts.length} products from Supabase`);
    logDetail(`Loaded ${categories.length} categories`);
    if (SKU_FILTER.length > 0) {
        logDetail(`SKU filter active: ${SKU_FILTER.join(", ")}`);
    }
    if (Number.isFinite(LIMIT) && LIMIT > 0) {
        logDetail(`Limit active: ${LIMIT}`);
    }
    logDetail(`Processing ${products.length} products this run`);

    const reviewResults = [];
    const runReport = [];
    let success = 0;
    let failed = 0;
    let missingUrl = 0;
    let missingFeatures = 0;

    try {
        for (const [index, product] of products.entries()) {
            const sku = (product.sku ?? "").trim();
            const normalizedSku = sku.toLowerCase();
            const label = sku || product.name || "(missing sku)";
            const categoryLabel = categoryPathById.get(product.category_id) ?? "uncategorised";
            const progressLabel = `[${index + 1}/${products.length}] ${label}`;
            const productStartedAt = Date.now();

            logSection(progressLabel);
            logDetail(`Category: ${categoryLabel}`);

            let shouldRetryProduct = false;

            do {
                shouldRetryProduct = false;

                const reportEntry = {
                    product_id: product.id,
                    sku,
                    product_name: product.name ?? null,
                    started_at: new Date().toISOString(),
                    status: "pending",
                    url_source: null,
                    url: null,
                    scraped_name: null,
                    scraped_price: null,
                    scraped_features_count: 0,
                    message: null
                };

                if (!sku) {
                    reportEntry.status = "failed";
                    reportEntry.message = "Product has no SKU";
                    runReport.push(reportEntry);
                    failed++;
                    logDetail("No SKU on product record, skipping.");
                    break;
                }

                let url = findProductUrl(capleIndex, normalizedSku);
                let urlSource = "index";

                if (!url) {
                    urlSource = "search";
                    logDetail("No direct URL in caple-index.json, trying site search fallback.");

                    try {
                        url = await findProductUrlBySearch(sku || normalizedSku);
                    } catch (error) {
                        logDetail(`Search fallback failed: ${error.message}`);
                    }
                }

                if (!url) {
                    reportEntry.status = "failed";
                    reportEntry.url_source = urlSource;
                    reportEntry.message = "No Caple URL found";
                    runReport.push(reportEntry);
                    missingUrl++;
                    failed++;
                    logDetail("No matching Caple URL found after fallback.");

                    const action = await promptFailureAction(prompt, {
                        sku,
                        url: null,
                        reason: "No URL found",
                        details: "The SKU was not found in the index and the search fallback returned nothing."
                    });

                    if (action === "retry") {
                        shouldRetryProduct = true;
                        missingUrl--;
                        failed--;
                        runReport.pop();
                    } else if (action === "quit") {
                        throw new Error("Run aborted by user");
                    }

                    break;
                }

                reportEntry.url = url;
                reportEntry.url_source = urlSource;
                logDetail(`Using ${urlSource} URL: ${url}`);

                try {
                    const scraped = await scrapeWithRetry(url, sku || normalizedSku || "unknown");
                    reportEntry.scraped_name = scraped.scraped_name;
                    reportEntry.scraped_price = Number.isFinite(scraped.scraped_price)
                        ? scraped.scraped_price
                        : null;
                    reportEntry.scraped_features_count = scraped.scraped_features.length;

                    if (scraped.scraped_features.length === 0) {
                        missingFeatures++;
                    }

                    if (!isValidScrape(scraped)) {
                        reportEntry.status = "failed";
                        reportEntry.message = "Validation failed";
                        runReport.push(reportEntry);
                        failed++;
                        logDetail("Validation failed.");
                        if (VERBOSE) {
                            logDetail(`Name: ${scraped.scraped_name || "missing"}`);
                            logDetail(`Price: ${formatCurrency(scraped.scraped_price)}`);
                            logDetail(`Features: ${scraped.scraped_features.length}`);
                        }

                        const action = await promptFailureAction(prompt, {
                            sku,
                            url,
                            reason: "Validation failed",
                            details: `Name: ${scraped.scraped_name || "missing"} | Price: ${formatCurrency(scraped.scraped_price)} | Features: ${scraped.scraped_features.length}`
                        });

                        if (action === "retry") {
                            shouldRetryProduct = true;
                            if (scraped.scraped_features.length === 0) {
                                missingFeatures--;
                            }
                            failed--;
                            runReport.pop();
                        } else if (action === "quit") {
                            throw new Error("Run aborted by user");
                        } else {
                            reviewResults.push(
                                buildReviewResult(product.id, sku, url, scraped, true)
                            );
                            reportEntry.status = "partial_success";
                            reportEntry.message = "Saved partial scrape after validation failure";
                            success++;
                            failed--;
                            logDetail("Saved partial scrape and continuing.");
                        }
                    } else {
                        reviewResults.push(
                            buildReviewResult(product.id, sku, url, scraped)
                        );

                        reportEntry.status = "success";
                        reportEntry.message = "Scrape completed";
                        runReport.push(reportEntry);
                        success++;
                        logDetail(`Name: ${scraped.scraped_name}`);
                        logDetail(`Price: ${formatCurrency(scraped.scraped_price)}`);
                        logDetail(`Features (${scraped.scraped_features.length}): ${summarizeFeatures(scraped.scraped_features)}`);
                        logDetail("Status: OK");
                    }
                } catch (error) {
                    reportEntry.status = "failed";
                    reportEntry.message = error.message;
                    runReport.push(reportEntry);
                    logDetail(`Scrape failed: ${error.message}`);
                    failed++;

                    const action = await promptFailureAction(prompt, {
                        sku,
                        url,
                        reason: "HTTP or scrape error",
                        details: error.message
                    });

                    if (action === "retry") {
                        shouldRetryProduct = true;
                        failed--;
                        runReport.pop();
                    } else if (action === "quit") {
                        throw new Error("Run aborted by user");
                    }
                }
            } while (shouldRetryProduct);

            const elapsedMs = Date.now() - productStartedAt;
            logDetail(`Finished in ${(elapsedMs / 1000).toFixed(1)}s`);

            await sleep(PRODUCT_DELAY_MS);
        }
    } finally {
        prompt?.close();
    }

    await fs.writeFile(REVIEW_OUTPUT_PATH, JSON.stringify(reviewResults, null, 2));
    await fs.writeFile(
        RUN_REPORT_PATH,
        JSON.stringify(
            {
                generated_at: new Date().toISOString(),
                total_products_in_db: allProducts.length,
                processed_products: products.length,
                success,
                failed,
                missing_url: missingUrl,
                missing_features: missingFeatures,
                entries: runReport
            },
            null,
            2
        )
    );

    const totalElapsedMs = Date.now() - startedAt;

    logSection("Run Summary");
    logDetail(`Total products checked: ${products.length}`);
    logDetail(`Success: ${success}`);
    logDetail(`Failed: ${failed}`);
    logDetail(`Missing URL: ${missingUrl}`);
    logDetail(`Missing features: ${missingFeatures}`);
    logDetail(`Elapsed: ${(totalElapsedMs / 1000).toFixed(1)}s`);
    logDetail(`Review successes in ${REVIEW_OUTPUT_PATH}`);
    logDetail(`Review full audit in ${RUN_REPORT_PATH}`);
}

run().catch(error => {
    console.error("Scraper failed:", error);
    process.exitCode = 1;
});
