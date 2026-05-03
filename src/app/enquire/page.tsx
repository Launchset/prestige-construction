import EnquiryForm from "./EnquiryForm";
import styles from "./enquire.module.css";

type EnquirePageProps = {
  searchParams: Promise<{ product?: string; productSlug?: string; productName?: string; image?: string }>;
};

const CONTACT_NUMBERS = [
  { href: "+447765504961", label: "Call 07765 504961" },
  { href: "+447887241451", label: "Call 07887 241451" },
];
const ASSETS_BASE = process.env.NEXT_PUBLIC_ASSETS_BASE?.replace(/\/+$/, "") ?? "";

function normalizeAssetPath(path: string) {
  return path.replace(/^web\//i, "");
}

export default async function EnquirePage({ searchParams }: EnquirePageProps) {
  const params = await searchParams;
  const productSlug = params.productSlug?.trim() || "";
  const legacyProduct = params.product?.trim() || "";
  const isProductEnquiry = Boolean(productSlug || legacyProduct || params.productName?.trim());
  const productName = params.productName?.trim() || legacyProduct || productSlug || "General Enquiry";
  const image = params.image?.trim() || null;
  const imageUrl = image && ASSETS_BASE
    ? `${ASSETS_BASE}/i/${normalizeAssetPath(image)}`
    : null;
  const checkoutHref = productSlug ? `/checkout/${encodeURIComponent(productSlug)}` : null;
  const pageTitle = isProductEnquiry ? "Enquire About This Product" : "Book a Free Design Consultation";
  const introCopy = isProductEnquiry
    ? "Choose the route that suits you best: buy now, speak with us directly, or send a more detailed enquiry."
    : "Tell us about your kitchen, bedroom, or interiors project and we’ll come back with the right next step.";
  const actionCopy = isProductEnquiry
    ? "Secure checkout available. Or speak with us before ordering."
    : "Call us now to book an appointment, or send your details and we’ll arrange a free design consultation.";

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Prestige Construction</p>
          <h1 className={styles.title}>{pageTitle}</h1>
          {isProductEnquiry ? (
            <p className={styles.productLabel}>
              Enquiry for: <strong>{productName}</strong>
            </p>
          ) : null}
          <p className={styles.intro}>{introCopy}</p>
        </header>

        <section className={styles.enquireLayout}>
          <aside className={styles.actionsColumn} aria-labelledby="actions-title">
            <div className={styles.actionsPanel}>
              <div className={styles.actionsIntro}>
                <p className={styles.sectionEyebrow}>Quick Actions</p>
                <h2 id="actions-title" className={styles.sectionTitle}>How would you like to proceed?</h2>
                <p className={styles.sectionText}>{actionCopy}</p>
              </div>

              {imageUrl ? (
                <div className={styles.productPreview}>
                  <img src={imageUrl} alt={productName} />
                </div>
              ) : null}

              {checkoutHref ? (
                <div className={styles.actionBlock}>
                  <a href={checkoutHref} className={styles.buyButton}>
                    Buy Now →
                  </a>
                </div>
              ) : null}

              {CONTACT_NUMBERS.map((contact) => (
                <div key={contact.href} className={styles.actionBlock}>
                  <a href={`tel:${contact.href}`} className={styles.callButton}>
                    {contact.label}
                  </a>
                </div>
              ))}
            </div>

            {!isProductEnquiry ? (
              <div className={styles.locationBlock}>
                <p className={styles.locationLabel}>Showroom</p>
                <address className={styles.locationAddress}>
                  <span>Unit 13, Telford Road</span>
                  <span>Ferndown Industrial Estate</span>
                  <span>Ferndown, BH21 7QP</span>
                </address>
              </div>
            ) : null}
          </aside>

          <section className={styles.formColumn} aria-labelledby="enquiry-form-title">
            <div className={styles.formHeader}>
              <p className={styles.sectionEyebrow}>Detailed Enquiry</p>
              <h2 id="enquiry-form-title" className={styles.sectionTitle}>Send us the details</h2>
              <p className={styles.sectionText}>
                Share your requirements and we will come back with the right next step.
              </p>
            </div>

            <EnquiryForm product={productName} isProductEnquiry={isProductEnquiry} />
          </section>
        </section>
      </section>
    </main>
  );
}
