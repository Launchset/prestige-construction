import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLegacyCategoryRedirect } from "@/lib/categoryRoutes";
import styles from "./categories.module.css";

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
    category_id: string | null;
    scraped_name: string | null;
    product_images: ProductImage[] | null;
};

const EXPAND_CATEGORY_SLUGS = new Set(["sinks-taps"]);

function getApprovedImages(images: ProductImage[] | null | undefined) {
    return [...(images ?? [])]
        .filter((image) => typeof image.sort_order === "number" && image.sort_order > 0)
        .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER));
}

function isPublishedProduct(product: Product) {
    return Boolean(product.scraped_name?.trim()) && getApprovedImages(product.product_images).length > 0;
}

export default async function Categories() {
    const supabase = createClient();

    const [{ data: categories }, { data: products }] = await Promise.all([
        supabase
            .from("categories")
            .select("id, name, slug, parent_id")
            .order("name", { ascending: true }),
        supabase
            .from("products")
            .select(`
                id,
                category_id,
                scraped_name,
                product_images(
                    source_path,
                    sort_order
                )
            `)
            .order("id", { ascending: true }),
    ]);

    const allCategories = (categories ?? []) as Category[];
    const publishedProducts = ((products ?? []) as Product[]).filter(isPublishedProduct);

    if (!allCategories.length || !publishedProducts.length) {
        return null;
    }

    const childrenByParent = new Map<string | null, Category[]>();
    for (const category of allCategories) {
        const siblings = childrenByParent.get(category.parent_id) ?? [];
        siblings.push(category);
        childrenByParent.set(category.parent_id, siblings);
    }

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

    const topLevelCategories = (childrenByParent.get(null) ?? [])
        .flatMap((category) => {
            const displayCategories = EXPAND_CATEGORY_SLUGS.has(category.slug)
                ? childrenByParent.get(category.id) ?? [category]
                : [category];

            return displayCategories.map((displayCategory) => {
                const representativeProduct = findRepresentativeProduct(displayCategory.id);
                const image = representativeProduct
                    ? getApprovedImages(representativeProduct.product_images)[0]?.source_path ?? null
                    : null;
                const resolvedSlug = getLegacyCategoryRedirect(displayCategory.slug) ?? displayCategory.slug;

                return {
                    id: displayCategory.id,
                    name: displayCategory.name,
                    slug: resolvedSlug,
                    image,
                };
            });
        })
        .filter((category) => category.image !== null);

    if (!topLevelCategories.length) {
        return null;
    }

    return (
        <section className={styles.categories}>
            <div className={styles.inner}>
                <h2 className={styles.title}>Explore Our Categories</h2>
                <p className={styles.subtitle}>
                    Discover our carefully curated ranges, designed to inspire and guide
                    your project.
                </p>

                <div className={styles.grid}>
                    {topLevelCategories.map((category) => (
                        <Link key={category.id} href={`/${category.slug}`} className={styles.card}>
                            <Image
                                src={category.image as string}
                                alt={category.name}
                                fill
                                className={styles.image}
                                sizes="(max-width: 1024px) 100vw, 33vw"
                            />
                            <div className={styles.overlay}>
                                <h3>{category.name}</h3>
                                <span>Browse {category.name} →</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
