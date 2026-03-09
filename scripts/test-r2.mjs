import fs from "fs";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

console.log("Starting R2 test...");

dotenv.config({ path: ".env.import" });

console.log("Env loaded:");
console.log("Account:", process.env.R2_ACCOUNT_ID);
console.log("Bucket:", process.env.R2_BUCKET);

const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function run() {
    const filePath = "./imports/•Sinks & Taps/Sinks/Ceramic/FARMHOUSE- SIT ON/BLACKMORE/Lifestyle/BLACKMORE 01.jpg";

    console.log("Reading file:", filePath);

    const fileBuffer = fs.readFileSync(filePath);

    console.log("Uploading to R2...");

    await s3.send(
        new PutObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: "test-upload.jpg",
            Body: fileBuffer,
        })
    );

    console.log("Upload successful.");
}

run().catch((err) => {
    console.error("ERROR:");
    console.error(err);
});
