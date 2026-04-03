import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";

  if (isPlaceholder(url)) {
    return "";
  }

  return url;
}

function getSupabaseAnonKey() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (isPlaceholder(anonKey)) {
    return "";
  }

  return anonKey;
}

export function getSupabasePublicConfig() {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    throw new Error(
      "Supabase public configuration is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your real Supabase project values."
    );
  }

  return { url, anonKey };
}

export function createPublicClient() {
  const { url, anonKey } = getSupabasePublicConfig();

  return createSupabaseClient(url, anonKey);
}
