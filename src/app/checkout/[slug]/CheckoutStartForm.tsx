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
  addressNumber: string;
  road: string;
  townCity: string;
  county: string;
  postcode: string;
};

export default function CheckoutStartForm({ productSlug }: CheckoutStartFormProps) {
  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    addressNumber: "",
    road: "",
    townCity: "",
    county: "",
    postcode: "",
  });
  const [accountEmail, setAccountEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const { supabase, configError } = useMemo(() => {
    try {
      return { supabase: createBrowserClient(), configError: "" };
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Supabase account configuration is missing.";
      return { supabase: null, configError: message };
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setIsAuthenticated(false);
      return;
    }
    const client = supabase;

    let isMounted = true;

    async function loadSession() {
      const { data: sessionData } = await client.auth.getSession();
      const sessionUser = sessionData.session?.user ?? null;
      const user = sessionUser ?? (await client.auth.getUser()).data.user ?? null;

      if (!isMounted) {
        return;
      }

      setIsAuthenticated(Boolean(user));

      if (user?.email) {
        setAccountEmail(user.email);
      } else {
        setAccountEmail("");
      }
    }

    loadSession();

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

    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.addressNumber.trim() ||
      !form.road.trim() ||
      !form.townCity.trim() ||
      !form.county.trim() ||
      !form.postcode.trim()
    ) {
      setError("Please complete all delivery address fields before continuing to payment.");
      return;
    }

    setIsSubmitting(true);

    try {
      const client = supabase;

      if (!client) {
        setError("Account service is still loading. Please try again.");
        return;
      }

      const { data: sessionData, error: initialSessionError } = await client.auth.getSession();
      let sessionError = initialSessionError;
      let session = sessionData.session ?? null;

      if (!session?.access_token) {
        const refreshResult = await client.auth.refreshSession();
        sessionError = refreshResult.error ?? sessionError;
        session = refreshResult.data.session ?? session;
      }

      const accessToken = session?.access_token || "";
      const sessionEmail = session?.user?.email?.trim() || accountEmail;

      if (!accessToken) {
        console.error("CHECKOUT DEBUG: missing Supabase access token", {
          sessionError: sessionError?.message ?? null,
          hasSession: Boolean(session),
          hasAccountEmail: Boolean(accountEmail),
        });
        setError("Your account session expired. Please sign in again before placing your order.");
        return;
      }

      if (!sessionEmail) {
        setError("Please sign in again before placing your order.");
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
          addressNumber: form.addressNumber,
          road: form.road,
          townCity: form.townCity,
          county: form.county,
          postcode: form.postcode,
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

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span>House / Building Number</span>
          <input
            type="text"
            name="addressNumber"
            value={form.addressNumber}
            onChange={(event) => updateField("addressNumber", event.target.value)}
            required
            placeholder="e.g. 13 or Flat 2"
          />
        </label>

        <label className={styles.field}>
          <span>Road / Street</span>
          <input
            type="text"
            name="road"
            value={form.road}
            onChange={(event) => updateField("road", event.target.value)}
            autoComplete="address-line1"
            required
            placeholder="e.g. Telford Road"
          />
        </label>
      </div>

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span>Town / City</span>
          <input
            type="text"
            name="townCity"
            value={form.townCity}
            onChange={(event) => updateField("townCity", event.target.value)}
            autoComplete="address-level2"
            required
            placeholder="e.g. Wimborne"
          />
        </label>

        <label className={styles.field}>
          <span>County</span>
          <input
            type="text"
            name="county"
            value={form.county}
            onChange={(event) => updateField("county", event.target.value)}
            autoComplete="address-level1"
            required
            placeholder="e.g. Dorset"
          />
        </label>
      </div>

      <label className={styles.field}>
        <span>Postcode</span>
        <input
          type="text"
          name="postcode"
          value={form.postcode}
          onChange={(event) => updateField("postcode", event.target.value)}
          autoComplete="postal-code"
          required
          placeholder="e.g. BH21 7QP"
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
