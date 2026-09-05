"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Mail, RefreshCw, Search } from "@/components/icons";
import { BRAND } from "@/lib/constants";
import {
  MAIL_TEMPLATES,
  SUPPORT_EMAIL,
  getMailTemplate,
  renderBrandEmailHtml,
  type MailTemplateId,
} from "@/lib/brand-email";
import { cn, formatDate } from "@/lib/utils";

type MailUser = {
  id: string;
  email: string;
  full_name: string | null;
};

type SentMail = {
  id: string;
  user_id: string;
  to_email: string;
  subject: string;
  template: string;
  created_at: string;
  status: string;
};

type MailConfig = {
  configured: boolean;
  from: string;
  replyTo: string;
  contactEmail: string;
};

function AdminMailPageInner() {
  const searchParams = useSearchParams();
  const preselectedUser = searchParams.get("user") ?? "";

  const [users, setUsers] = useState<MailUser[]>([]);
  const [sent, setSent] = useState<SentMail[]>([]);
  const [config, setConfig] = useState<MailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState(preselectedUser);
  const [templateId, setTemplateId] = useState<MailTemplateId>("general");
  const [subject, setSubject] = useState(MAIL_TEMPLATES[0].subject);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"ok" | "error">("ok");

  const selected = users.find((user) => user.id === userId) ?? null;
  const template = getMailTemplate(templateId);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(q) ||
        (user.full_name ?? "").toLowerCase().includes(q)
    );
  }, [users, query]);

  const previewHtml = useMemo(
    () =>
      renderBrandEmailHtml({
        recipientName: selected?.full_name || selected?.email || "there",
        heading: template.heading,
        body: body.trim() || "Your message will appear here.",
        subject: subject.trim() || template.heading,
      }),
    [selected, template.heading, body, subject]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: profileRows }, { data: sentRows }, configRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, full_name")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("admin_outbound_emails")
        .select("id, user_id, to_email, subject, template, created_at, status")
        .order("created_at", { ascending: false })
        .limit(20),
      fetch("/api/admin/mail"),
    ]);

    setUsers((profileRows as MailUser[]) ?? []);
    setSent((sentRows as SentMail[]) ?? []);
    if (configRes.ok) {
      setConfig((await configRes.json()) as MailConfig);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (preselectedUser) setUserId(preselectedUser);
  }, [preselectedUser]);

  function applyTemplate(nextId: MailTemplateId) {
    const next = getMailTemplate(nextId);
    const previous = getMailTemplate(templateId);
    setTemplateId(nextId);
    if (!subject.trim() || subject === previous.subject) {
      setSubject(next.subject);
    }
  }

  async function handleSend() {
    if (!userId || sending) return;
    setSending(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          template: templateId,
          subject,
          body,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; to?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not send email");
      }
      setMessageTone("ok");
      setMessage(`Sent to ${data.to ?? selected?.email ?? "the user"}.`);
      setBody("");
      await load();
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not send email");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Mail users"
        subtitle={`Sends from support@${BRAND.domain}. Replies go to ${SUPPORT_EMAIL}.`}
        action={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      {config && !config.configured && (
        <p className="rounded-lg border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-text-secondary">
          Add <span className="font-medium text-text-primary">RESEND_API_KEY</span> in Vercel, then
          add and verify <span className="font-medium text-text-primary">{BRAND.domain}</span> at{" "}
          <a
            href="https://resend.com/domains"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-text-primary underline"
          >
            resend.com/domains
          </a>
          . Gmail cannot be used as the From address. Reply-to stays {SUPPORT_EMAIL}.
        </p>
      )}
      {config?.configured && (
        <p className="rounded-lg border border-border bg-bg-secondary/60 px-4 py-3 text-sm text-text-secondary">
          From <span className="font-medium text-text-primary">{config.from}</span>
          {" · "}
          replies to <span className="font-medium text-text-primary">{config.replyTo}</span>
        </p>
      )}

      {message && (
        <p
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            messageTone === "error"
              ? "border-red/30 bg-red/5 text-red"
              : "border-green/30 bg-green/5 text-green"
          )}
        >
          {message}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="space-y-4 self-start">
          <div>
            <p className="text-sm font-semibold text-text-primary">Recipient</p>
            <p className="mt-1 text-xs text-text-tertiary">Choose a registered user.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email"
              className="h-10 w-full rounded-xl border border-border bg-bg-primary pl-9 pr-3 text-sm text-text-primary outline-none focus:border-brand"
            />
          </div>
          <div className="max-h-[28rem] space-y-1 overflow-y-auto">
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
                      "flex w-full flex-col items-start rounded-xl px-3 py-2.5 text-left transition-colors",
                      active
                        ? "bg-nav-active text-nav-active-text"
                        : "hover:bg-bg-hover"
                    )}
                  >
                    <span className="truncate text-sm font-medium">
                      {user.full_name || user.email}
                    </span>
                    {user.full_name && (
                      <span
                        className={cn(
                          "truncate text-xs",
                          active ? "text-nav-active-text/70" : "text-text-tertiary"
                        )}
                      >
                        {user.email}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-text">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Compose</p>
                <p className="mt-1 text-xs text-text-tertiary">
                  {selected
                    ? `Sending to ${selected.full_name || selected.email}`
                    : "Select a user, then write the message."}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs text-text-tertiary">Template</p>
              <div className="flex flex-wrap gap-2">
                {MAIL_TEMPLATES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => applyTemplate(item.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      templateId === item.id
                        ? "border-brand bg-brand/15 text-text-primary"
                        : "border-border text-text-secondary hover:border-brand/40"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <Input
              id="mail-subject"
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={template.subject || "Email subject"}
            />

            <div className="space-y-1.5">
              <label htmlFor="mail-body" className="block text-xs text-text-tertiary">
                Message
              </label>
              <textarea
                id="mail-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={template.placeholder}
                rows={8}
                className="w-full rounded-xl border border-border bg-bg-primary px-3 py-3 text-sm text-text-primary outline-none focus:border-brand"
              />
            </div>

            <Button
              type="button"
              disabled={sending || !userId || !subject.trim() || !body.trim()}
              onClick={() => void handleSend()}
            >
              {sending ? "Sending…" : "Send branded email"}
            </Button>
          </Card>

          <Card className="space-y-3">
            <p className="text-sm font-semibold text-text-primary">Brand preview</p>
            <iframe
              title="Email preview"
              srcDoc={previewHtml}
              className="h-[420px] w-full rounded-xl border border-border bg-[#111111]"
            />
          </Card>

          <Card className="space-y-3">
            <p className="text-sm font-semibold text-text-primary">Recently sent</p>
            {sent.length === 0 ? (
              <p className="text-sm text-text-tertiary">
                No sent mail yet. After you send, a copy is stored for the team.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {sent.map((row) => (
                  <li key={row.id} className="py-3">
                    <p className="text-sm font-medium text-text-primary">{row.subject}</p>
                    <p className="mt-1 text-xs text-text-tertiary">
                      {row.to_email} · {formatDate(row.created_at)}
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

export default function AdminMailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-text-tertiary">Loading mail…</p>}>
      <AdminMailPageInner />
    </Suspense>
  );
}
