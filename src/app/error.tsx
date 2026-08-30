"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-[60vh] bg-bg-primary flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-red font-mono text-sm mb-2">Error</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
          Something went wrong
        </h1>
        <p className="text-sm text-text-tertiary mt-3 leading-relaxed">
          An unexpected error occurred. Try again or return to the homepage.
        </p>
        <div className="flex flex-col xs:flex-row gap-3 justify-center mt-8">
          <Button onClick={reset}>Try again</Button>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
