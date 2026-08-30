import { Bell } from "@/components/icons";
import { cn } from "@/lib/utils";

export function AdminNotificationBadge({
  count,
  showIcon = true,
  className,
}: {
  count: number;
  showIcon?: boolean;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold leading-none text-[var(--brand-text)]",
        showIcon ? "min-w-[1.125rem] justify-center" : "min-w-[1.125rem] justify-center tabular-nums",
        className
      )}
      aria-label={`${count} notification${count === 1 ? "" : "s"}`}
    >
      {showIcon && <Bell className="h-3 w-3" />}
      {count > 99 ? "99+" : count}
    </span>
  );
}
