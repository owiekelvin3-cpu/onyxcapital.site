import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const styles =
    normalized === "pending"
      ? "bg-brand/15 text-brand border-brand/30"
      : normalized === "completed" || normalized === "approved"
        ? "bg-green/15 text-green border-green/30"
        : normalized === "rejected" || normalized === "suspended"
          ? "bg-red/15 text-red border-red/30"
          : "bg-bg-hover text-text-tertiary border-border";

  return (
    <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase border", styles)}>
      {status}
    </span>
  );
}

export function isPending(status: string) {
  return status.toLowerCase() === "pending";
}
