import EnquiryForm from "./EnquiryForm";
import styles from "./enquire.module.css";

type EnquirePageProps = {
  searchParams: Promise<{ product?: string; productSlug?: string; productName?: string; image?: string }>;
};

const CONTACT_PHONE = "+447775457427";
const ASSETS_BASE = process.env.NEXT_PUBLIC_ASSETS_BASE?.replace(/\/+$/, "") ?? "";

function normalizeAssetPath(path: string) {
  return path.replace(/^web\//i, "");
}

export default async function EnquirePage({ searchParams }: EnquirePageProps) {
  const params = await searchParams;
  const productSlug = params.productSlug?.trim() || "";
  const legacyProduct = params.product?.trim() || "";
  const productName = params.productName?.trim() || legacyProduct || productSlug || "General Enquiry";
  const image = params.image?.trim() || null;
  const imageUrl = image && ASSETS_BASE
    ? `${ASSETS_BASE}/i/${normalizeAssetPath(image)}`
    : null;
  const checkoutHref = productSlug ? `/checkout/${encodeURIComponent(productSlug)}` : null;

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Prestige Construction</p>
          <h1 className={styles.title}>Enquire About This Product</h1>
          <p className={styles.productLabel}>Enquiry for: <strong>{productName}</strong></p>
          <p className={styles.intro}>
            Choose the route that suits you best: buy now, speak with us directly, or send a more
            detailed enquiry.
          </p>
        </header>

        <section className={styles.enquireLayout}>
          <aside className={styles.actionsColumn} aria-labelledby="actions-title">
            <div className={styles.actionsPanel}>
              <div className={styles.actionsIntro}>
                <p className={styles.sectionEyebrow}>Quick Actions</p>
                <h2 id="actions-title" className={styles.sectionTitle}>How would you like to proceed?</h2>
                <p className={styles.sectionText}>
                  Secure checkout available. Or speak with us before ordering.
                </p>
              </div>

              {imageUrl ? (
                <div className={styles.productPreview}>
                  <img src={imageUrl} alt={productName} />
                </div>
              ) : null}

              <div className={styles.actionBlock}>
                {checkoutHref ? (
                  <a href={checkoutHref} className={styles.buyButton}>
                    Buy Now →
                  </a>
                ) : (
                  <p className={styles.actionHint}>
                    Direct checkout is only available when this enquiry has a valid product slug.
                  </p>
                )}
              </div>

              <div className={styles.actionBlock}>
                <a href={`tel:${CONTACT_PHONE}`} className={styles.callButton}>
                  Call Now
                </a>
              </div>

            </div>
          </aside>

          <section className={styles.formColumn} aria-labelledby="enquiry-form-title">
            <div className={styles.formHeader}>
              <p className={styles.sectionEyebrow}>Detailed Enquiry</p>
              <h2 id="enquiry-form-title" className={styles.sectionTitle}>Send us the details</h2>
              <p className={styles.sectionText}>
                Share your requirements and we will come back with the right next step.
              </p>
            </div>

            <EnquiryForm product={productName} />
          </section>
        </section>
      </section>
    </main>
  );
}
