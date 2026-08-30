import { cn } from "@/lib/utils";

const ONYX_O = (
  <path
    fillRule="evenodd"
    d="M16 6.15c-5.44 0-9.85 4.41-9.85 9.85S10.56 25.85 16 25.85 25.85 21.44 25.85 16 21.44 6.15 16 6.15zm0 4.4a5.45 5.45 0 1 0 0 10.9 5.45 5.45 0 0 0 0-10.9z"
  />
);

/** Onyx Capital mark — lime O on charcoal */
export function OnyxLogo({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" className="fill-[#111111] dark:fill-[#E2FF4C]" />
      <g className="fill-[#E2FF4C] dark:fill-[#111111]">{ONYX_O}</g>
    </svg>
  );
}
