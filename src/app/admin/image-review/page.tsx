import ImageReviewClient from "./ImageReviewClient";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";

type ProductWithImages = {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  product_images: { id: string; sort_order: number | null }[] | null;
};

const SKIPPED_SORT_ORDER = -1;
const CONFIRMED_SKIPPED_SORT_ORDER = -2;

export default async function ImageReviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const supabase = createServiceClient();

  async function completeReview(productId: string, selectedIds: string[]) {
    "use server";

    const supabase = createServiceClient();

    const { error: resetError } = await supabase
      .from("product_images")
      .update({ sort_order: null })
      .eq("product_id", productId);

    if (resetError) throw new Error(resetError.message);

    for (let i = 0; i < selectedIds.length; i++) {
      const { error } = await supabase
        .from("product_images")
        .update({ sort_order: i + 1 })
        .eq("id", selectedIds[i])
        .eq("product_id", productId);

      if (error) throw new Error(error.message);
    }

    revalidatePath("/admin/image-review");
  }

  async function skipCategory(productId: string) {
    "use server";

    const supabase = createServiceClient();

    const { error } = await supabase
      .from("product_images")
      .update({ sort_order: CONFIRMED_SKIPPED_SORT_ORDER })
      .eq("product_id", productId)
      .eq("sort_order", SKIPPED_SORT_ORDER);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin/image-review");
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select(`
      id,
      sku,
      name,
      category_id,
      product_images(id, sort_order)
    `)
    .order("sku", { ascending: true });

  if (productsError || !products) {
    return (
      <div style={{ padding: 24 }}>
        Failed to load products: {productsError?.message ?? "Unknown error"}
      </div>
    );
  }

  const remainingProducts = (products as ProductWithImages[]).filter((product) =>
    Array.isArray(product.product_images) &&
    product.product_images.length > 0 &&
    product.product_images.some((image) => image.sort_order === SKIPPED_SORT_ORDER),
  );
  const product = remainingProducts[0] ?? null;

  if (!product) {
    return (
      <div style={{ padding: 24 }}>
        <h2>All product images reviewed</h2>
        <p>The media sorter has finished processing every skipped product.</p>
      </div>
    );
  }

  const { data: images, error: imagesError } = await supabase
    .from("product_images")
    .select("id, source_path, media_type, sort_order")
    .eq("product_id", product.id)
    .order("sort_order", { ascending: true, nullsFirst: true });

  if (imagesError) {
    return (
      <div style={{ padding: 24 }}>
        Error loading images: {imagesError.message}
      </div>
    );
  }

  return (
    <ImageReviewClient
      key={product.id}
      product={product}
      images={images ?? []}
      remainingProducts={remainingProducts.length}
      completeReview={completeReview}
      skipCategory={skipCategory}
    />
  );
}
