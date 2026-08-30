"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TransactionsClient } from "@/components/dashboard/TransactionsClient";

export default function TransactionsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login?redirect=/dashboard/transactions");
        return;
      }
      setUserId(user.id);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return <div className="text-[13px] text-text-tertiary">Loading…</div>;
  }

  if (!userId) return null;

  return <TransactionsClient userId={userId} />;
}
