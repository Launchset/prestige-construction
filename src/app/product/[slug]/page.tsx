import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGallery from "@/app/components/catalogue/ProductGallery";
import styles from "@/app/components/catalogue/catalogue.module.css";
import { createClient } from "@/lib/supabase/server";

type ProductRouteProps = {
  params: Promise<{ slug: string }>;
};

type ProductImage = {
  source_path: string;
  sort_order: number | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  product_images: ProductImage[] | null;
};

type Category = {
  name: string;
  slug: string;
};

export default async function ProductPage({ params }: ProductRouteProps) {
  const { slug } = await params;
  const supabase = createClient();

  const { data: product } = await supabase
    .from("products")
    .select(`
      *,
      product_images(
        source_path,
        sort_order
      )
    `)
    .eq("slug", slug)
    .single();

  if (!product) {
    notFound();
  }

  let category: Category | null = null;
  if (product.category_id) {
    const { data } = await supabase
      .from("categories")
      .select("name, slug")
      .eq("id", product.category_id)
      .maybeSingle();

    category = (data as Category | null) ?? null;
  }

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        {category ? (
          <>
            <Link href={`/${category.slug}`}>{category.name}</Link>
            <span>/</span>
          </>
        ) : null}
        <span>{product.name}</span>
      </nav>

      <h1 className={styles.heading}>{product.name}</h1>
      <ProductGallery
        images={((product as Product).product_images ?? []) as ProductImage[]}
        productName={product.name}
      />
    </main>
  );
}
