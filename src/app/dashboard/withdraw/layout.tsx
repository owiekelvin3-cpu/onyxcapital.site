import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function WithdrawLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard/withdraw");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_suspended && profile.role !== "admin") {
    redirect("/dashboard");
  }

  return children;
}
