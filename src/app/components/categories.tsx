import styles from "./categories.module.css";
import Image from "next/image";
import Link from "next/link";

export default function Categories() {
    return (
        <section className={styles.categories}>
            <div className={styles.inner}>
                <h2 className={styles.title}>Explore Our Categories</h2>
                <p className={styles.subtitle}>
                    Discover our carefully curated ranges, designed to inspire and guide
                    your project.
                </p>

                <div className={styles.grid}>
                    <Link href="/kitchens" className={styles.card}>
                        <Image
                            src="/images/kitchens.webp"
                            alt="Kitchen designs"
                            fill
                            className={styles.image}
                        />
                        <div className={styles.overlay}>
                            <h3>Kitchens</h3>
                            <span>View Kitchens →</span>
                        </div>
                    </Link>

                    <Link href="/bedrooms" className={styles.card}>
                        <Image
                            src="/images/bedrooms.webp"
                            alt="Bedroom designs"
                            fill
                            className={styles.image}
                        />
                        <div className={styles.overlay}>
                            <h3>Bedrooms</h3>
                            <span>View Bedrooms →</span>
                        </div>
                    </Link>

                    <Link href="/flooring" className={styles.card}>
                        <Image
                            src="/images/flooring.webp"
                            alt="Flooring options"
                            fill
                            className={styles.image}
                        />
                        <div className={styles.overlay}>
                            <h3>Flooring</h3>
                            <span>View Flooring →</span>
                        </div>
                    </Link>
                </div>
            </div>
        </section>
    );
}
