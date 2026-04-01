"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/browser";
import { getAccountRole } from "@/lib/supabase/account";
import { getSafeInternalPath } from "@/lib/safe-path";
import styles from "./account.module.css";

type Mode = "login" | "signup";

export default function AccountClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNextPath = searchParams.get("next");

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const resolveNextPath = useCallback(
    (resolvedRole: string | null) => {
      const safeNextPath = getSafeInternalPath(requestedNextPath);

      if (safeNextPath) {
        return safeNextPath;
      }

      return resolvedRole === "admin" ? "/admin/orders" : "/account/orders";
    },
    [requestedNextPath],
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }
    const client = supabase;

    let isMounted = true;

    async function loadSession() {
      const { data: sessionData } = await client.auth.getUser();

      if (!isMounted) {
        return;
      }

      setUser(sessionData.user ?? null);

      if (sessionData.user) {
        const { role: resolvedRole, error: roleError } = await getAccountRole(
          client,
          sessionData.user.id,
        );

        if (!isMounted) {
          return;
        }

        if (roleError) {
          setError(roleError);
          return;
        }

        setRole(resolvedRole);
        router.replace(resolveNextPath(resolvedRole));
        return;
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        const { role: resolvedRole, error: roleError } = await getAccountRole(
          client,
          session.user.id,
        );

        if (roleError) {
          setError(roleError);
          return;
        }

        setRole(resolvedRole);
        router.replace(resolveNextPath(resolvedRole));
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [resolveNextPath, router, supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const client = supabase;

    try {
      if (!client) {
        setError("Account service is still loading. Please try again.");
        return;
      }

      if (mode === "signup") {
        const { error: signUpError } = await client.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        setSuccess("Account created. If email confirmation is enabled, confirm your email and sign in.");
        setMode("login");
        return;
      }

      const { error: signInError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (user) {
    return (
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Signed in</h2>
        <p className={styles.sectionText}>
          You are already signed in as {user.email}. Redirecting to your account.
        </p>
        {role === "admin" ? (
          <Link href="/admin/orders" className={styles.secondaryButton}>
            Go to Admin Orders
          </Link>
        ) : null}
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className={styles.card}>
        {configError ? <p className={styles.error}>{configError}</p> : <p className={styles.sectionText}>Loading account access...</p>}
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Account Access</p>
        <h2 className={styles.sectionTitle}>Sign in before ordering</h2>
        <p className={styles.sectionText}>
          Orders are now attached to your account so you can track them from one place after payment.
        </p>
        <div className={styles.actions}>
          <Link href="/account/orders" className={styles.secondaryButton}>
            View My Orders
          </Link>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.toggleRow}>
          <button
            type="button"
            className={`${styles.toggleButton} ${mode === "login" ? styles.toggleButtonActive : ""}`}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${mode === "signup" ? styles.toggleButtonActive : ""}`}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className={styles.field}>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              required
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}
          {success ? <p className={styles.success}>{success}</p> : null}

          <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
            {isSubmitting
              ? "Working..."
              : mode === "login"
                ? "Login to Account"
                : "Create Account"}
          </button>
        </form>
      </section>
    </div>
  );
}
