import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./gallery.module.css";
import { GALLERY_IMAGES } from "./galleryImages";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Browse recent Prestige Kitchens & Bedrooms work and showroom inspiration from completed kitchen and bathroom projects.",
  alternates: {
    canonical: "/gallery",
  },
  openGraph: {
    title: "Prestige Kitchens & Bedrooms Gallery",
    description:
      "Browse recent Prestige Kitchens & Bedrooms work and showroom inspiration from completed kitchen and bathroom projects.",
    images: [
      {
        url: "/galary/dsc4161.webp",
        alt: "Prestige Kitchens & Bedrooms fitted kitchen project",
      },
    ],
  },
};

export default function GalleryPage() {
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
                <div key={image.src} className={styles.card}>
                  <div className={styles.imageFrame}>
                    <Image
                      src={image.src}
                      alt={image.alt}
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
              Add project photos to <code>public/galary</code> and update the
              gallery list in <code>src/app/gallery/page.tsx</code>.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
