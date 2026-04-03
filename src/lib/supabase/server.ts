import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./public";

type CreateClientOptions = {
  accessToken?: string;
};

export function createClient(options: CreateClientOptions = {}) {
  const { url, anonKey } = getSupabasePublicConfig();

  return createSupabaseClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: options.accessToken
      ? {
          headers: {
            Authorization: `Bearer ${options.accessToken}`,
          },
        }
      : undefined,
  });
}
