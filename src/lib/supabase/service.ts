import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getServiceSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim() || "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE?.trim() || "";

  if (!url || !serviceRole) {
    throw new Error(
      "Supabase service configuration is missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE for local admin tooling or data scripts.",
    );
  }

  return { url, serviceRole };
}

export function createServiceClient() {
  const { url, serviceRole } = getServiceSupabaseConfig();

  return createSupabaseClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
