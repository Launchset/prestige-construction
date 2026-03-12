import { notFound } from "next/navigation";
import CategoryGrid from "@/app/components/catalogue/CategoryGrid";
import ProductGrid from "@/app/components/catalogue/ProductGrid";
import styles from "@/app/components/catalogue/catalogue.module.css";
import { createClient } from "@/lib/supabase/server";

type CategoryRouteProps = {
  params: Promise<{ category: string }>;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
};

type ProductImage = {
  source_path: string;
  sort_order: number | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  product_images: ProductImage[] | null;
};

export default async function CategoryPage({ params }: CategoryRouteProps) {
  const { category: categorySlug } = await params;
  const supabase = createClient();

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", categorySlug)
    .single();

  if (!category) {
    notFound();
  }

  const { data: subcategories } = await supabase
    .from("categories")
    .select("*")
    .eq("parent_id", category.id);

  const { data: products } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      product_images(
        source_path,
        sort_order
      )
    `)
    .eq("category_id", category.id);

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>{category.name}</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Subcategories</h2>
        <CategoryGrid categories={(subcategories ?? []) as Category[]} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Products</h2>
        <ProductGrid products={(products ?? []) as Product[]} />
      </section>
    </main>
  );
}
