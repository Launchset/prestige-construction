import Hero from "./components/hero";
import WhatHappensNext from "./components/whathappensnext";
import Categories from "./components/categories";
import HomeGalleryCarousel from "./components/homeGalleryCarousel";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.homePage}>
      <Hero />
      <WhatHappensNext />
      <Categories />
      <HomeGalleryCarousel />
    </main>
  );
}
