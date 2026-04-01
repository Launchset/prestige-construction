import Link from "next/link";
import styles from "../../enquire/enquire.module.css";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{ order_id?: string; session_id?: string }>;
};

function getShortReference(value: string) {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const params = await searchParams;
  const orderId = params.order_id?.trim() || "";
  const sessionId = params.session_id?.trim() || "";

  if (!orderId || !sessionId) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Prestige Construction</p>
            <h1 className={styles.title}>We could not confirm this payment</h1>
            <p className={styles.intro}>
              The success page needs both the order reference and Stripe session reference to
              reconcile payment correctly.
            </p>
          </header>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Prestige Construction</p>
          <h1 className={styles.title}>Payment submitted</h1>
          <p className={styles.intro}>
            Stripe has returned you to the site. Your account order list will show the full details
            once the payment update has finished syncing.
          </p>
        </header>

        <section className={styles.checkoutCard}>
          <div className={styles.checkoutHeader}>
            <p className={styles.sectionEyebrow}>Order Confirmation</p>
            <h2 className={styles.sectionTitle}>Order {getShortReference(orderId)}</h2>
            <p className={styles.checkoutText}>
              Sign in to your account area to view the full order details and the latest payment
              status.
            </p>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryMeta}>
              <span className={styles.summaryLabel}>Order Reference</span>
              <strong className={styles.summaryValue}>{getShortReference(orderId)}</strong>
            </div>
            <div className={styles.summaryMeta}>
              <span className={styles.summaryLabel}>Session Reference</span>
              <strong className={styles.summaryValue}>{getShortReference(sessionId)}</strong>
            </div>
          </div>

          <Link href="/account/orders" className={styles.callButton}>
            View My Orders
          </Link>
          <p className={styles.actionHint}>
            This order is now attached to your account and can be opened from your order list.
          </p>
        </section>
      </section>
    </main>
  );
}
