import { notFound, permanentRedirect } from "next/navigation";
import CategoryGrid from "@/app/components/catalogue/CategoryGrid";
import ProductGrid from "@/app/components/catalogue/ProductGrid";
import styles from "@/app/components/catalogue/catalogue.module.css";
import { createClient } from "@/lib/supabase/server";
import { getLegacyCategoryRedirect } from "@/lib/categoryRoutes";

type CategoryRouteProps = {
  params: Promise<{ category: string }>;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
};

type CategoryGridItem = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
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
  scraped_name: string | null;
  product_images: ProductImage[] | null;
};

function getApprovedImages(images: ProductImage[] | null | undefined) {
  return [...(images ?? [])]
    .filter((image) => typeof image.sort_order === "number" && image.sort_order > 0)
    .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER));
}

function isPublishedProduct(product: { scraped_name: string | null; product_images: ProductImage[] | null }) {
  return Boolean(product.scraped_name?.trim()) && getApprovedImages(product.product_images).length > 0;
}

export default async function CategoryPage({ params }: CategoryRouteProps) {
  const { category: categorySlug } = await params;
  const redirectSlug = getLegacyCategoryRedirect(categorySlug);

  if (redirectSlug) {
    permanentRedirect(`/${redirectSlug}`);
  }

  const supabase = createClient();

  const { data: category } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", categorySlug)
    .maybeSingle();

  if (!category) {
    notFound();
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("id", { ascending: true });

  const allCategories = (categories ?? []) as Category[];
  const childrenByParent = new Map<string | null, Category[]>();

  for (const item of allCategories) {
    const siblings = childrenByParent.get(item.parent_id) ?? [];
    siblings.push(item);
    childrenByParent.set(item.parent_id, siblings);
  }

  const categoryIdsInScope = new Set<string>();
  const categoriesToVisit = [category.id];

  while (categoriesToVisit.length > 0) {
    const currentCategoryId = categoriesToVisit.pop();

    if (!currentCategoryId || categoryIdsInScope.has(currentCategoryId)) {
      continue;
    }

    categoryIdsInScope.add(currentCategoryId);

    for (const childCategory of childrenByParent.get(currentCategoryId) ?? []) {
      categoriesToVisit.push(childCategory.id);
    }
  }

  const { data: products } = await supabase
    .from("products")
    .select(`
      id,
      name,
      slug,
      category_id,
      scraped_name,
      product_images(
        source_path,
        sort_order
      )
    `)
    .in("category_id", [...categoryIdsInScope])
    .order("id", { ascending: true });

  const publishedProducts = ((products ?? []) as Product[]).filter(isPublishedProduct);
  const publishedProductsByCategory = new Map<string, Product[]>();

  for (const product of publishedProducts) {
    if (!product.category_id) {
      continue;
    }

    const categoryProducts = publishedProductsByCategory.get(product.category_id) ?? [];
    categoryProducts.push(product);
    publishedProductsByCategory.set(product.category_id, categoryProducts);
  }

  const representativeProductCache = new Map<string, Product | null>();

  function findRepresentativeProduct(categoryId: string): Product | null {
    if (representativeProductCache.has(categoryId)) {
      return representativeProductCache.get(categoryId) ?? null;
    }

    const directProduct = (publishedProductsByCategory.get(categoryId) ?? [])[0] ?? null;
    if (directProduct) {
      representativeProductCache.set(categoryId, directProduct);
      return directProduct;
    }

    for (const childCategory of childrenByParent.get(categoryId) ?? []) {
      const descendantProduct = findRepresentativeProduct(childCategory.id);
      if (descendantProduct) {
        representativeProductCache.set(categoryId, descendantProduct);
        return descendantProduct;
      }
    }

    representativeProductCache.set(categoryId, null);
    return null;
  }

  const safeProducts = publishedProductsByCategory.get(category.id) ?? [];
  const categoriesForUi: CategoryGridItem[] = (childrenByParent.get(category.id) ?? [])
    .map((subcategory) => {
      const representativeProduct = findRepresentativeProduct(subcategory.id);
      const bestImage = representativeProduct
        ? getApprovedImages(representativeProduct.product_images)[0]
        : null;

      return {
        id: subcategory.id,
        name: subcategory.name,
        slug: subcategory.slug,
        image: bestImage?.source_path ?? null,
      };
    })
    .filter((subcategory) => subcategory.image !== null);

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>{category.name}</h1>

      {categoriesForUi.length > 0 && (
        <section className={styles.section}>
          <CategoryGrid categories={categoriesForUi} />
        </section>
      )}

      {safeProducts.length > 0 && (
        <section className={styles.section}>
          <ProductGrid products={safeProducts} />
        </section>
      )}
    </main>
  );
}
