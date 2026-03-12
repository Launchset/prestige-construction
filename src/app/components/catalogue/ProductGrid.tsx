import ProductCard from "./ProductCard";
import styles from "./catalogue.module.css";

type ProductImage = {
  source_path: string;
  sort_order: number | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  product_images?: ProductImage[] | null;
};

type ProductGridProps = {
  products: Product[];
};

export default function ProductGrid({ products }: ProductGridProps) {
  if (!products.length) {
    return (
      <div className={styles.emptyState}>
        No products available in this category yet.
      </div>
    );
  }

  return (
    <div className={styles.productGrid}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
