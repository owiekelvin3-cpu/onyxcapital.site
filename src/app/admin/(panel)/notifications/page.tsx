"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { listAdminPopupSends, sendAdminUserPopup } from "@/lib/admin-api";
import type { AdminPopupSend } from "@/lib/admin-api";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Bell, RefreshCw, Search } from "@/components/icons";
import { cn, formatDate } from "@/lib/utils";

type MailUser = {
  id: string;
  email: string;
  full_name: string | null;
};

function AdminNotificationsInner() {
  const searchParams = useSearchParams();
  const preselectedUser = searchParams.get("user") ?? "";

  const [users, setUsers] = useState<MailUser[]>([]);
  const [sends, setSends] = useState<AdminPopupSend[]>([]);
  const [query, setQuery] = useState("");
  const [audience, setAudience] = useState<"all" | "one">(preselectedUser ? "one" : "all");
  const [userId, setUserId] = useState(preselectedUser);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
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
    const [{ data }, history] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name")
        .order("created_at", { ascending: false })
        .limit(500),
      listAdminPopupSends(),
    ]);
    setUsers((data as MailUser[]) ?? []);
    setSends(history);
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
    setSending(true);
    setStatus("");
    try {
      const result = await sendAdminUserPopup({
        title,
        message,
        userId: audience === "one" ? userId : null,
      });
      const count = Number(result.recipient_count ?? 0);
      setStatusTone("ok");
      setStatus(
        count === 1
          ? `Popup sent to ${selected?.full_name || selected?.email || "the user"}.`
          : `Popup sent to ${count} users.`
      );
      setTitle("");
      setMessage("");
      await load();
    } catch (error) {
      setStatusTone("error");
      setStatus(error instanceof Error ? error.message : "Could not send popup");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <AdminPageHeader
        title="User popups"
        subtitle="Send an on-screen popup to one user or every user. It appears immediately if they are in the dashboard, and again until they tap Got it."
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

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
            <p className="mt-1 text-xs text-text-tertiary">Everyone, or one account.</p>
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
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Compose popup</p>
                <p className="mt-1 text-xs text-text-tertiary">
                  {audience === "all"
                    ? "Every user will see this overlay."
                    : selected
                      ? `Sending to ${selected.full_name || selected.email}`
                      : "Select a user on the left."}
                </p>
              </div>
            </div>
            <Input
              id="popup-title"
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Account update"
            />
            <div className="space-y-1.5">
              <label htmlFor="popup-body" className="block text-xs text-text-tertiary">
                Message
              </label>
              <textarea
                id="popup-body"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={7}
                placeholder="Write the message users should see…"
                className="w-full rounded-xl border border-border bg-bg-primary px-3 py-3 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>
            <Button
              type="button"
              disabled={sending || !title.trim() || !message.trim() || (audience === "one" && !userId)}
              onClick={() => void handleSend()}
            >
              {sending ? "Sending…" : "Send popup"}
            </Button>
          </Card>

          <Card className="space-y-3">
            <p className="text-sm font-semibold text-text-primary">Recently sent</p>
            {sends.length === 0 ? (
              <p className="text-sm text-text-tertiary">
                No popups logged yet. After you send, a copy is stored here.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {sends.map((row) => (
                  <li key={row.id} className="py-3">
                    <p className="text-sm font-medium text-text-primary">{row.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{row.message}</p>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {row.user_id ? "One user" : "All users"} · {row.recipient_count} sent ·{" "}
                      {formatDate(row.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-tertiary">Loading popups…</p>}>
      <AdminNotificationsInner />
    </Suspense>
  );
}
