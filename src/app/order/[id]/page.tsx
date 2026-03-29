import { Suspense } from "react";
import styles from "../../account/account.module.css";
import OrderDetailClient from "./OrderDetailClient";

type OrderTrackingPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function OrderTrackingPage({
  params,
}: OrderTrackingPageProps) {
  const { id } = await params;

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <Suspense fallback={<p className={styles.sectionText}>Loading order...</p>}>
          <OrderDetailClient orderId={id} />
        </Suspense>
      </section>
    </main>
  );
}
