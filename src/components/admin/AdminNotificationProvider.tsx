"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { alertAdminEvent } from "@/lib/notifications/admin-alerts";
import {
  bindAdminNotificationUnlock,
  ensureAdminNotificationsEnabled,
} from "@/lib/notifications/admin-setup";
import { setupNotificationAudioUnlock } from "@/lib/notifications/sound";
import { isSpotWalletDepositNotes } from "@/lib/spot-wallet-deposits";
import { formatCurrency, cn } from "@/lib/utils";
import { Bell, X } from "@/components/icons";

type AdminToast = {
  id: string;
  title: string;
  message: string;
  href: string;
};

function formatMoney(amount: unknown) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "Amount pending review";
  return `${formatCurrency(value)} pending review`;
}

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const readyRef = useRef(false);
  const seenKeys = useRef(new Set<string>());
  const [toast, setToast] = useState<AdminToast | null>(null);

  useEffect(() => {
    setupNotificationAudioUnlock();
    bindAdminNotificationUnlock();
    void ensureAdminNotificationsEnabled();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 9000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const readyTimer = window.setTimeout(() => {
      readyRef.current = true;
    }, 2500);

    function notify(event: {
      title: string;
      body: string;
      href: string;
      dedupeKey: string;
    }) {
      if (cancelled || !readyRef.current || seenKeys.current.has(event.dedupeKey)) return;
      seenKeys.current.add(event.dedupeKey);

      alertAdminEvent({
        ...event,
        onNavigate: () => router.push(event.href),
      });
      setToast({
        id: event.dedupeKey,
        title: event.title,
        message: event.body,
        href: event.href,
      });
    }

    const channel = supabase
      .channel("admin-live-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deposits" },
        (payload) => {
          const row = payload.new as {
            id?: string;
            status?: string;
            amount?: number;
            method?: string;
            notes?: string | null;
          };
          if (row.status !== "pending" || !row.id) return;
          const spotWallet = isSpotWalletDepositNotes(row.notes);
          notify({
            title: spotWallet ? "New spot crypto deposit" : "New deposit request",
            body: formatMoney(row.amount),
            href: spotWallet ? "/admin/crypto-deposits" : "/admin/deposits",
            dedupeKey: `deposit-${row.id}`,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deposits" },
        (payload) => {
          const row = payload.new as {
            id?: string;
            status?: string;
            amount?: number;
            method?: string;
            notes?: string | null;
          };
          const old = payload.old as { status?: string };
          if (row.status !== "pending" || old.status === "pending" || !row.id) return;
          const spotWallet = isSpotWalletDepositNotes(row.notes);
          notify({
            title: spotWallet ? "Spot crypto deposit needs review" : "Deposit needs review",
            body: formatMoney(row.amount),
            href: spotWallet ? "/admin/crypto-deposits" : "/admin/deposits",
            dedupeKey: `deposit-update-${row.id}-${Date.now()}`,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "withdrawals" },
        (payload) => {
          const row = payload.new as { id?: string; status?: string; amount?: number };
          if (row.status !== "pending" || !row.id) return;
          notify({
            title: "New withdrawal request",
            body: formatMoney(row.amount),
            href: "/admin/withdrawals",
            dedupeKey: `withdrawal-${row.id}`,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "withdrawals" },
        (payload) => {
          const row = payload.new as { id?: string; status?: string; amount?: number };
          const old = payload.old as { status?: string };
          if (row.status !== "pending" || old.status === "pending" || !row.id) return;
          notify({
            title: "Withdrawal needs review",
            body: formatMoney(row.amount),
            href: "/admin/withdrawals",
            dedupeKey: `withdrawal-update-${row.id}-${Date.now()}`,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "kyc_submissions" },
        (payload) => {
          const row = payload.new as { id?: string; status?: string };
          if (row.status !== "pending" || !row.id) return;
          notify({
            title: "New KYC submission",
            body: "Identity verification is waiting for review.",
            href: "/admin/kyc",
            dedupeKey: `kyc-${row.id}`,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "kyc_submissions" },
        (payload) => {
          const row = payload.new as { id?: string; status?: string };
          const old = payload.old as { status?: string };
          if (row.status !== "pending" || old.status === "pending" || !row.id) return;
          notify({
            title: "KYC resubmitted",
            body: "A user resubmitted identity verification.",
            href: "/admin/kyc",
            dedupeKey: `kyc-update-${row.id}-${Date.now()}`,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        (payload) => {
          const row = payload.new as {
            id?: string;
            sender_role?: string;
            is_internal?: boolean;
            body?: string;
          };
          if (row.sender_role !== "user" || row.is_internal || !row.id) return;
          const preview = (row.body ?? "").trim();
          notify({
            title: "New support message",
            body: preview ? preview.slice(0, 120) : "A user sent a new support message.",
            href: "/admin/support",
            dedupeKey: `support-${row.id}`,
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearTimeout(readyTimer);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <>
      {children}
      {toast && (
        <div
          className={cn(
            "pointer-events-none fixed inset-x-0 top-[calc(3.75rem+var(--safe-top))] z-[80] flex justify-center px-3",
            "animate-in fade-in slide-in-from-top-2 duration-300"
          )}
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-brand/25 bg-bg-secondary/95 p-4 shadow-lg backdrop-blur-xl">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Bell className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">{toast.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                {toast.message}
              </p>
              <Link
                href={toast.href}
                className="mt-2 inline-block text-xs font-semibold text-brand hover:text-brand-hover"
                onClick={() => setToast(null)}
              >
                Open in admin
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="shrink-0 rounded-lg p-1.5 text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
