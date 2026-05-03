import type { MetadataRoute } from "next";
import { getLegacyCategoryRedirect } from "@/lib/categoryRoutes";

const siteUrl = process.env.SITE_URL?.replace(/\/+$/, "") || "http://localhost:3000";

type Category = {
  slug: string;
};

type ProductImage = {
  sort_order: number | null;
};

type Product = {
  slug: string;
  scraped_name: string | null;
  product_images: ProductImage[] | null;
};

function hasApprovedImage(images: ProductImage[] | null | undefined) {
  return (images ?? []).some((image) => typeof image.sort_order === "number" && image.sort_order > 0);
}

function entry(url: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]) {
  return {
    url: `${siteUrl}${url}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    entry("/", 1, "weekly"),
    entry("/gallery", 0.9, "monthly"),
    entry("/about", 0.8, "monthly"),
    entry("/enquire", 0.9, "monthly"),
    entry("/privacy-policy", 0.2, "yearly"),
    entry("/cookie-policy", 0.2, "yearly"),
    entry("/terms-and-conditions", 0.2, "yearly"),
    entry("/returns-policy", 0.2, "yearly"),
  ];

  let categories: Category[] = [];
  let products: Product[] = [];

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();

    const [{ data: categoryData }, { data: productData }] = await Promise.all([
      supabase.from("categories").select("slug").order("slug", { ascending: true }),
      supabase
        .from("products")
        .select(`
          slug,
          scraped_name,
          product_images(sort_order)
        `)
        .order("slug", { ascending: true }),
    ]);

    categories = (categoryData ?? []) as Category[];
    products = (productData ?? []) as Product[];
  } catch (error) {
    console.warn("Sitemap generated with static routes only.", error);
  }

  const categoryRoutes = categories
    .map((category) => getLegacyCategoryRedirect(category.slug) ?? category.slug)
    .filter((slug, index, slugs) => slugs.indexOf(slug) === index)
    .map((slug) => entry(`/${slug}`, 0.8, "weekly"));

  const productRoutes = products
    .filter((product) => product.scraped_name?.trim() && hasApprovedImage(product.product_images))
    .map((product) => entry(`/product/${product.slug}`, 0.7, "weekly"));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
