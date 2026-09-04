"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/env";
import { isTawkEnabled, syncTawkWidget } from "@/lib/tawk";

export function TawkChat() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (!isTawkEnabled()) return;

    const hidden = pathname.startsWith("/admin");
    const onDashboard =
      pathname.startsWith("/dashboard") && !pathname.startsWith("/dashboard/support");
    const offsetY = onDashboard ? 88 : 16;

    let cancelled = false;

    async function sync() {
      let name: string | null = null;
      let email: string | null = null;
      let userId: string | null = null;

      if (hasSupabaseEnv()) {
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            userId = user.id;
            email = user.email ?? null;
            const metaName = user.user_metadata?.full_name;
            name = typeof metaName === "string" && metaName.trim() ? metaName.trim() : email;
          }
        } catch {
          /* widget still loads for guests */
        }
      }

      if (cancelled) return;
      syncTawkWidget({ hidden, offsetY, name, email, userId });
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
