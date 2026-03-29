"use client";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function isPlaceholder(value: string) {
  const normalized = value.trim().toLowerCase();

  return (
    !normalized ||
    normalized.includes("your_project") ||
    normalized.includes("your_public") ||
    normalized.includes("anon_key") ||
    normalized.includes("example")
  );
}

export function createBrowserClient() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    if (isPlaceholder(url) || isPlaceholder(anonKey)) {
      throw new Error(
        "Supabase public configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your real Supabase project values."
      );
    }

    browserClient = createSupabaseClient(url, anonKey);
  }

  return browserClient;
}
