import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import sharp from "sharp";
import {
    S3Client,
    ListObjectsV2Command,
    GetObjectCommand,
    PutObjectCommand,
    HeadObjectCommand
} from "@aws-sdk/client-s3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "..", ".env.import");

dotenv.config({ path: envPath });

console.log("ACCESS:", Boolean(process.env.R2_ACCESS_KEY_ID));
console.log("SECRET:", Boolean(process.env.R2_SECRET_ACCESS_KEY));
console.log("ACCOUNT:", Boolean(process.env.R2_ACCOUNT_ID));
console.log("BUCKET:", Boolean(process.env.R2_BUCKET));

const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.R2_BUCKET;

// 🔹 Adjustable settings
const MAX_WIDTH = 2000;
const QUALITY = 82;
const CONCURRENCY = 1; // don't fry your machine

async function listAllKeys() {
    let keys = [];
    let token;

    do {
        const res = await r2.send(new ListObjectsV2Command({
            Bucket: BUCKET,
            ContinuationToken: token
        }));

        keys.push(...(res.Contents || []).map(o => o.Key));
        token = res.NextContinuationToken;
    } while (token);

    return keys;
}

async function alreadyExists(key) {
    try {
        await r2.send(new HeadObjectCommand({
            Bucket: BUCKET,
            Key: key
        }));
        return true;
    } catch {
        return false;
    }
}

async function processImage(key) {
    const lower = key.toLowerCase();

    // Skip non-images
    if (!lower.endsWith(".jpg") && !lower.endsWith(".jpeg")) {
        return;
    }

    // Skip already in web/
    if (key.startsWith("web/")) {
        return;
    }

    const webKey = `web/${key.replace(/\.(jpg|jpeg)$/i, ".webp")}`;

    if (await alreadyExists(webKey)) {
        console.log("Skipping (already exists):", webKey);
        return;
    }

    console.log("Processing:", key);

    const original = await r2.send(new GetObjectCommand({
        Bucket: BUCKET,
        Key: key
    }));

    const chunks = [];
    for await (const chunk of original.Body) {
        chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    const resized = await sharp(buffer)
        .resize({
            width: MAX_WIDTH,
            withoutEnlargement: true
        })
        .webp({ quality: QUALITY })
        .toBuffer();

    await r2.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: webKey,
        Body: resized,
        ContentType: "image/webp"
    }));

    console.log("Uploaded:", webKey);
}

async function main() {
    const allKeys = await listAllKeys();

    // Only count images that actually need evaluating
    const keys = allKeys.filter(key => {
        const lower = key.toLowerCase();
        return (
            (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) &&
            !key.startsWith("web/")
        );
    });

    const total = keys.length;
    console.log(`Total images to evaluate: ${total}`);

    let completed = 0;
    const startTime = Date.now();

    const queue = [...keys];
    const workers = [];

    for (let i = 0; i < CONCURRENCY; i++) {
        workers.push((async () => {
            while (queue.length) {
                const key = queue.shift();

                try {
                    await processImage(key);
                } catch (err) {
                    console.error("Error processing:", key, err.message);
                }

                completed++;

                const elapsedSec = (Date.now() - startTime) / 1000;
                const avgPerFile = elapsedSec / completed;
                const remaining = (total - completed) * avgPerFile;
                const percent = ((completed / total) * 100).toFixed(2);

                console.log(
                    `Progress: ${completed}/${total} (${percent}%) | ` +
                    `Elapsed: ${elapsedSec.toFixed(0)}s | ` +
                    `ETA: ${remaining.toFixed(0)}s`
                );
            }
        })());
    }

    await Promise.all(workers);

    console.log("All done.");
}

main().catch(console.error);
