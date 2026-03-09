import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import {
    S3Client,
    PutObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";

dotenv.config({ path: ".env.import" });

const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
    R2_PREFIX = "",
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new Error("Missing R2 env vars.");
}

const IMPORT_ROOT = path.resolve("./imports");

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
});


function toPosix(p) {
    return p.split(path.sep).join("/");
}

function walkFiles(dir) {
    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(walkFiles(fullPath));
        } else {
            results.push(fullPath);
        }
    }

    return results;
}

function guessContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".pdf") return "application/pdf";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".png") return "image/png";
    if (ext === ".webp") return "image/webp";
    return "application/octet-stream";
}

async function existsInR2(key) {
    try {
        await s3.send(
            new HeadObjectCommand({
                Bucket: R2_BUCKET,
                Key: key,
            })
        );
        return true;
    } catch {
        return false;
    }
}

async function uploadWithRetry(key, filePath, maxAttempts = 5) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const fileBuffer = fs.readFileSync(filePath); // fresh buffer every attempt

            await s3.send(
                new PutObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: key,
                    Body: fileBuffer,
                    ContentType: guessContentType(filePath),
                })
            );

            return;
        } catch (err) {
            console.error(
                `Upload failed (attempt ${attempt}/${maxAttempts}) for: ${key}`
            );
            console.error(err?.message || err);

            if (attempt === maxAttempts) throw err;

            const wait = Math.min(30000, 500 * 2 ** (attempt - 1));
            await new Promise((r) => setTimeout(r, wait));
        }
    }
}

async function main() {
    console.log("📦 Starting R2 mirror...");
    console.log("Import root:", IMPORT_ROOT);
    console.log("Bucket:", R2_BUCKET);

    const files = walkFiles(IMPORT_ROOT);
    files.sort((a, b) => a.localeCompare(b));

    const total = files.length;
    let uploaded = 0;
    let skipped = 0;
    let processed = 0;

    const CONCURRENCY = 2; // safer for long uploads
    let index = 0;

    async function worker() {
        while (true) {
            const current = index++;
            if (current >= total) return;

            const abs = files[current];
            const rel = toPosix(path.relative(IMPORT_ROOT, abs));
            const key = `${R2_PREFIX}${rel}`;

            processed++;

            if (await existsInR2(key)) {
                skipped++;
            } else {
                await uploadWithRetry(key, abs);
                uploaded++;
            }

            if (processed % 20 === 0 || processed === total) {
                console.log(
                    `Progress: ${processed}/${total} | Uploaded: ${uploaded} | Skipped: ${skipped}`
                );
            }
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    console.log("\n✅ Mirror complete.");
    console.log(`Total: ${total}`);
    console.log(`Uploaded: ${uploaded}`);
    console.log(`Skipped: ${skipped}`);
}

main().catch((err) => {
    console.error("❌ Mirror failed:");
    console.error(err);
    process.exit(1);
});
