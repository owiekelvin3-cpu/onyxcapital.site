"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-[#0b0e11] text-[#eaecef] antialiased flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-[#f6465d] font-mono text-sm mb-2">Critical error</p>
          <h1 className="text-2xl font-bold">Application error</h1>
          <p className="text-sm text-[#848e9c] mt-3">
            The app hit an unrecoverable error. Refresh to continue.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-8 px-5 py-2.5 rounded bg-[#f0b90b] text-[#0b0e11] font-semibold text-sm cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </body>
    </html>
  );
}
