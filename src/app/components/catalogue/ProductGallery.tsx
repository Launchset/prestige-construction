import Image from "next/image";
import styles from "./catalogue.module.css";

const BASE = process.env.NEXT_PUBLIC_ASSETS_BASE?.replace(/\/+$/, "") ?? "";

type GalleryImage = {
  source_path: string;
  sort_order: number | null;
};

type ProductGalleryProps = {
  images: GalleryImage[];
  productName: string;
};

function getImageUrl(sourcePath: string, width = 1200, quality = 80) {
  return `${BASE}/i/${sourcePath}?w=${width}&q=${quality}`;
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const sorted = [...images]
    .filter((image) => typeof image.sort_order === "number" && image.sort_order > 0)
    .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER));

  if (!sorted.length) {
    return <div className={styles.emptyState}>No product images available.</div>;
  }

  const [primaryImage, ...secondaryImages] = sorted;

  return (
    <section className={styles.productGallery}>
      <div className={styles.galleryHero}>
        <div className={styles.galleryItem}>
          <Image
            src={getImageUrl(primaryImage.source_path)}
            alt={productName}
            className={styles.galleryImage}
            width={1200}
            height={900}
            priority
          />
        </div>
      </div>

      {secondaryImages.length > 0 ? (
        <div className={styles.galleryGrid}>
          {secondaryImages.map((image) => (
            <div key={image.source_path} className={styles.galleryItem}>
              <Image
                src={getImageUrl(image.source_path)}
                alt={productName}
                className={styles.galleryImage}
                width={800}
                height={600}
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
