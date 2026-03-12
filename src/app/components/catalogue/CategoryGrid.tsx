import Link from "next/link";
import styles from "./catalogue.module.css";

type CategoryItem = {
  id: string;
  name: string;
  slug: string;
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
          <h3>{category.name}</h3>
          <span>Browse range</span>
        </Link>
      ))}
    </div>
  );
}
