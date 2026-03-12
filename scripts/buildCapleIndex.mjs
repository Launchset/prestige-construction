import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT_DIR, "caple-index.json");

const SITEMAP_INDEX_URL = "https://www.caple.co.uk/sitemap_index.xml";
const REQUEST_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
};

function extractSku(url) {
    const pathname = new URL(url).pathname;
    const parts = pathname.split("/").filter(Boolean);

    if (parts.length === 1) {
        return null;
    }

    return parts.at(-1)?.toUpperCase() ?? null;
}

async function fetchXml(url) {
    const { data } = await axios.get(url, {
        headers: REQUEST_HEADERS,
        timeout: 30000
    });

    return data;
}

async function getProductSitemapUrls() {
    const xml = await fetchXml(SITEMAP_INDEX_URL);
    const $ = cheerio.load(xml, { xmlMode: true });

    return $("sitemap > loc")
        .map((_, element) => $(element).text().trim())
        .get()
        .filter(url => /\/product-sitemap\d*\.xml$/i.test(url));
}

async function getProductUrlsFromSitemap(sitemapUrl) {
    const xml = await fetchXml(sitemapUrl);
    const $ = cheerio.load(xml, { xmlMode: true });

    return $("url > loc")
        .map((_, element) => $(element).text().trim())
        .get()
        .filter(url => url.includes("/online-shop/") && url !== "https://www.caple.co.uk/online-shop/");
}

async function run() {
    const skuMap = {};

    console.log("Loading sitemap index...");
    const sitemapUrls = await getProductSitemapUrls();

    for (const sitemapUrl of sitemapUrls) {
        console.log("Scanning:", sitemapUrl);

        const productUrls = await getProductUrlsFromSitemap(sitemapUrl);

        for (const productUrl of productUrls) {
            const sku = extractSku(productUrl);

            if (sku) {
                skuMap[sku] = productUrl;
            }
        }
    }

    await fs.writeFile(OUTPUT_PATH, JSON.stringify(skuMap, null, 2));

    console.log("Index saved:", Object.keys(skuMap).length, "products");
    console.log("Output:", OUTPUT_PATH);
}

run().catch(error => {
    console.error("Index build failed:", error);
    process.exitCode = 1;
});
