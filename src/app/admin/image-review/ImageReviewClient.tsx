"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import styles from "./styles.module.css";

type SectionKey = "lifestyle" | "product" | "specs" | "drawings" | "other";

type Section = {
  key: SectionKey;
  label: string;
};

const BASE = process.env.NEXT_PUBLIC_ASSETS_BASE?.replace(/\/+$/, "") ?? "";

const SECTIONS: Section[] = [
  { key: "lifestyle", label: "Lifestyle" },
  { key: "product", label: "Product" },
  { key: "specs", label: "Specs" },
  { key: "drawings", label: "Drawings" },
  { key: "other", label: "Other" },
];

type ImageItem = {
  id: string;
  source_path: string;
  media_type: string | null;
  sort_order: number | null;
};

type ProductItem = { id: string; sku: string; name: string };

type ImageReviewClientProps = {
  product: ProductItem;
  images: ImageItem[];
  remainingProducts: number;
  completeReview: (productId: string, selectedIds: string[]) => Promise<void>;
  skipCategory: (productId: string) => Promise<void>;
};

function toSectionKeyFromMediaType(mediaType: string | null): SectionKey {
  const s = (mediaType ?? "").trim().toLowerCase();

  if (s === "lifestyle") return "lifestyle";
  if (s === "product shot") return "product";
  if (s === "spec sheet") return "specs";
  if (s === "technical drawing") return "drawings";

  return "other";
}

function getInitialSelectedIds(images: ImageItem[]) {
  return (images ?? [])
    .filter((img) => img.sort_order !== null)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img) => img.id);
}

export default function ImageReviewClient({
  product,
  images,
  remainingProducts,
  completeReview,
  skipCategory,
}: ImageReviewClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => getInitialSelectedIds(images));

  const selectedOrder = useMemo(
    () => new Map(selectedIds.map((id, index) => [id, index + 1])),
    [selectedIds],
  );

  const imagesBySection = useMemo(() => {
    const grouped: Record<SectionKey, ImageItem[]> = {
      lifestyle: [],
      product: [],
      specs: [],
      drawings: [],
      other: [],
    };

    for (const image of images) {
      grouped[toSectionKeyFromMediaType(image.media_type)].push(image);
    }

    return grouped;
  }, [images]);

  function toggleSelection(imageId: string) {
    setSelectedIds((prev) =>
      prev.includes(imageId)
        ? prev.filter((id) => id !== imageId)
        : [...prev, imageId],
    );
  }

  function logCompleteReviewSubmit() {
    console.info("[image-review] submit", {
      productId: product.id,
      selectedIds,
      selectedCount: selectedIds.length,
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.metaLabel}>Product Name</p>
          <h1 className={styles.title}>{product.name}</h1>
        </div>

        <div className={styles.metaGrid}>
          <div className={styles.metaCard}>
            <p className={styles.metaLabel}>SKU</p>
            <p className={styles.metaValue}>{product.sku}</p>
          </div>

          <div className={styles.metaCard}>
            <p className={styles.metaLabel}>Progress</p>
            <p className={styles.metaValue}>
              {remainingProducts} products remaining
            </p>
          </div>
        </div>
      </header>

      <div className={styles.sections}>
        {SECTIONS.map((section) => {
          const sectionImages = imagesBySection[section.key];

          return (
            <section key={section.key} className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{section.label}</h2>
                <span className={styles.sectionCount}>
                  {sectionImages.length}
                </span>
              </div>

              <div className={styles.grid}>
                {sectionImages.map((image) => {
                  const order = selectedOrder.get(image.id);
                  const isSelected = order !== undefined;

                  const src = `${BASE}/i/${image.source_path}?w=400&q=75`;

                  return (
                    <button
                      key={image.id}
                      type="button"
                      className={`${styles.card} ${isSelected ? styles.cardSelected : ""
                        }`}
                      onClick={() => toggleSelection(image.id)}
                      aria-pressed={isSelected}
                    >
                      <div className={styles.imageWrap}>
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes="220px"
                          style={{ objectFit: "cover" }}
                          loading="lazy"
                        />
                      </div>

                      <div className={styles.cardFooter}>
                        <span className={styles.cardLabel}>
                          {section.label}
                        </span>

                        <span className={styles.cardId}>
                          {image.source_path.split("/").pop()}
                        </span>
                      </div>

                      {isSelected && (
                        <span
                          className={styles.badge}
                          aria-label={`Selection order ${order}`}
                        >
                          {order}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <form
        action={completeReview.bind(null, product.id, selectedIds)}
        onSubmit={logCompleteReviewSubmit}
      >
        <button className={styles.saveButton}>
          Save & Continue
        </button>
      </form>

      <form action={skipCategory.bind(null, product.id)}>
        <button className={styles.skipButton}>
          Skip Category
        </button>
      </form>
    </div>
  );
}
