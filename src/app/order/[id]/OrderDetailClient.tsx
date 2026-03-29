"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/browser";
import { type AccountRole, getAccountRole } from "@/lib/supabase/account";
import styles from "../../account/account.module.css";

type OrderRecord = {
  id: string;
  product_name: string;
  product_slug: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  unit_amount_pence: number;
  currency: string;
  status: string;
  created_at: string;
};

type OrderDetailClientProps = {
  orderId: string;
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

export default function OrderDetailClient({ orderId }: OrderDetailClientProps) {
  const router = useRouter();

  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [role, setRole] = useState<AccountRole>("customer");
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

    async function loadOrder() {
      const { data: userData } = await client.auth.getUser();
      const user = userData.user ?? null;

      if (!user) {
        router.replace(`/account?next=${encodeURIComponent(`/order/${orderId}`)}`);
        return;
      }

      const { role: resolvedRole, error: roleError } = await getAccountRole(client, user.id);

      if (roleError) {
        setError(roleError);
        setLoading(false);
        return;
      }

      if (!isMounted) {
        return;
      }

      setRole(resolvedRole ?? "customer");

      const { data, error: orderError } = await client
        .from("orders")
        .select(`
          id,
          product_name,
          product_slug,
          customer_name,
          customer_email,
          customer_phone,
          shipping_address,
          unit_amount_pence,
          currency,
          status,
          created_at
        `)
        .eq("id", orderId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (orderError) {
        setError(orderError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        router.replace(resolvedRole === "admin" ? "/admin/orders" : "/account/orders");
        return;
      }

      setOrder(data as OrderRecord);
      setLoading(false);
    }

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId, router, supabase]);

  if (configError) {
    return <p className={styles.error}>{configError}</p>;
  }

  if (loading) {
    return <p className={styles.sectionText}>Loading order...</p>;
  }

  if (error) {
    return <p className={styles.error}>{error}</p>;
  }

  if (!order) {
    return null;
  }

  return (
    <>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Prestige Construction</p>
        <h1 className={styles.title}>Order Details</h1>
        <p className={styles.intro}>
          {role === "admin"
            ? "You are viewing this order with admin access."
            : "This order is attached to your account."}
        </p>
      </header>

      <section className={styles.card}>
        <div className={styles.orderMeta}>
          <p className={styles.eyebrow}>Order</p>
          <h2 className={styles.sectionTitle}>Order {order.id}</h2>
        </div>

        <div className={styles.orderList}>
          <div className={styles.orderCard}>
            <div className={styles.orderMeta}>
              <span className={styles.orderLabel}>Status</span>
              <strong className={styles.orderValue}>{formatStatus(order.status)}</strong>
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
            <div className={styles.orderMeta}>
              <span className={styles.orderLabel}>Customer</span>
              <strong className={styles.orderValue}>{order.customer_name}</strong>
            </div>
            <div className={styles.orderMeta}>
              <span className={styles.orderLabel}>Email</span>
              <strong className={styles.orderValue}>{order.customer_email}</strong>
            </div>
            <div className={styles.orderMeta}>
              <span className={styles.orderLabel}>Phone</span>
              <strong className={styles.orderValue}>{order.customer_phone}</strong>
            </div>
            <div className={styles.orderMeta}>
              <span className={styles.orderLabel}>Address</span>
              <strong className={styles.orderValue}>{order.shipping_address}</strong>
            </div>
            <div className={styles.orderMeta}>
              <span className={styles.orderLabel}>Placed</span>
              <strong className={styles.orderValue}>
                {new Date(order.created_at).toLocaleString("en-GB")}
              </strong>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
