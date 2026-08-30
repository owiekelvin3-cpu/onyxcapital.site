import Link from "next/link";
import { OnyxLogo } from "@/components/brand/OnyxLogo";
import { BRAND } from "@/lib/constants";

export function BackendPending({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-primary px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-secondary p-8 text-center">
        <div className="mb-5 flex justify-center">
          <OnyxLogo size={36} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
          {BRAND.name}
        </p>
        <h1 className="mt-3 text-2xl font-bold text-text-primary">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">{description}</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#E2FF4C] px-5 text-sm font-semibold text-[#111111]"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
