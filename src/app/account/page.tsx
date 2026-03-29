import { Suspense } from "react";
import AccountClient from "./AccountClient";
import styles from "./account.module.css";

export const dynamic = "force-dynamic";

export default function AccountPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Prestige Construction</p>
          <h1 className={styles.title}>Account</h1>
          <p className={styles.intro}>
            Sign in or create an account to place orders and view your order history.
          </p>
        </header>

        <Suspense fallback={<p className={styles.intro}>Loading account access...</p>}>
          <AccountClient />
        </Suspense>
      </section>
    </main>
  );
}
