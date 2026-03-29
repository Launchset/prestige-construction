"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browser";
import { getAccountRole } from "@/lib/supabase/account";
import styles from "../../account/account.module.css";

type OrderRecord = {
  id: string;
  product_name: string;
  customer_name: string;
  customer_email: string;
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

export default function AdminOrdersClient() {
  const router = useRouter();

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

      const { role: resolvedRole, error: roleError } = await getAccountRole(client, currentUser.id);

      if (roleError) {
        setError(roleError);
        setLoading(false);
        return;
      }

      if (resolvedRole !== "admin") {
        router.replace("/account/orders");
        return;
      }

      const { data, error: ordersError } = await client
        .from("orders")
        .select("id, product_name, customer_name, customer_email, unit_amount_pence, currency, status, created_at")
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

  return (
    <section className={styles.card}>
      <div className={styles.actions}>
        <Link href="/account/orders" className={styles.secondaryButton}>
          Back to Account
        </Link>
      </div>

      {configError ? <p className={styles.error}>{configError}</p> : null}
      {loading ? <p className={styles.sectionText}>Loading orders...</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}
      {!loading && !error && orders.length === 0 ? (
        <p className={styles.sectionText}>No orders found.</p>
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
                <span className={styles.orderLabel}>Customer</span>
                <strong className={styles.orderValue}>
                  {order.customer_name} ({order.customer_email})
                </strong>
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
  );
}
