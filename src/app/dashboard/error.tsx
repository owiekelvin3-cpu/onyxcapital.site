"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <p className="text-red font-mono text-xs mb-2">Dashboard error</p>
      <h2 className="text-lg font-bold text-text-primary">Could not load this page</h2>
      <p className="text-sm text-text-tertiary mt-2 max-w-sm">
        Your session may have expired or the server returned an error.
      </p>
      <div className="flex gap-3 mt-6">
        <Button size="sm" onClick={reset}>
          Retry
        </Button>
        <Link href="/dashboard">
          <Button size="sm" variant="outline">
            Dashboard home
          </Button>
        </Link>
      </div>
    </div>
  );
}
