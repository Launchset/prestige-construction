import ImageReviewClient from "./ImageReviewClient";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";

export default async function ImageReviewPage() {
  // Keep the image-review tool in the repo for local use, but hide it from production deploys.
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const supabase = createServiceClient();

  async function completeReview(productId: string, selectedIds: string[]) {
    "use server";

    const supabase = createServiceClient();

    // reset only the images we are ordering
    const { error: resetError } = await supabase
      .from("product_images")
      .update({ sort_order: null })
      .in("id", selectedIds);

    if (resetError) throw new Error(resetError.message);

    // assign new order
    for (let i = 0; i < selectedIds.length; i++) {
      const { error } = await supabase
        .from("product_images")
        .update({ sort_order: i + 1 })
        .eq("id", selectedIds[i]);

      if (error) throw new Error(error.message);
    }

    revalidatePath("/admin/image-review");
  }

  async function skipCategory(productId: string) {
    "use server";

    const supabase = createServiceClient();

    // mark this product as skipped so the category counts as reviewed
    const { data: skippedRows, error } = await supabase
      .from("product_images")
      .update({ sort_order: -1 }) // special value = skipped
      .eq("product_id", productId)
      .limit(1)
      .select("id, product_id, sort_order");

    console.info("[image-review] skipCategory", {
      productId,
      skippedRows,
      skipError: error?.message ?? null,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin/image-review");
  }

  // get all categories
  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, parent_id");

  if (categoriesError || !categories) {
    return <div style={{ padding: 24 }}>Failed to load categories.</div>;
  }

  // find leaf categories (categories that are not parents)
  const parentIds = new Set(
    categories.map((c) => c.parent_id).filter(Boolean)
  );

  const leafCategories = categories.filter((c) => !parentIds.has(c.id));
  console.info(
    "[image-review] leafCategories",
    leafCategories.map((c) => ({
      id: c.id,
      parent: c.parent_id,
    }))
  );

  if (leafCategories.length === 0) {
    return <div style={{ padding: 24 }}>No leaf categories found.</div>;
  }


  // find categories that already have reviewed images
  const { data: reviewedCategories } = await supabase
    .from("products")
    .select(`
    category_id,
    product_images!inner(sort_order)
  `)
    .not("product_images.sort_order", "is", null)
    .in("category_id", leafCategories.map(c => c.id));

  const reviewedCategoryIds = new Set(
    reviewedCategories?.map(p => p.category_id)
  );


  // determine remaining leaf categories
  const remainingLeafCategories = leafCategories.filter(
    c => !reviewedCategoryIds.has(c.id)
  );
  console.info(
    "[image-review] remainingLeafCategories",
    remainingLeafCategories.map((c) => c.id)
  );

  const remainingProducts = remainingLeafCategories.length;

  if (remainingLeafCategories.length === 0) {
    return <div style={{ padding: 24 }}>All categories reviewed 🎉</div>;
  }


  // pick the next category to process
  const currentCategory = remainingLeafCategories[0];
  console.info("[image-review] currentCategory", currentCategory);


  // fetch ONE product from the first non-empty remaining category
  let product: { id: string; sku: string; name: string; category_id: string } | null = null;
  let activeCategory: { id: string; parent_id: string | null } | null = null;
  let lastProductError: string | null = null;

  for (const category of remainingLeafCategories) {
    console.info(
      "[image-review] querying products with category_id =",
      category.id
    );

    const { data, error: productError } = await supabase
      .from("products")
      .select("id, sku, name, category_id")
      .eq("category_id", category.id)
      .limit(1);

    lastProductError = productError?.message ?? null;

    if (data && data.length > 0) {
      product = data[0];
      activeCategory = category;
      break;
    }

    if (!productError) {
      console.info("[image-review] skipping empty category", category.id);
    }
  }

  console.info("[image-review] product query result", {
    product,
    activeCategory,
    productError: lastProductError,
  });

  if (!product) {
    console.info("[image-review] review complete");

    return (
      <div style={{ padding: 24 }}>
        <h2>All products reviewed 🎉</h2>
        <p>The media sorter has finished processing all categories.</p>
      </div>
    );
  }


  // fetch images for that product
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


  // render review tool
  return (
    <ImageReviewClient
      product={product}
      images={images ?? []}
      remainingProducts={remainingProducts}
      completeReview={completeReview}
      skipCategory={skipCategory}
    />
  );
}
