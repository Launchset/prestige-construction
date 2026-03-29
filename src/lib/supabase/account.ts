import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountRole = "customer" | "admin";

type ProfileRow = {
  role: string | null;
};

type GetAccountRoleResult = {
  role: AccountRole | null;
  error: string | null;
};

export async function getAccountRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<GetAccountRoleResult> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { role: null as AccountRole | null, error: error.message };
  }

  const role: AccountRole = (data as ProfileRow | null)?.role === "admin"
    ? "admin"
    : "customer";

  return { role, error: null as string | null };
}
