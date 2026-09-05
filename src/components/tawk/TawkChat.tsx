"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/env";
import { Comments } from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  isTawkEnabled,
  onTawkChatOpenChange,
  openTawkChat,
  syncTawkWidget,
} from "@/lib/tawk";

const SIZE = 52;
const STORAGE_KEY = "onyx-tawk-bubble";
const DRAG_THRESHOLD = 8;

type Pos = { x: number; y: number };

function defaultPos(): Pos {
  const margin = 16;
  const dockClearance = window.innerWidth < 1024 ? 96 : 24;
  return {
    x: window.innerWidth - SIZE - margin,
    y: window.innerHeight - SIZE - margin - dockClearance,
  };
}

function clampPos(pos: Pos): Pos {
  const pad = 8;
  return {
    x: Math.min(Math.max(pad, pos.x), Math.max(pad, window.innerWidth - SIZE - pad)),
    y: Math.min(Math.max(pad, pos.y), Math.max(pad, window.innerHeight - SIZE - pad)),
  };
}

function readStoredPos(): Pos {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPos();
    const parsed = JSON.parse(raw) as Partial<Pos>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return defaultPos();
    return clampPos({ x: parsed.x, y: parsed.y });
  } catch {
    return defaultPos();
  }
}

export function TawkChat() {
  const pathname = usePathname() || "/";
  const hidden = pathname.startsWith("/admin");
  const [pos, setPos] = useState<Pos | null>(() =>
    typeof window === "undefined" ? null : readStoredPos()
  );
  const [chatOpen, setChatOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isTawkEnabled()) return;

    syncTawkWidget({ hidden });

    let cancelled = false;

    async function identify() {
      if (!hasSupabaseEnv()) return;

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user) return;
        const metaName = user.user_metadata?.full_name;
        syncTawkWidget({
          hidden,
          userId: user.id,
          email: user.email ?? null,
          name: typeof metaName === "string" && metaName.trim() ? metaName.trim() : user.email ?? null,
        });
      } catch {
        /* widget still loads for guests */
      }
    }

    void identify();
    return () => {
      cancelled = true;
    };
  }, [pathname, hidden]);

  useEffect(() => {
    if (!isTawkEnabled() || hidden) return;
    setPos(readStoredPos());
    return onTawkChatOpenChange(setChatOpen);
  }, [hidden]);

  useEffect(() => {
    if (!pos) return;
    function onResize() {
      setPos((current) => (current ? clampPos(current) : current));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos]);

  function persist(next: Pos) {
    const clamped = clampPos(next);
    setPos(clamped);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clamped));
    } catch {
      /* ignore quota / private mode */
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pos?.x ?? 0,
      originY: pos?.y ?? 0,
      moved: false,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    setDragging(true);
    persist({ x: drag.originX + dx, y: drag.originY + dy });
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    if (!drag.moved) openTawkChat();
  }

  if (!isTawkEnabled() || hidden || chatOpen || !pos) return null;

  return (
    <button
      type="button"
      aria-label="Live chat. Drag to move."
      title="Drag to move, tap to chat"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "fixed z-40 flex h-[52px] w-[52px] items-center justify-center rounded-full border border-black/10 bg-brand text-brand-text shadow-[var(--shadow-glow)]",
        "touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60",
        dragging ? "cursor-grabbing scale-105" : "cursor-grab"
      )}
      style={{ left: pos.x, top: pos.y }}
    >
      <Comments className="h-5 w-5" />
    </button>
  );
}
