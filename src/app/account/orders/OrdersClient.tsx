"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/browser";
import { getAccountRole } from "@/lib/supabase/account";
import styles from "../account.module.css";

type OrderRecord = {
  id: string;
  product_name: string;
  unit_amount_pence: number;
  currency: string;
  status: string;
  created_at: string;
};

function formatMoney(amountPence: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountPence / 100);
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function OrdersClient() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [error, setError] = useState("");
  const [configError, setConfigError] = useState("");
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => {
    try {
      return createBrowserClient();
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Supabase account configuration is missing.";
      setConfigError(message);
      setLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    const client = supabase;

    let isMounted = true;

    async function loadOrders() {
      const { data: userData } = await client.auth.getUser();
      const currentUser = userData.user ?? null;

      if (!currentUser) {
        router.replace("/account");
        return;
      }

      if (!isMounted) {
        return;
      }

      setUser(currentUser);

      const { role: resolvedRole, error: roleError } = await getAccountRole(client, currentUser.id);

      if (roleError) {
        setError(roleError);
        setLoading(false);
        return;
      }

      if (isMounted) {
        setRole(resolvedRole);
      }

      const { data, error: ordersError } = await client
        .from("orders")
        .select("id, product_name, unit_amount_pence, currency, status, created_at")
        .order("created_at", { ascending: false });

      if (!isMounted) {
        return;
      }

      if (ordersError) {
        setError(ordersError.message);
      } else {
        setOrders((data as OrderRecord[] | null) ?? []);
      }

      setLoading(false);
    }

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  async function handleLogout() {
    const client = supabase;

    if (!client) {
      return;
    }

    await client.auth.signOut();
    router.replace("/account");
  }

  return (
    <div className={styles.layout}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Account</p>
        <h2 className={styles.sectionTitle}>Your order access</h2>
        <p className={styles.sectionText}>
          Signed in as {user?.email ?? "Loading..."}.
        </p>
        <div className={styles.actions}>
          {role === "admin" ? (
            <Link href="/admin/orders" className={styles.secondaryButton}>
              View Admin Orders
            </Link>
          ) : null}
          <button type="button" className={styles.logoutButton} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>My Orders</h2>
        <p className={styles.sectionText}>
          Every checkout now belongs to your account, so you can view it here after payment.
        </p>

        {configError ? <p className={styles.error}>{configError}</p> : null}
        {loading ? <p className={styles.sectionText}>Loading orders...</p> : null}
        {error ? <p className={styles.error}>{error}</p> : null}

        {!loading && !error && orders.length === 0 ? (
          <p className={styles.sectionText}>No orders are linked to this account yet.</p>
        ) : null}

        {orders.length > 0 ? (
          <div className={styles.orderList}>
            {orders.map((order) => (
              <article key={order.id} className={styles.orderCard}>
                <div className={styles.orderMeta}>
                  <span className={styles.orderLabel}>Order</span>
                  <strong className={styles.orderValue}>{order.id}</strong>
                </div>
                <div className={styles.orderMeta}>
                  <span className={styles.orderLabel}>Product</span>
                  <strong className={styles.orderValue}>{order.product_name}</strong>
                </div>
                <div className={styles.orderMeta}>
                  <span className={styles.orderLabel}>Amount</span>
                  <strong className={styles.orderValue}>
                    {formatMoney(order.unit_amount_pence, order.currency)}
                  </strong>
                </div>
                <span className={styles.statusPill}>{formatStatus(order.status)}</span>
                <Link href={`/order/${order.id}`} className={styles.secondaryButton}>
                  Open Order
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
