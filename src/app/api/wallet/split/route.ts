import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getWalletSplit } from "@/lib/api/trading";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const wallet = await getWalletSplit(createServiceClient(), user.id);
    return NextResponse.json(wallet, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    const wallet = await getWalletSplit(supabase, user.id);
    return NextResponse.json(wallet, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
}
