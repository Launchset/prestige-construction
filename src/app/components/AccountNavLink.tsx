"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import { getAccountRole } from "@/lib/supabase/account";

type AccountNavLinkProps = {
  className?: string;
  mobile?: boolean;
};

export default function AccountNavLink({ className }: AccountNavLinkProps) {
  const [href, setHref] = useState("/account");
  const [label, setLabel] = useState("Account");

  const supabase = useMemo(() => {
    try {
      return createBrowserClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }
    const client = supabase;

    let isMounted = true;

    async function loadState() {
      const { data } = await client.auth.getUser();
      const user = data.user ?? null;

      if (!isMounted || !user) {
        return;
      }

      const { role } = await getAccountRole(client, user.id);

      if (!isMounted) {
        return;
      }

      setHref(role === "admin" ? "/admin/orders" : "/account/orders");
      setLabel(role === "admin" ? "Admin" : "Account");
    }

    loadState();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        setHref("/account");
        setLabel("Account");
        return;
      }

      const { role } = await getAccountRole(client, session.user.id);
      setHref(role === "admin" ? "/admin/orders" : "/account/orders");
      setLabel(role === "admin" ? "Admin" : "Account");
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
