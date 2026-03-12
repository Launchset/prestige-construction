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
  const sorted = [...images].sort(
    (a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER)
  );

  if (!sorted.length) {
    return <div className={styles.emptyState}>No product images available.</div>;
  }

  return (
    <div className={styles.galleryGrid}>
      {sorted.map((image) => (
        <div key={image.source_path} className={styles.galleryItem}>
          <Image
            src={getImageUrl(image.source_path)}
            alt={productName}
            className={styles.galleryImage}
            width={1200}
            height={900}
          />
        </div>
      ))}
    </div>
  );
}
