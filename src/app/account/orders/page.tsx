import OrdersClient from "./OrdersClient";
import styles from "../account.module.css";

export const dynamic = "force-dynamic";

export default function AccountOrdersPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Prestige Construction</p>
          <h1 className={styles.title}>My Orders</h1>
          <p className={styles.intro}>
            Review the orders attached to your account and jump into an individual order view.
          </p>
        </header>

        <OrdersClient />
      </section>
    </main>
  );
}
