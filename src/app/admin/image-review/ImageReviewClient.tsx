"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import styles from "./styles.module.css";

type SectionKey = "lifestyle" | "product" | "specs" | "drawings" | "other";

type Section = {
  key: SectionKey;
  label: string;
};

const SECTIONS: Section[] = [
  { key: "lifestyle", label: "Lifestyle" },
  { key: "product", label: "Product" },
  { key: "specs", label: "Specs" },
  { key: "drawings", label: "Drawings" },
  { key: "other", label: "Other" },
];

const ASSETS_BASE = process.env.NEXT_PUBLIC_ASSETS_BASE?.replace(/\/+$/, "") ?? "";

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
    .filter((img) => typeof img.sort_order === "number" && img.sort_order > 0)
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
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>(() => getInitialSelectedIds(images));
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

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

  function getWorkerImageSrc(sourcePath: string) {
    if (!ASSETS_BASE) {
      return null;
    }

    return `${ASSETS_BASE}/i/${sourcePath}?w=500&q=75`;
  }

  function getProxyImageSrc(sourcePath: string) {
    return `/api/admin/image-review/asset?key=${encodeURIComponent(sourcePath)}`;
  }

  function saveAndContinue() {
    if (selectedIds.length === 0) {
      setActionError("Select at least one image before saving.");
      return;
    }

    setActionError(null);
    startTransition(async () => {
      try {
        await completeReview(product.id, selectedIds);
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Failed to save image selection.");
      }
    });
  }

  function skipAndContinue() {
    setActionError(null);
    startTransition(async () => {
      try {
        await skipCategory(product.id);
        router.refresh();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Failed to skip product.");
      }
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
              {remainingProducts} skipped products remaining
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

                  const workerSrc = getWorkerImageSrc(image.source_path);
                  const proxySrc = getProxyImageSrc(image.source_path);
                  const isPdf = image.source_path.toLowerCase().endsWith(".pdf");

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
                        {isPdf ? (
                          <div className={styles.pdfTile}>
                            <span>PDF</span>
                            <small>{image.source_path.split("/").pop()}</small>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={workerSrc ?? proxySrc}
                            alt=""
                            className={styles.assetImage}
                            loading="lazy"
                            onError={(event) => {
                              if (event.currentTarget.src !== proxySrc) {
                                event.currentTarget.src = proxySrc;
                              }
                            }}
                          />
                        )}
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

      {actionError && <p className={styles.actionError}>{actionError}</p>}

      <button
        type="button"
        className={styles.saveButton}
        disabled={isPending}
        onClick={saveAndContinue}
      >
        {isPending ? "Saving..." : "Save & Continue"}
      </button>

      <button
        type="button"
        className={styles.skipButton}
        disabled={isPending}
        onClick={skipAndContinue}
      >
        {isPending ? "Working..." : "Skip Category"}
      </button>
    </div>
  );
}
