import Image from "next/image";
import Link from "next/link";
import styles from "./catalogue.module.css";

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
};

type CategoryGridProps = {
  categories: CategoryItem[];
};

export default function CategoryGrid({ categories }: CategoryGridProps) {
  if (!categories.length) {
    return (
      <div className={styles.emptyState}>
        No subcategories available in this section yet.
      </div>
    );
  }

  return (
    <div className={styles.categoryGrid}>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/${category.slug}`}
          className={styles.categoryCard}
        >
          <div className={styles.categoryCardImageWrap}>
            {category.image ? (
              <Image
                src={category.image}
                alt={category.name}
                className={styles.categoryCardImage}
                width={320}
                height={240}
                sizes="(max-width: 700px) 50vw, (max-width: 1180px) 33vw, 220px"
                quality={66}
              />
            ) : (
              <div className={styles.categoryCardPlaceholder} aria-hidden="true" />
            )}
          </div>
          <h3>{category.name}</h3>
          <span>Browse range</span>
        </Link>
      ))}
    </div>
  );
}
