import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

function createR2Client() {
  config({ path: ".env.import", override: true });

  return new S3Client({
    region: "auto",
    endpoint: `https://${getEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: getEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

function stripKnownBulletPrefix(value: string) {
  return value
    .replace(/^Ã¢â‚¬Â¢/, "")
    .replace(/^â€¢/, "")
    .replace(/^•/, "")
    .trim();
}

function buildCandidateKeys(rawKey: string) {
  const stripped = stripKnownBulletPrefix(rawKey);
  const candidates = [
    rawKey,
    rawKey.replace(/^Ã¢â‚¬Â¢/, "â€¢"),
    rawKey.replace(/^Ã¢â‚¬Â¢/, "•"),
    stripped,
    stripped ? `â€¢${stripped}` : "",
    stripped ? `•${stripped}` : "",
  ];

  return [...new Set(candidates.filter(Boolean))];
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const key = request.nextUrl.searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  try {
    const r2 = createR2Client();
    let result = null;
    let lastError: unknown = null;

    for (const candidateKey of buildCandidateKeys(key)) {
      try {
        result = await r2.send(
          new GetObjectCommand({
            Bucket: getEnv("R2_BUCKET"),
            Key: candidateKey,
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
        : new Error("Unable to resolve asset key");
    }

    if (!result.Body) {
      return NextResponse.json({ error: "Asset body was empty" }, { status: 502 });
    }

    const bytes = Buffer.from(await result.Body.transformToByteArray());

    return new NextResponse(bytes, {
      headers: {
        "content-type": result.ContentType ?? "application/octet-stream",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: `Failed to load asset: ${message}` },
      { status: 500 },
    );
  }
}
