import { config } from "dotenv";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

// Load env variables (adjust path if needed)
config({ path: ".env.import" });


// ---------- R2 CLIENT ----------
const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.R2_BUCKET;

// ---------- MEDIA TYPES ----------
const MEDIA_TYPES = [
    "Lifestyle",
    "Product Shot",
    "Spec Sheet",
    "Technical Drawing",
];

// ---------- HELPERS ----------
function cleanPath(path) {
    // Remove weird bullet character at start
    return path.replace(/^•/, "");
}

function parsePath(path) {
    const cleaned = cleanPath(path);
    const segments = cleaned.split("/");

    const fileName = segments.pop(); // remove file

    let mediaType = null;
    let product = null;
    let categories = [];

    const lastFolder = segments[segments.length - 1];

    if (MEDIA_TYPES.includes(lastFolder)) {
        mediaType = lastFolder;
        product = segments[segments.length - 2];
        categories = segments.slice(0, -2);
    } else {
        product = lastFolder;
        categories = segments.slice(0, -1);
    }

    return {
        categories,
        product,
        mediaType,
        fileName,
        originalPath: cleaned,
    };
}

// ---------- MAIN ----------
async function listAndParseFiles() {
    const command = new ListObjectsV2Command({
        Bucket: BUCKET,
        MaxKeys: 50,
    });

    const response = await client.send(command);

    if (!response.Contents?.length) {
        console.log("No files found.");
        return;
    }

    console.log("\nParsed R2 files:\n");

    response.Contents.forEach((item, index) => {
        const parsed = parsePath(item.Key);

        console.log(`\n${index + 1}.`);
        console.log(parsed);
    });
}

listAndParseFiles().catch((err) => {
    console.error("Error listing files:", err);
});
