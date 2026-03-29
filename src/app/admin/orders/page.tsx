import AdminOrdersClient from "./AdminOrdersClient";
import styles from "../../account/account.module.css";

export const dynamic = "force-dynamic";

export default function AdminOrdersPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Prestige Construction</p>
          <h1 className={styles.title}>Admin Orders</h1>
          <p className={styles.intro}>
            Review all customer orders that have come through the checkout flow.
          </p>
        </header>

        <AdminOrdersClient />
      </section>
    </main>
  );
}
