"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/env";

export function useSuspendedAccount() {
  const [state, setState] = useState({
    loading: true,
    suspended: false,
    reason: null as string | null,
  });

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setState({ loading: false, suspended: false, reason: null });
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setState({ loading: false, suspended: false, reason: null });
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role, is_suspended, suspension_reason")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      setState({
        loading: false,
        suspended: Boolean(data?.is_suspended) && data?.role !== "admin",
        reason: data?.suspension_reason?.trim() || null,
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
