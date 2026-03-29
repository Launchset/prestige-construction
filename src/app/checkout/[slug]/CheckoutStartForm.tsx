"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "../../enquire/enquire.module.css";
import { createBrowserClient } from "@/lib/supabase/browser";

type CheckoutStartFormProps = {
  productSlug: string;
};

type FormState = {
  name: string;
  phone: string;
  address: string;
};

export default function CheckoutStartForm({ productSlug }: CheckoutStartFormProps) {
  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    address: "",
  });
  const [accountEmail, setAccountEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [configError, setConfigError] = useState("");

  const supabase = useMemo(() => {
    try {
      return createBrowserClient();
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Supabase account configuration is missing.";
      setConfigError(message);
      setIsAuthenticated(false);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    const client = supabase;

    let isMounted = true;

    async function loadUser() {
      const { data } = await client.auth.getUser();
      const user = data.user ?? null;

      if (!isMounted) {
        return;
      }

      setIsAuthenticated(Boolean(user));

      if (user?.email) {
        setAccountEmail(user.email);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));

      if (session?.user?.email) {
        setAccountEmail(session.user.email);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setError("Please complete all checkout fields before continuing to payment.");
      return;
    }

    setIsSubmitting(true);

    try {
      const client = supabase;

      if (!client) {
        setError("Account service is still loading. Please try again.");
        return;
      }

      if (!accountEmail) {
        setError("Please sign in again before placing your order.");
        return;
      }

      const { data: sessionData } = await client.auth.getSession();
      const accessToken = sessionData.session?.access_token || "";

      if (!accessToken) {
        setError("Please login or create an account before placing an order.");
        return;
      }

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          productSlug,
          name: form.name,
          phone: form.phone,
          address: form.address,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error || "Unable to start checkout. Please try again.");
        return;
      }

      if (!payload?.checkoutUrl) {
        setError("Unable to start checkout. Please try again.");
        return;
      }

      window.location.href = payload.checkoutUrl;
    } catch {
      setError("Unable to start checkout. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthenticated === false) {
    return (
      <div className={styles.checkoutCard}>
        <p className={styles.checkoutText}>
          {configError || "You need to login or create an account before you can continue to payment. Orders are now linked to your account so they appear in My Orders afterwards."}
        </p>
        <Link
          href={`/account?next=${encodeURIComponent(`/checkout/${productSlug}`)}`}
          className={styles.buyButton}
        >
          Login or Sign Up
        </Link>
      </div>
    );
  }

  if (isAuthenticated === null) {
    return <p className={styles.actionHint}>Checking account access...</p>;
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span>Name</span>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            autoComplete="name"
            required
            placeholder="Your full name"
          />
        </label>
      </div>

      <label className={styles.field}>
        <span>Phone</span>
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={(event) => updateField("phone", event.target.value)}
          autoComplete="tel"
          required
          placeholder="Best contact number"
        />
      </label>

      <label className={styles.field}>
        <span>Address</span>
        <textarea
          name="address"
          value={form.address}
          onChange={(event) => updateField("address", event.target.value)}
          required
          rows={5}
          placeholder="Delivery or installation address"
        />
      </label>

      <p className={styles.actionHint}>
        Signed in as {accountEmail || "your account"}. Your account email is used for the order
        so it appears correctly in My Orders after payment.
      </p>

      {error ? <p className={styles.error}>{error}</p> : null}

      <button type="submit" className={styles.buyButton} disabled={isSubmitting}>
        {isSubmitting ? "Preparing secure checkout..." : "Continue to Secure Payment"}
      </button>
    </form>
  );
}
