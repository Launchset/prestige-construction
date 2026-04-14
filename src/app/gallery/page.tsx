import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { readdir } from "node:fs/promises";
import path from "node:path";
import styles from "./gallery.module.css";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Browse recent Prestige Kitchens & Bedrooms work and showroom inspiration from completed kitchen and bathroom projects.",
};

async function getGalleryImages() {
  const galleryDir = path.join(process.cwd(), "public", "galary");

  try {
    const files = await readdir(galleryDir, { withFileTypes: true });

    return files
      .filter((entry) => entry.isFile() && /\.(webp|png|jpe?g|avif)$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

export default async function GalleryPage() {
  const images = await getGalleryImages();

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
