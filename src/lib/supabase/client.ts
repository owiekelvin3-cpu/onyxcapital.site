import { createBrowserClient } from "@supabase/ssr";
import { hasSupabaseEnv } from "@/lib/env";
import { createDisconnectedClient } from "@/lib/supabase/disconnected";

export function createClient() {
  if (!hasSupabaseEnv()) {
    return createDisconnectedClient() as never;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
