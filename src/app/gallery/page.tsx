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
  { src: "/galary/dsc4161.webp", alt: "Kitchen project with dark fitted cabinetry." },
  { src: "/galary/dsc5097.webp", alt: "Finished fitted kitchen interior." },
  { src: "/galary/dsc5101-ba.webp", alt: "Bathroom installation with fitted vanity and tiling." },
  { src: "/galary/e842f5b3-61c9-4a09-9fbf-56c4b14d4a10.webp", alt: "Kitchen design detail from a recent project." },
  { src: "/galary/img-3056.webp", alt: "Kitchen installation photographed from the dining side." },
  { src: "/galary/img-3887.webp", alt: "Kitchen project with island and integrated appliances." },
  { src: "/galary/img-6797.webp", alt: "Modern kitchen interior with fitted storage." },
  { src: "/galary/img-8601.webp", alt: "Completed kitchen project showing cabinetry and worktops." },
  { src: "/galary/img-8602.webp", alt: "Kitchen project showing fitted cabinetry and layout." },
  { src: "/galary/img-8605.webp", alt: "Kitchen installation photographed from the living space." },
  { src: "/galary/screenshot-2024-08-10-at-14-35-40.webp", alt: "Prestige Kitchens & Bedrooms design inspiration image." },
];

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
