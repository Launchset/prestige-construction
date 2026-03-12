import Image from "next/image";
import Link from "next/link";
import styles from "./catalogue.module.css";

const BASE = process.env.NEXT_PUBLIC_ASSETS_BASE?.replace(/\/+$/, "") ?? "";

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

type ProductCardProps = {
  product: Product;
};

function getImageUrl(sourcePath: string, width = 400, quality = 75) {
  return `${BASE}/i/${sourcePath}?w=${width}&q=${quality}`;
}

export default function ProductCard({ product }: ProductCardProps) {
  const sortedImages = [...(product.product_images ?? [])].sort(
    (a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER)
  );
  const thumbnail = sortedImages[0];

  return (
    <Link href={`/product/${product.slug}`} className={styles.productCard}>
      <div className={styles.productImageWrap}>
        {thumbnail ? (
          <Image
            src={getImageUrl(thumbnail.source_path)}
            alt={product.name}
            className={styles.productImage}
            width={400}
            height={300}
          />
        ) : (
          <div className={styles.productPlaceholder}>No image</div>
        )}
      </div>
      <div className={styles.productBody}>
        <h3>{product.name}</h3>
      </div>
    </Link>
  );
}
