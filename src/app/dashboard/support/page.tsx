"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Comments, Plus, Search } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { useUserSupport } from "@/hooks/useUserSupport";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  SupportComposer,
  SupportEmptyState,
  SupportMessageList,
  SupportMobileChatOverlay,
  SupportStatusBadge,
  SupportThreadFrame,
} from "@/components/support/SupportChat";
import { isConversationUnreadForUser } from "@/lib/support";
import { cn, formatDate } from "@/lib/utils";

export default function SupportPage() {
  const [userId, setUserId] = useState<string | undefined>();
  const support = useUserSupport(userId);
  const [search, setSearch] = useState("");
  const [composing, setComposing] = useState(false);
  const [subject, setSubject] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return support.conversations;
    return support.conversations.filter(
      (c) =>
        c.subject.toLowerCase().includes(q) ||
        (c.last_message_preview ?? "").toLowerCase().includes(q)
    );
  }, [support.conversations, search]);

  const active = support.conversations.find((c) => c.id === support.activeId) ?? null;
  const showThread = composing || !!active;

  const backToList = () => {
    setComposing(false);
    support.setActiveId(null);
  };

  const handleCreate = async () => {
    if (!firstMessage.trim()) return;
    setCreating(true);
    try {
      await support.startNew(subject || "Support request", firstMessage);
      setComposing(false);
      setSubject("");
      setFirstMessage("");
    } finally {
      setCreating(false);
    }
  };

  const threadMessages = composing ? (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-lg space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand/30 bg-brand text-brand-text shadow-sm">
            <Comments className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text-primary">Start conversation</h2>
            <p className="text-sm text-text-tertiary">Describe your issue and our team will respond shortly.</p>
          </div>
        </div>
        <Input
          id="support-subject"
          label="Subject"
          className="text-base"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of your issue"
        />
        <div>
          <label htmlFor="support-first" className="block text-xs text-text-tertiary">
            Message
          </label>
          <textarea
            id="support-first"
            className="mt-1.5 min-h-[120px] w-full rounded-xl border border-border bg-bg-tertiary/40 px-4 py-3 text-base text-text-primary outline-none focus:ring-1 focus:ring-brand/20"
            value={firstMessage}
            onChange={(e) => setFirstMessage(e.target.value)}
            placeholder="Tell us how we can help…"
          />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" className="w-full sm:w-auto" onClick={backToList}>
            Cancel
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={() => void handleCreate()}
            disabled={creating || !firstMessage.trim()}
          >
            {creating ? "Sending…" : "Send"}
          </Button>
        </div>
      </motion.div>
    </div>
  ) : active ? (
    <SupportMessageList
      messages={support.messages}
      currentUserId={userId ?? ""}
      loading={support.loadingMessages}
      hasMore={support.hasMore}
      onLoadMore={support.loadOlder}
    />
  ) : null;

  const threadComposer =
    active && active.status === "resolved" ? (
      <div className="shrink-0 border-t border-border p-4 text-center text-sm text-text-tertiary">
        This conversation has been resolved.{" "}
        <button
          type="button"
          className="font-medium text-brand hover:underline"
          onClick={() => void support.reopen(active.id)}
        >
          Reopen
        </button>
      </div>
    ) : active ? (
      <SupportComposer onSend={support.send} compact />
    ) : undefined;

  const threadTitle = composing
    ? "Start conversation"
    : active?.subject ?? "Support";
  const threadSubtitle = composing
    ? "Describe your issue and our team will respond shortly."
    : active
      ? `Ticket #${active.id.slice(0, 8)}`
      : undefined;

  const inboxItem = (c: (typeof filtered)[number], dense = false) => {
    const unread = isConversationUnreadForUser(c);
    const selected = c.id === support.activeId;
    return (
      <button
        key={c.id}
        type="button"
        onClick={() => {
          setComposing(false);
          support.setActiveId(c.id);
        }}
        className={cn(
          "flex w-full flex-col gap-1 border-b border-border text-left transition-colors",
          dense ? "px-4 py-3" : "px-4 py-3.5 active:bg-bg-tertiary/60",
          dense && selected ? "bg-bg-tertiary/70" : dense ? "hover:bg-bg-tertiary/40" : undefined
        )}
      >
        <div className={cn("flex items-start justify-between gap-2", dense && "items-center")}>
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-text-primary",
              dense ? "text-sm" : "text-[15px]",
              unread ? "font-semibold" : "font-medium"
            )}
          >
            {c.subject}
          </p>
          <SupportStatusBadge status={c.status} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={cn("min-w-0 truncate text-text-tertiary", dense ? "text-xs" : "text-[13px]")}>
            {c.last_message_preview || "No messages yet"}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <span className={cn("text-text-tertiary", dense ? "text-[10px]" : "text-[11px]")}>
              {formatDate(c.last_message_at)}
            </span>
            {unread && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex min-h-0 flex-col gap-4 lg:h-[calc(100dvh-8.5rem)] lg:min-h-[520px]">
      <div className={cn("shrink-0", showThread && "hidden lg:block")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">Account</p>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-1">Support</h1>
            <p className="text-sm text-text-tertiary mt-1">
              Chat with our team about deposits, withdrawals, trading, and account issues.
            </p>
          </div>
          <Button
            size="sm"
            className="w-full rounded-full sm:w-auto"
            onClick={() => {
              setComposing(true);
              support.setActiveId(null);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            New conversation
          </Button>
        </div>
      </div>

      {support.error && (
        <p className="shrink-0 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {support.error}
        </p>
      )}

      {/* Mobile inbox list */}
      <div className={cn("min-h-0 flex-1 lg:hidden", showThread && "hidden")}>
        <div className="flex h-full min-h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-2xl border border-border bg-bg-secondary">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                className="h-10 w-full rounded-full border border-border bg-bg-tertiary/40 pl-9 pr-3 text-base text-text-primary outline-none focus:ring-1 focus:ring-brand/20"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {support.loadingList ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-bg-tertiary/50" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <SupportEmptyState onNew={() => setComposing(true)} />
            ) : (
              filtered.map((c) => inboxItem(c))
            )}
          </div>
        </div>
      </div>

      {/* Mobile full-screen thread */}
      <SupportMobileChatOverlay open={showThread}>
        <SupportThreadFrame
          title={threadTitle}
          subtitle={threadSubtitle}
          onBack={backToList}
          safeAreaTop
          trailing={active ? <SupportStatusBadge status={active.status} /> : undefined}
          composer={threadComposer}
        >
          {threadMessages}
        </SupportThreadFrame>
      </SupportMobileChatOverlay>

      {/* Desktop split pane */}
      <div className="hidden min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-bg-secondary lg:grid lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-border">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                className="h-10 w-full rounded-xl border border-border bg-bg-tertiary/40 pl-9 pr-3 text-sm text-text-primary outline-none focus:ring-1 focus:ring-brand/20"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {support.loadingList ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-bg-tertiary/50" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-text-tertiary">No conversations yet.</p>
            ) : (
              filtered.map((c) => inboxItem(c, true))
            )}
          </div>
        </aside>

        <section className="flex h-full min-h-0 min-w-0 flex-col">
          {composing || active ? (
            <SupportThreadFrame
              title={threadTitle}
              subtitle={threadSubtitle}
              trailing={
                active ? (
                  <div className="flex items-center gap-2 pr-2">
                    <SupportStatusBadge status={active.status} />
                    {active.status === "resolved" && (
                      <Button size="sm" variant="outline" onClick={() => void support.reopen(active.id)}>
                        Reopen
                      </Button>
                    )}
                  </div>
                ) : undefined
              }
              composer={threadComposer}
            >
              {threadMessages}
            </SupportThreadFrame>
          ) : (
            <SupportEmptyState onNew={() => setComposing(true)} />
          )}
        </section>
      </div>
    </div>
  );
}
