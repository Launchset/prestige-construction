import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVIEW_PATH = path.join(
  process.cwd(),
  "scripts",
  "scraper",
  "pdf-feature-review.json",
);

type ReviewItem = {
  sku?: string;
  resolved_r2_key?: string;
  spec_sheet_file_path?: string;
  spec_sheet_source_path?: string;
};

function getEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

async function getReviewItem(index: number) {
  const content = await fs.readFile(REVIEW_PATH, "utf8");
  const parsed = JSON.parse(content.replace(/^\uFEFF/, ""));
  const items = Array.isArray(parsed)
    ? parsed as ReviewItem[]
    : Array.isArray(parsed?.value)
      ? parsed.value as ReviewItem[]
      : [];

  if (!Array.isArray(items) || !items[index]) {
    throw new Error("Unknown review item");
  }

  return items[index];
}

function stripKnownBulletPrefix(value: string) {
  return value
    .replace(/^Ã¢â‚¬Â¢/, "")
    .replace(/^â€¢/, "")
    .replace(/^•/, "")
    .trim();
}

function buildCandidateKeys(item: ReviewItem) {
  const rawKeys = [
    item.resolved_r2_key,
    item.spec_sheet_source_path,
    item.spec_sheet_file_path,
  ]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
  const candidates: string[] = [];

  for (const rawKey of rawKeys) {
    const stripped = stripKnownBulletPrefix(rawKey);

    for (const key of [
      rawKey,
      rawKey.replace(/^Ã¢â‚¬Â¢/, "â€¢"),
      rawKey.replace(/^Ã¢â‚¬Â¢/, "•"),
      stripped,
      stripped ? `â€¢${stripped}` : "",
      stripped ? `•${stripped}` : "",
    ]) {
      if (key && !candidates.includes(key)) {
        candidates.push(key);
      }
    }
  }

  return candidates;
}

function createR2Client() {
  config({ path: ".env.import" });

  return new S3Client({
    region: "auto",
    endpoint: `https://${getEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const index = Number.parseInt(
    request.nextUrl.searchParams.get("index") ?? "",
    10,
  );

  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "Invalid index" }, { status: 400 });
  }

  try {
    const item = await getReviewItem(index);
    const candidateKeys = buildCandidateKeys(item);

    if (candidateKeys.length === 0) {
      return NextResponse.json(
        { error: `No resolved R2 key for ${item.sku ?? `item ${index}`}` },
        { status: 404 },
      );
    }

    const r2 = createR2Client();
    let result = null;
    let lastError: unknown = null;

    for (const key of candidateKeys) {
      try {
        result = await r2.send(
          new GetObjectCommand({
            Bucket: getEnv("R2_BUCKET"),
            Key: key,
          }),
        );
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!result) {
      throw lastError instanceof Error
        ? lastError
        : new Error(`Unable to resolve PDF key for ${item.sku ?? `item ${index}`}`);
    }

    if (!result.Body) {
      return NextResponse.json({ error: "PDF body was empty" }, { status: 502 });
    }

    const bytes = Buffer.from(await result.Body.transformToByteArray());

    return new NextResponse(bytes, {
      headers: {
        "content-type": result.ContentType ?? "application/pdf",
        "content-disposition": `inline; filename="${item.sku ?? "spec-sheet"}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: `Failed to load PDF: ${message}` },
      { status: 500 },
    );
  }
}
