import Link from "next/link";
import styles from "../../enquire/enquire.module.css";
import { createClient } from "@/lib/supabase/server";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{ order_id?: string; session_id?: string }>;
};

type OrderRecord = {
  id: string;
  product_name: string;
  product_slug: string;
  unit_amount_pence: number;
  currency: string;
  customer_name: string;
  customer_email: string;
  status: string;
  stripe_session_id: string | null;
  stripe_payment_status: string | null;
};

function formatMoney(amountPence: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountPence / 100);
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

  const supabase = createClient();
  const { data: existingOrder } = await supabase
    .from("orders")
    .select(`
      id,
      product_name,
      product_slug,
      unit_amount_pence,
      currency,
      customer_name,
      customer_email,
      status,
      stripe_session_id,
      stripe_payment_status
    `)
    .eq("id", orderId)
    .maybeSingle();

  const order = (existingOrder as OrderRecord | null) ?? null;

  if (!order) {
    return (
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Prestige Construction</p>
            <h1 className={styles.title}>Order not found</h1>
            <p className={styles.intro}>
              The payment completed page was reached, but the referenced order record was not found
              in Supabase.
            </p>
          </header>
        </section>
      </main>
    );
  }
  const orderMatchesSession = !order.stripe_session_id || order.stripe_session_id === sessionId;
  const resolvedStatus = orderMatchesSession ? order.status : "pending";

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Prestige Construction</p>
          <h1 className={styles.title}>
            {resolvedStatus === "paid" ? "Payment received" : "Payment awaiting confirmation"}
          </h1>
          <p className={styles.intro}>
            {resolvedStatus === "paid"
              ? "Your order has been recorded and matched to a successful Stripe payment."
              : "Your order exists, but payment is still awaiting confirmation from Stripe."}
          </p>
        </header>

        {!orderMatchesSession ? (
          <p className={styles.error}>
            The order reference and Stripe session did not match, so the order status was not
            updated automatically.
          </p>
        ) : null}

        <section className={styles.checkoutCard}>
          <div className={styles.checkoutHeader}>
            <p className={styles.sectionEyebrow}>Order Confirmation</p>
            <h2 className={styles.sectionTitle}>Order {order.id}</h2>
            <p className={styles.checkoutText}>
              {order.product_name} for {formatMoney(order.unit_amount_pence, order.currency)}
            </p>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryMeta}>
              <span className={styles.summaryLabel}>Customer</span>
              <strong className={styles.summaryValue}>{order.customer_name}</strong>
            </div>
            <div className={styles.summaryMeta}>
              <span className={styles.summaryLabel}>Email</span>
              <strong className={styles.summaryValue}>{order.customer_email}</strong>
            </div>
            <div className={styles.summaryMeta}>
              <span className={styles.summaryLabel}>Status</span>
              <strong className={styles.summaryValue}>{resolvedStatus}</strong>
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
