import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGallery from "@/app/components/catalogue/ProductGallery";
import styles from "./product-page.module.css";
import { createClient } from "@/lib/supabase/server";

const ASSETS_BASE = process.env.NEXT_PUBLIC_ASSETS_BASE?.replace(/\/+$/, "") ?? "";

function normalizeAssetPath(path: string) {
  return path.replace(/^web\//i, "");
}

function getApprovedImages(images: ProductImage[] | null | undefined) {
  return [...(images ?? [])]
    .filter((image) => typeof image.sort_order === "number" && image.sort_order > 0)
    .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER));
}

type ProductRouteProps = {
  params: Promise<{ slug: string }>;
};

type ProductImage = {
  source_path: string;
  media_type: string | null;
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
        media_type,
        sort_order
      )
    `)
    .eq("slug", slug)
    .single();

  if (!product) {
    notFound();
  }

  const typedProduct = product as Product;
  const displayImages = getApprovedImages(typedProduct.product_images);
  const primaryImage = displayImages[0];

  if (!typedProduct.scraped_name?.trim() || !primaryImage) {
    notFound();
  }

  const displayName = typedProduct.scraped_name;
  const displayFeatures = Array.isArray(typedProduct.scraped_features)
    ? typedProduct.scraped_features.filter(Boolean)
    : [];
  const specSheet = (typedProduct.product_images ?? []).find((image) =>
    image.media_type === "Spec Sheet" && image.source_path.toLowerCase().endsWith(".pdf")
  );
  const specSheetUrl = specSheet && ASSETS_BASE
    ? `${ASSETS_BASE}/i/${normalizeAssetPath(specSheet.source_path)}`
    : null;

  let category: Category | null = null;
  if (typedProduct.category_id) {
    const { data } = await supabase
      .from("categories")
      .select("name, slug")
      .eq("id", typedProduct.category_id)
      .maybeSingle();

    category = (data as Category | null) ?? null;
  }

  const enquiryHref = `/enquire?productSlug=${encodeURIComponent(typedProduct.slug)}&productName=${encodeURIComponent(displayName)}&image=${encodeURIComponent(primaryImage.source_path)}`;

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
          <h1 className={styles.heading}>{displayName}</h1>

          <div className={styles.productMetaRow}>
            {specSheetUrl ? (
              <a
                href={specSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.productMetaCard}
              >
                <span className={styles.metaLabel}>Spec Sheet</span>
                <div className={styles.downloadRow}>
                  <img
                    src="/icons/downloadlogo.webp"
                    alt=""
                    aria-hidden="true"
                    width="34"
                    height="34"
                    className={styles.downloadIconImage}
                  />
                  <strong>Download spec sheet</strong>
                </div>
              </a>
            ) : null}

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

        <div className={styles.galleryWrapper}>
          <div className={styles.galleryInner}>
            <ProductGallery
              images={displayImages}
              productName={displayName}
            />
          </div>

          <a href={enquiryHref} className={styles.enquireButton}>
            Enquire Now
          </a>
        </div>
      </section>
    </main>
  );
}
