import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./gallery.module.css";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Browse recent Prestige Kitchens & Bedrooms work and showroom inspiration from completed kitchen and bathroom projects.",
};

const GALLERY_IMAGES = [
  "dsc4161.webp",
  "dsc5097.webp",
  "dsc5101-ba.webp",
  "e842f5b3-61c9-4a09-9fbf-56c4b14d4a10.webp",
  "img-3056.webp",
  "img-3887.webp",
  "img-6797.webp",
  "img-8601.webp",
  "img-8602.webp",
  "img-8605.webp",
  "screenshot-2024-08-10-at-14-35-40.webp",
];

export default async function GalleryPage() {
  const images = GALLERY_IMAGES;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Gallery</span>
        </nav>
        <h1 className={styles.heading}>Gallery</h1>
        <p className={styles.intro}>
          A selection of recent project photos from Prestige Kitchens & Bedrooms.
        </p>

        {images.length ? (
          <section className={styles.section}>
            <div className={styles.grid}>
              {images.map((image) => (
                <div key={image} className={styles.card}>
                  <div className={styles.imageFrame}>
                    <Image
                      src={`/galary/${image}`}
                      alt="Prestige Kitchens & Bedrooms project image"
                      fill
                      className={styles.image}
                      sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className={styles.emptyState}>
            <h2>No gallery images yet</h2>
            <p>
              Add project photos to <code>public/galary</code> and they will appear
              here automatically.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
