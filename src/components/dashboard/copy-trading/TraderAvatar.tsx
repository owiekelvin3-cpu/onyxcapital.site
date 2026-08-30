"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  gradientForSeed,
  traderAvatarUrl,
  traderInitials,
  type CopyTraderProfile,
} from "@/lib/copy-traders";

export function TraderAvatar({
  trader,
  size = "md",
  className,
}: {
  trader: CopyTraderProfile;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "lg" ? 56 : size === "sm" ? 36 : 48;
  const ring = size === "lg" ? 3 : 2;
  const [from, to] = gradientForSeed(trader.avatarSeed);

  if (trader.avatarKind === "gradient") {
    return (
      <div
        className={cn("relative shrink-0 rounded-full p-[2px]", className)}
        style={{
          background: `linear-gradient(135deg, ${trader.ringColor}, ${from})`,
          padding: ring,
        }}
      >
        <div
          className="flex items-center justify-center rounded-full font-bold text-white shadow-inner"
          style={{
            width: dims,
            height: dims,
            background: `linear-gradient(145deg, ${from}, ${to})`,
            fontSize: size === "lg" ? 18 : size === "sm" ? 12 : 15,
          }}
        >
          {traderInitials(trader.name)}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("relative shrink-0 rounded-full", className)}
      style={{
        background: `linear-gradient(135deg, ${trader.ringColor}, ${from})`,
        padding: ring,
      }}
    >
      <div
        className="relative overflow-hidden rounded-full bg-bg-secondary"
        style={{ width: dims, height: dims }}
      >
        <Image
          src={traderAvatarUrl(trader)}
          alt={`${trader.name} profile`}
          width={dims}
          height={dims}
          className="h-full w-full object-cover"
          unoptimized
        />
      </div>
      {trader.avatarKind === "anime" && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-bg-secondary bg-[#ec4899] text-[8px]"
          aria-hidden
        >
          ✦
        </span>
      )}
    </div>
  );
}
