import { createClient } from "@/lib/supabase/server";

const ASSETS_BASE = process.env.NEXT_PUBLIC_ASSETS_BASE?.replace(/\/+$/, "") ?? "";

function normalizeAssetPath(path: string) {
  return path.replace(/^web\//i, "");
}

type ProductImageRow = {
  source_path: string;
  sort_order: number | null;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  scraped_name: string | null;
  scraped_price: number | null;
  product_images: ProductImageRow[] | null;
};

export type CheckoutProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  price: number | null;
  priceInPence: number | null;
  primaryImagePath: string | null;
  primaryImageUrl: string | null;
};

export async function getCheckoutProductBySlug(slug: string): Promise<CheckoutProduct | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      sku,
      scraped_name,
      scraped_price,
      product_images(
        source_path,
        sort_order
      )
    `)
    .eq("slug", slug)
    .single();

  if (!data) {
    return null;
  }

  const product = data as ProductRow;
  const primaryImage = [...(product.product_images ?? [])]
    .filter((image) => typeof image.sort_order === "number" && image.sort_order > 0)
    .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER))[0];
  const displayName = product.scraped_name?.trim() || product.name;
  const price = typeof product.scraped_price === "number" ? product.scraped_price : null;

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: displayName,
    price,
    priceInPence: price === null ? null : Math.round(price * 100),
    primaryImagePath: primaryImage?.source_path ?? null,
    primaryImageUrl: primaryImage?.source_path && ASSETS_BASE
      ? `${ASSETS_BASE}/i/${normalizeAssetPath(primaryImage.source_path)}`
      : null,
  };
}
