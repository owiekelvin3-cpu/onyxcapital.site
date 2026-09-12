"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/constants";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Mail, RefreshCw, Search } from "@/components/icons";
import { cn } from "@/lib/utils";

type MailUser = {
  id: string;
  email: string;
  full_name: string | null;
};

function AdminMailInner() {
  const searchParams = useSearchParams();
  const preselectedUser = searchParams.get("user") ?? "";

  const [users, setUsers] = useState<MailUser[]>([]);
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<"all" | "one">(preselectedUser ? "one" : "all");
  const [userId, setUserId] = useState(preselectedUser);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [recipientCount, setRecipientCount] = useState(0);
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState<"ok" | "error">("ok");

  const selected = users.find((user) => user.id === userId) ?? null;
  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(q) ||
        (user.full_name ?? "").toLowerCase().includes(q)
    );
  }, [users, query]);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data }, metaRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name")
        .order("created_at", { ascending: false })
        .limit(500),
      fetch("/api/admin/mail", { cache: "no-store" }),
    ]);
    setUsers((data as MailUser[]) ?? []);
    if (metaRes.ok) {
      const meta = (await metaRes.json()) as { configured?: boolean; recipientCount?: number };
      setConfigured(Boolean(meta.configured));
      setRecipientCount(Number(meta.recipientCount ?? 0));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (preselectedUser) {
      setAudience("one");
      setUserId(preselectedUser);
    }
  }, [preselectedUser]);

  async function handleSend() {
    if (sending) return;
    if (audience === "one" && !userId) {
      setStatusTone("error");
      setStatus("Choose a user first.");
      return;
    }
    if (audience === "all") {
      const ok = window.confirm(
        `Send this branded email to all ${recipientCount} users from ${BRAND.supportEmail}?`
      );
      if (!ok) return;
    }

    setSending(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          message,
          userId: audience === "one" ? userId : null,
        }),
      });
      const payload = (await res.json()) as {
        error?: string;
        sent?: number;
        failed?: number;
        recipientCount?: number;
      };
      if (!res.ok) {
        throw new Error(payload.error || "Could not send email.");
      }
      const sent = Number(payload.sent ?? 0);
      const failed = Number(payload.failed ?? 0);
      setStatusTone(failed > 0 ? "error" : "ok");
      setStatus(
        failed > 0
          ? `Sent ${sent}, failed ${failed}. ${payload.error ?? ""}`.trim()
          : sent === 1
            ? `Email sent to ${selected?.full_name || selected?.email || "the user"}.`
            : `Email sent to ${sent} users.`
      );
      if (failed === 0) {
        setSubject("");
        setMessage("");
      }
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Could not send email.");
    } finally {
      setSending(false);
    }
  }

  const previewName = audience === "one" ? selected?.full_name : "Alex";

  return (
    <div className="space-y-5 max-w-5xl">
      <AdminPageHeader
        title="Email users"
        subtitle={`Send a branded email through Resend to one user or everyone. Recipients see the Onyx black and lime template from ${BRAND.supportEmail}.`}
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {!configured && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Resend is not configured on this server. Add RESEND_API_KEY before sending.
        </p>
      )}

      {status && (
        <p
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            statusTone === "error"
              ? "border-red/30 bg-red/5 text-red"
              : "border-green/30 bg-green/5 text-green"
          )}
        >
          {status}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="space-y-4 self-start">
          <div>
            <p className="text-sm font-semibold text-text-primary">Audience</p>
            <p className="mt-1 text-xs text-text-tertiary">
              {loading ? "Counting users…" : `${recipientCount} users with a valid email.`}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAudience("all")}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-semibold",
                audience === "all"
                  ? "border-brand bg-brand/15 text-text-primary"
                  : "border-border text-text-secondary hover:border-brand/40"
              )}
            >
              All users
            </button>
            <button
              type="button"
              onClick={() => setAudience("one")}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-semibold",
                audience === "one"
                  ? "border-brand bg-brand/15 text-text-primary"
                  : "border-border text-text-secondary hover:border-brand/40"
              )}
            >
              One user
            </button>
          </div>
          {audience === "one" && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or email"
                  className="h-10 w-full rounded-xl border border-border bg-bg-primary pl-9 pr-3 text-sm text-text-primary outline-none focus:border-brand"
                />
              </div>
              <div className="max-h-[22rem] space-y-1 overflow-y-auto">
                {loading ? (
                  <p className="py-6 text-center text-sm text-text-tertiary">Loading users…</p>
                ) : filteredUsers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-text-tertiary">No matching users.</p>
                ) : (
                  filteredUsers.map((user) => {
                    const active = user.id === userId;
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setUserId(user.id)}
                        className={cn(
                          "flex w-full flex-col items-start rounded-xl px-3 py-2.5 text-left",
                          active ? "bg-nav-active text-nav-active-text" : "hover:bg-bg-hover"
                        )}
                      >
                        <span className="truncate text-sm font-medium">
                          {user.full_name || user.email}
                        </span>
                        {user.full_name && (
                          <span className={cn("truncate text-xs", active ? "text-nav-active-text/70" : "text-text-tertiary")}>
                            {user.email}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-text">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Compose email</p>
                <p className="mt-1 text-xs text-text-tertiary">
                  {audience === "all"
                    ? `This will email all ${recipientCount} users.`
                    : selected
                      ? `Sending to ${selected.full_name || selected.email}`
                      : "Select a user on the left."}
                </p>
              </div>
            </div>
            <Input
              id="mail-subject"
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Account update from Onyx Capital"
            />
            <div className="space-y-1.5">
              <label htmlFor="mail-body" className="block text-xs text-text-tertiary">
                Message
              </label>
              <textarea
                id="mail-body"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                placeholder="Write the email users should receive…"
                className="w-full rounded-xl border border-border bg-bg-primary px-3 py-3 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>
            <Button
              type="button"
              disabled={
                sending ||
                !configured ||
                !subject.trim() ||
                !message.trim() ||
                (audience === "one" && !userId)
              }
              onClick={() => void handleSend()}
            >
              {sending ? "Sending…" : audience === "all" ? `Email all users` : "Send email"}
            </Button>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-text-primary">Inbox preview</p>
              <p className="mt-0.5 text-xs text-text-tertiary">How the email looks in their inbox.</p>
            </div>
            <div className="bg-[#111111] p-4 sm:p-5">
              <div className="overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#161616]">
                <div className="border-b-[3px] border-[#e2ff4c] bg-[#111111] px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e2ff4c]">
                    Onyx Capital
                  </p>
                  <p className="mt-2 text-lg font-bold text-white">
                    {subject.trim() || "Your subject"}
                  </p>
                </div>
                <div className="space-y-3 px-5 py-5 text-sm leading-relaxed text-[#e5e5e5]">
                  {previewName ? <p>Hi {previewName},</p> : null}
                  <p className="whitespace-pre-wrap">
                    {message.trim() || "Your message will appear here."}
                  </p>
                  <span className="inline-flex rounded-full bg-[#e2ff4c] px-4 py-2 text-xs font-bold text-[#111111]">
                    Open dashboard
                  </span>
                </div>
                <div className="border-t border-[#2a2a2a] bg-[#111111] px-5 py-4 text-xs text-[#a3a3a3]">
                  {BRAND.fullName} · {BRAND.domain}
                  <br />
                  Questions? {BRAND.supportEmail}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminMailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-tertiary">Loading mail…</p>}>
      <AdminMailInner />
    </Suspense>
  );
}
