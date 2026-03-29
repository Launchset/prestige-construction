import Link from "next/link";
import { notFound } from "next/navigation";
import CheckoutStartForm from "./CheckoutStartForm";
import styles from "../../enquire/enquire.module.css";
import { getCheckoutProductBySlug } from "@/lib/products";

type CheckoutProductPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cancelled?: string }>;
};

export default async function CheckoutProductPage({
  params,
  searchParams,
}: CheckoutProductPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const product = await getCheckoutProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const hasPrice = typeof product.price === "number" && typeof product.priceInPence === "number";
  const enquiryHref = `/enquire?product=${encodeURIComponent(product.slug)}&image=${encodeURIComponent(product.primaryImagePath || "")}`;

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Prestige Construction</p>
          <h1 className={styles.title}>Checkout</h1>
          <p className={styles.productLabel}>
            Ordering: <strong>{product.name}</strong>
          </p>
          <p className={styles.intro}>
            Confirm your details, create the order record, and then continue to Stripe for secure
            payment.
          </p>
        </header>

        {query.cancelled ? (
          <p className={styles.error}>
            Your previous payment attempt was cancelled. Your details have not been lost, and you
            can start the secure checkout again below.
          </p>
        ) : null}

        <section className={styles.enquireLayout}>
          <aside className={styles.actionsColumn} aria-labelledby="checkout-summary-title">
            <div className={styles.actionsPanel}>
              <div className={styles.actionsIntro}>
                <p className={styles.sectionEyebrow}>Order Summary</p>
                <h2 id="checkout-summary-title" className={styles.sectionTitle}>
                  Product details
                </h2>
                <p className={styles.sectionText}>
                  This checkout is single-product for MVP simplicity. No cart state is introduced.
                </p>
              </div>

              {product.primaryImageUrl ? (
                <div className={styles.productPreview}>
                  <img src={product.primaryImageUrl} alt={product.name} />
                </div>
              ) : null}

              <div className={styles.summaryCard}>
                <div className={styles.summaryMeta}>
                  <span className={styles.summaryLabel}>Product</span>
                  <strong className={styles.summaryValue}>{product.name}</strong>
                </div>
                <div className={styles.summaryMeta}>
                  <span className={styles.summaryLabel}>SKU</span>
                  <strong className={styles.summaryValue}>{product.sku}</strong>
                </div>
                <div className={styles.summaryMeta}>
                  <span className={styles.summaryLabel}>Price</span>
                  <strong className={styles.summaryValue}>
                    {hasPrice
                      ? new Intl.NumberFormat("en-GB", {
                          style: "currency",
                          currency: "GBP",
                        }).format(product.price as number)
                      : "Price available on request"}
                  </strong>
                </div>
              </div>

              <p className={styles.actionHint}>
                We create the order before redirecting to Stripe so payment can be reconciled
                against a real order record.
              </p>
            </div>
          </aside>

          <section className={styles.formColumn} aria-labelledby="checkout-form-title">
            <div className={styles.formHeader}>
              <p className={styles.sectionEyebrow}>Customer Details</p>
              <h2 id="checkout-form-title" className={styles.sectionTitle}>
                Enter delivery details before payment
              </h2>
              <p className={styles.sectionText}>
                We keep this practical for MVP: one product, one order record, then one Stripe
                checkout session.
              </p>
            </div>

            {hasPrice ? (
              <CheckoutStartForm productSlug={product.slug} />
            ) : (
              <div className={styles.checkoutCard}>
                <p className={styles.checkoutText}>
                  This product does not currently have a sellable price in the catalogue, so we
                  cannot create a Stripe checkout session yet.
                </p>
                <Link href={enquiryHref} className={styles.callButton}>
                  Return to Enquiry
                </Link>
              </div>
            )}
          </section>
        </section>
      </section>
    </main>
  );
}
