import Link from "next/link";
import { BRAND } from "@/lib/constants";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center safe-area-x safe-area-bottom">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">{BRAND.name}</p>
      <h1 className="mt-2 text-2xl font-bold text-text-primary">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-text-secondary leading-relaxed">
        Check your connection, then reopen the app. Cached pages may still be available when you
        reconnect.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-bg-primary"
      >
        Open dashboard
      </Link>
    </main>
  );
}
