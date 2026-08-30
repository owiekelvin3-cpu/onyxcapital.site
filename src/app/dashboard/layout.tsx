import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BackendPending } from "@/components/brand/BackendPending";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { hasSupabaseEnv } from "@/lib/env";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  if (!hasSupabaseEnv()) {
    return (
      <BackendPending
        title="Dashboard is waiting on your backend"
        description="The Onyx Capital interface is ready. Connect your new backend to enable login, balances, and live trading data."
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  if (!user.email_confirmed_at) {
    const email = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
    redirect(`/verify-email${email}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, is_suspended, suspension_reason")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <DashboardShell
      userId={user.id}
      userName={profile?.full_name ?? undefined}
      userEmail={user.email}
      avatarUrl={profile?.avatar_url ?? undefined}
      isSuspended={profile?.is_suspended ?? false}
      suspensionReason={profile?.suspension_reason}
    >
      {children}
    </DashboardShell>
  );
}
