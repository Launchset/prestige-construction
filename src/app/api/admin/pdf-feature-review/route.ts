import { NextResponse } from "next/server";
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
const SCRAPE_REVIEW_PATH = path.join(
  process.cwd(),
  "scripts",
  "scraper",
  "scrape-review.json",
);

type ReviewStatus = "pending" | "approved" | "rejected";

type ReviewItem = {
  product_id?: string;
  sku?: string;
  url?: string | null;
  scraped_name?: string | null;
  scraped_features?: string[];
  existing_scraped_name?: string | null;
  existing_scraped_features?: string[];
  existing_scraped_features_count?: number;
  supplier_url?: string | null;
  pdf_extraction_method?: string;
  pdf_review_status?: ReviewStatus;
  pdf_reviewed_at?: string;
  extracted_features?: string[];
  extracted_features_count?: number;
};

type PatchBody =
  | {
      action: "reject";
      index: number;
    }
  | {
      action: "undo_reject";
      index: number;
    }
  | {
      action: "approve_remaining";
    }
  | {
      action: "remove_feature";
      index: number;
      featureIndex: number;
    }
  | {
      action: "use_supplier_features";
      index: number;
    }
  | {
      action: "allow_no_features";
      index: number;
    };

async function readItems() {
  const content = await fs.readFile(REVIEW_PATH, "utf8");
  const parsed = JSON.parse(content.replace(/^\uFEFF/, ""));
  const items = Array.isArray(parsed)
    ? parsed as ReviewItem[]
    : Array.isArray(parsed?.value)
      ? parsed.value as ReviewItem[]
      : null;

  if (!items) {
    throw new Error("Review file must contain a JSON array");
  }

  return items;
}

async function readScrapeReviewRows() {
  try {
    const content = await fs.readFile(SCRAPE_REVIEW_PATH, "utf8");
    const parsed = JSON.parse(content.replace(/^\uFEFF/, ""));

    return Array.isArray(parsed) ? parsed as ReviewItem[] : [];
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function readEnrichedItems() {
  const [items, scrapeRows] = await Promise.all([
    readItems(),
    readScrapeReviewRows(),
  ]);
  const scrapeByProductId = new Map(
    scrapeRows
      .filter((row) => row.product_id)
      .map((row) => [String(row.product_id), row]),
  );
  const scrapeBySku = new Map(
    scrapeRows
      .filter((row) => row.sku)
      .map((row) => [String(row.sku).trim().toUpperCase(), row]),
  );

  return items.map((item) => {
    const scrapeRow = scrapeByProductId.get(String(item.product_id ?? "")) ??
      scrapeBySku.get(String(item.sku ?? "").trim().toUpperCase());
    const scrapeFeatures = Array.isArray(scrapeRow?.existing_scraped_features)
      ? scrapeRow.existing_scraped_features
      : Array.isArray(scrapeRow?.scraped_features)
        ? scrapeRow.scraped_features
        : [];

    return {
      ...item,
      supplier_url: item.supplier_url ?? scrapeRow?.url ?? null,
      existing_scraped_name: item.existing_scraped_name ?? scrapeRow?.scraped_name ?? null,
      existing_scraped_features: Array.isArray(item.existing_scraped_features) && item.existing_scraped_features.length > 0
        ? item.existing_scraped_features
        : scrapeFeatures,
      existing_scraped_features_count: item.existing_scraped_features_count ?? scrapeFeatures.length,
    };
  });
}

async function writeItems(items: ReviewItem[]) {
  await fs.writeFile(REVIEW_PATH, `${JSON.stringify(items, null, 2)}\n`, "utf8");
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    return NextResponse.json(await readEnrichedItems(), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: `Failed to read pdf-feature-review.json: ${message}` },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as PatchBody;
    const items = await readItems();
    const now = new Date().toISOString();

    if (body.action === "approve_remaining") {
      for (const item of items) {
        if (item.pdf_review_status !== "rejected") {
          item.pdf_review_status = "approved";
          item.pdf_reviewed_at = now;
        }
      }
    } else if (body.action === "remove_feature") {
      const item = items[body.index] as ReviewItem & {
        extracted_features?: string[];
        extracted_features_count?: number;
        pdf_product_data?: { features?: string[] };
      };

      if (!item) {
        return NextResponse.json({ error: "Invalid index" }, { status: 400 });
      }

      if (!Array.isArray(item.extracted_features)) {
        return NextResponse.json({ error: "No extracted features on this row" }, { status: 400 });
      }

      if (body.featureIndex < 0 || body.featureIndex >= item.extracted_features.length) {
        return NextResponse.json({ error: "Invalid feature index" }, { status: 400 });
      }

      item.extracted_features = item.extracted_features.filter((_, index) => index !== body.featureIndex);
      item.extracted_features_count = item.extracted_features.length;

      if (item.pdf_product_data && Array.isArray(item.pdf_product_data.features)) {
        item.pdf_product_data.features = item.extracted_features;
      }

      item.pdf_review_status = "pending";
      item.pdf_reviewed_at = undefined;
    } else if (body.action === "use_supplier_features") {
      const item = items[body.index] as ReviewItem & {
        extracted_features?: string[];
        extracted_features_count?: number;
        pdf_product_data?: { features?: string[] };
      };

      if (!item) {
        return NextResponse.json({ error: "Invalid index" }, { status: 400 });
      }

      const supplierFeatures = Array.isArray(item.existing_scraped_features)
        ? item.existing_scraped_features.map((feature) => String(feature ?? "").trim()).filter(Boolean)
        : [];

      if (supplierFeatures.length === 0) {
        return NextResponse.json({ error: "No supplier features found for this row" }, { status: 400 });
      }

      item.extracted_features = supplierFeatures;
      item.extracted_features_count = supplierFeatures.length;

      if (item.pdf_product_data) {
        item.pdf_product_data.features = supplierFeatures;
      }

      item.pdf_extraction_method = "supplier_scrape";
      item.pdf_review_status = "pending";
      item.pdf_reviewed_at = undefined;
    } else if (body.action === "allow_no_features") {
      const item = items[body.index] as ReviewItem & {
        extracted_features?: string[];
        extracted_features_count?: number;
        pdf_product_data?: { features?: string[]; reason?: string };
        allow_no_features?: boolean;
      };

      if (!item) {
        return NextResponse.json({ error: "Invalid index" }, { status: 400 });
      }

      item.extracted_features = [];
      item.extracted_features_count = 0;
      item.allow_no_features = true;

      if (item.pdf_product_data) {
        item.pdf_product_data.features = [];
        item.pdf_product_data.reason = "Reviewer approved this product with no features.";
      }

      item.pdf_review_status = "pending";
      item.pdf_reviewed_at = undefined;
    } else {
      const item = items[body.index];

      if (!item) {
        return NextResponse.json({ error: "Invalid index" }, { status: 400 });
      }

      item.pdf_review_status = body.action === "reject" ? "rejected" : "pending";
      item.pdf_reviewed_at = body.action === "reject" ? now : undefined;
    }

    await writeItems(items);

    return NextResponse.json({
      items,
      counts: {
        approved: items.filter((item) => item.pdf_review_status === "approved").length,
        rejected: items.filter((item) => item.pdf_review_status === "rejected").length,
        pending: items.filter((item) => !item.pdf_review_status || item.pdf_review_status === "pending").length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: `Failed to update pdf-feature-review.json: ${message}` },
      { status: 500 },
    );
  }
}
