import { config } from "dotenv";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

// Load environment variables
config({ path: ".env.import" });

function isConfigured(value) {
    if (!value) {
      return false;
    }

    return true;
}

console.log("R2 bucket:", process.env.R2_BUCKET || "(missing)");
console.log("R2 account configured:", isConfigured(process.env.R2_ACCOUNT_ID));
console.log("R2 access key configured:", isConfigured(process.env.R2_ACCESS_KEY_ID));

const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

async function listFiles() {
    const command = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET,
        MaxKeys: 50,
    });

    const response = await client.send(command);

    if (!response.Contents?.length) {
        console.log("No files found.");
        return;
    }

    console.log("\nFirst 50 file paths:\n");

    response.Contents.forEach((item, index) => {
        console.log(`${index + 1}. ${item.Key}`);
    });
}

listFiles().catch((err) => {
    console.error("Error listing files:", err);
});
