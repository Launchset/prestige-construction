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
  sku: string;
  category_id: string | null;
  scraped_name: string | null;
  scraped_price: number | null;
  scraped_features: string[] | null;
  scraped_description: string | null;
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
      id,
      name,
      slug,
      sku,
      category_id,
      scraped_name,
      scraped_price,
      scraped_features,
      scraped_description,
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

  const typedProduct = product as Product;
  const displayName = typedProduct.scraped_name?.trim() || typedProduct.name;
  const displayFeatures = Array.isArray(typedProduct.scraped_features)
    ? typedProduct.scraped_features.filter(Boolean)
    : [];
  const displayImages = (typedProduct.product_images ?? [])
    .filter((image) => typeof image.sort_order === "number" && image.sort_order > 0)
    .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER));

  let category: Category | null = null;
  if (typedProduct.category_id) {
    const { data } = await supabase
      .from("categories")
      .select("name, slug")
      .eq("id", typedProduct.category_id)
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
        <span>{typedProduct.sku}</span>
      </nav>

      <section className={styles.productHero}>
        <div className={styles.productCopy}>
          <p className={styles.productEyebrow}>{category?.name ?? "Product"}</p>
          <h1 className={styles.heading}>{typedProduct.sku}</h1>
          {displayName !== typedProduct.sku ? (
            <p className={styles.productSubtitle}>{displayName}</p>
          ) : null}

          <div className={styles.productMetaRow}>
            <div className={styles.productMetaCard}>
              <span className={styles.metaLabel}>SKU</span>
              <strong>{typedProduct.sku}</strong>
            </div>

            {typeof typedProduct.scraped_price === "number" ? (
              <div className={styles.productMetaCard}>
                <span className={styles.metaLabel}>Price</span>
                <strong>
                  {new Intl.NumberFormat("en-GB", {
                    style: "currency",
                    currency: "GBP"
                  }).format(typedProduct.scraped_price)}
                </strong>
              </div>
            ) : null}

            <div className={styles.productMetaCard}>
              <span className={styles.metaLabel}>Images</span>
              <strong>{displayImages.length}</strong>
            </div>
          </div>

          {typedProduct.scraped_description ? (
            <div className={styles.productPanel}>
              <h2 className={styles.panelTitle}>Overview</h2>
              <p className={styles.productDescription}>{typedProduct.scraped_description}</p>
            </div>
          ) : null}

          {displayFeatures.length > 0 ? (
            <div className={styles.productPanel}>
              <h2 className={styles.panelTitle}>Key Features</h2>
              <ul className={styles.featureList}>
                {displayFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <ProductGallery
          images={displayImages as ProductImage[]}
          productName={displayName}
        />
      </section>
    </main>
  );
}
