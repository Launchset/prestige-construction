import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const CAPLE_INDEX_PATH = path.join(ROOT_DIR, "caple-index.json");
const REVIEW_OUTPUT_PATH = path.join(__dirname, "scrape-review.json");

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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
        .select("id, name, sku");

    if (error) {
        throw error;
    }

    return data ?? [];
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
    console.log("Loading Caple index...");
    const capleIndex = await loadCapleIndex();

    console.log("Loading products from Supabase...");
    const products = await fetchProducts();

    const reviewResults = [];
    let success = 0;
    let failed = 0;
    let missingUrl = 0;
    let missingFeatures = 0;

    for (const product of products) {
        const sku = (product.sku ?? "").trim();
        const normalizedSku = sku.toLowerCase();

        console.log(`Checking ${sku || "(missing sku)"}`);

        let url = findProductUrl(capleIndex, normalizedSku);

        if (!url) {
            console.log(`[${sku || "unknown"}] Missing URL in caple-index.json, trying search fallback`);

            try {
                url = await findProductUrlBySearch(sku || normalizedSku);
            } catch (error) {
                console.log(`[${sku || "unknown"}] Search fallback failed: ${error.message}`);
            }
        }

        if (!url) {
            console.log(`[${sku || "unknown"}] Missing URL after fallback`);
            missingUrl++;
            failed++;
            await sleep(PRODUCT_DELAY_MS);
            continue;
        }

        try {
            const scraped = await scrapeWithRetry(url, sku || normalizedSku || "unknown");

            if (scraped.scraped_features.length === 0) {
                missingFeatures++;
            }

            if (!isValidScrape(scraped)) {
                console.log(`[${sku}] Validation failed`);
                failed++;
            } else {
                reviewResults.push({
                    product_id: product.id,
                    sku,
                    url,
                    scraped_name: scraped.scraped_name,
                    scraped_price: scraped.scraped_price,
                    scraped_features: scraped.scraped_features
                });

                success++;
                console.log(`[${sku}] OK`);
            }
        } catch (error) {
            console.log(`[${sku}] Scrape failed: ${error.message}`);
            failed++;
        }

        await sleep(PRODUCT_DELAY_MS);
    }

    await fs.writeFile(REVIEW_OUTPUT_PATH, JSON.stringify(reviewResults, null, 2));

    console.log("");
    console.log(`Total products checked: ${products.length}`);
    console.log(`Success: ${success}`);
    console.log(`Failed: ${failed}`);
    console.log(`Missing URL: ${missingUrl}`);
    console.log(`Missing features: ${missingFeatures}`);
    console.log("Scraping complete. Review scrape-review.json before committing.");
}

run().catch(error => {
    console.error("Scraper failed:", error);
    process.exitCode = 1;
});
