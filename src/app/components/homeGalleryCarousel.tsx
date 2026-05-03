"use client";

import Image from "next/image";
import Link from "next/link";
import { GALLERY_IMAGES } from "@/app/gallery/galleryImages";
import styles from "./homeGalleryCarousel.module.css";

const TILE_VARIANTS = ["tiltLeft", "tiltRight", "tiltSoft", "tiltWide"] as const;
const LOOP_IMAGES = [...GALLERY_IMAGES, ...GALLERY_IMAGES];

export default function HomeGalleryCarousel() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Recent Work</h2>
            <p className={styles.subtitle}>
              Kitchens, bedrooms, and finished details from recent Prestige
              projects and showroom displays.
            </p>
          </div>
        </div>

        <div className={styles.footerRow}>
          <Link href="/gallery" className={styles.link}>
            View full gallery
          </Link>
        </div>

        <div className={styles.railViewport}>
          <div className={styles.railTrack}>
            {LOOP_IMAGES.map((image, index) => {
              const variant = TILE_VARIANTS[index % TILE_VARIANTS.length];

              return (
                <Link
                  key={`${image.src}-${index}`}
                  href="/gallery"
                  className={`${styles.tile} ${styles[variant]}`}
                >
                  <div className={styles.imageFrame}>
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      className={styles.image}
                      sizes="(max-width: 700px) 72vw, 26vw"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
