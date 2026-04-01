"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./catalogue.module.css";

type GalleryImage = {
  source_path: string;
  sort_order: number | null;
};

type ProductGalleryProps = {
  images: GalleryImage[];
  productName: string;
};

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const sorted = [...images]
    .filter((image) => typeof image.sort_order === "number" && image.sort_order > 0)
    .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER));

  const [activeIndex, setActiveIndex] = useState(0);

  if (!sorted.length) {
    return <div className={styles.emptyState}>No product images available.</div>;
  }

  const activeImage = sorted[Math.min(activeIndex, sorted.length - 1)];

  function showPrevious() {
    setActiveIndex((current) => (current === 0 ? sorted.length - 1 : current - 1));
  }

  function showNext() {
    setActiveIndex((current) => (current === sorted.length - 1 ? 0 : current + 1));
  }

  return (
    <section className={styles.productGallery}>
      <div className={styles.galleryHero}>
        <div className={styles.galleryItem}>
          <Image
            key={activeImage.source_path}
            src={activeImage.source_path}
            alt={productName}
            className={styles.galleryImage}
            width={1200}
            height={900}
            sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 1200px) 60vw, 900px"
            quality={80}
            preload
          />
        </div>

        {sorted.length > 1 ? (
          <>
            <button
              type="button"
              className={`${styles.galleryArrow} ${styles.galleryArrowLeft}`}
              onClick={showPrevious}
              aria-label="Show previous image"
            >
              ‹
            </button>

            <button
              type="button"
              className={`${styles.galleryArrow} ${styles.galleryArrowRight}`}
              onClick={showNext}
              aria-label="Show next image"
            >
              ›
            </button>
          </>
        ) : null}
      </div>

      {sorted.length > 1 ? (
        <div className={styles.galleryDots}>
          {sorted.map((image, index) => (
            <button
              key={image.source_path}
              type="button"
              className={`${styles.galleryDot} ${index === activeIndex ? styles.galleryDotActive : ""}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show image ${index + 1}`}
              aria-pressed={index === activeIndex}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
