import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { BackendPending } from "@/components/brand/BackendPending";
import { ADMIN_AUTH_COOKIE } from "@/lib/auth-guards";
import { hasSupabaseEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasSupabaseEnv()) {
    return (
      <BackendPending
        title="Admin is waiting on your backend"
        description="The admin console UI is in place. Connect your new backend to manage users, deposits, and support."
      />
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (!user.email_confirmed_at) {
    const email = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
    redirect(`/verify-email${email}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_AUTH_COOKIE)?.value !== "1") {
    redirect("/admin/login");
  }

  return (
    <AdminShell adminName={profile.full_name ?? undefined} adminEmail={profile.email ?? user.email}>
      {children}
    </AdminShell>
  );
}
