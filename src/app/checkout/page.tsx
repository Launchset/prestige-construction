import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "../enquire/enquire.module.css";

type CheckoutPageProps = {
  searchParams: Promise<{ product?: string }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const product = params.product?.trim() || "";

  if (product) {
    redirect(`/checkout/${encodeURIComponent(product)}`);
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Prestige Construction</p>
          <h1 className={styles.title}>Checkout</h1>
          <p className={styles.intro}>
            Choose a product first so checkout can be created against a real product slug and order
            record.
          </p>
        </header>

        <section className={styles.checkoutCard} aria-labelledby="checkout-title">
          <div className={styles.checkoutHeader}>
            <p className={styles.sectionEyebrow}>Checkout Routing</p>
            <h2 id="checkout-title" className={styles.sectionTitle}>Use the product checkout route</h2>
            <p className={styles.checkoutText}>
              The new MVP checkout flow uses <strong>/checkout/[slug]</strong> so the page can load
              product data directly, collect customer details, create the order, and then create
              the Stripe session.
            </p>
          </div>

          <Link href="/" className={styles.callButton}>Return Home</Link>
        </section>
      </section>
    </main>
  );
}
