"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Search, User } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/Button";
import {
  SupportComposer,
  SupportEmptyState,
  SupportMessageList,
  SupportMobileChatOverlay,
  SupportStatusBadge,
  SupportThreadFrame,
} from "@/components/support/SupportChat";
import {
  ensureSupportRealtimeAuth,
  fetchMessages,
  fetchNewerMessages,
  listAdminConversations,
  markConversationRead,
  mergeSupportMessages,
  sendMessage,
  SUPPORT_PAGE_SIZE,
  updateConversationStatus,
  type AdminSupportFilter,
  type SupportConversationWithUser,
  type SupportMessageWithAttachments,
} from "@/lib/support";
import type { SupportConversation } from "@/lib/support-types";
import { cn, formatDate } from "@/lib/utils";

const FILTERS: AdminSupportFilter[] = ["all", "open", "pending", "resolved", "unread"];
const FILTER_LABELS: Record<AdminSupportFilter, string> = {
  all: "All",
  open: "Open",
  pending: "Pending",
  resolved: "Resolved",
  unread: "Unread",
  high: "High priority",
  archived: "Archived",
};
const THREAD_POLL_MS = 4000;

export default function AdminSupportPage() {
  const [adminId, setAdminId] = useState<string | undefined>();
  const [filter, setFilter] = useState<AdminSupportFilter>("all");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<SupportConversationWithUser[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessageWithAttachments[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAdminId(user?.id);
    });
  }, []);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const showThread = !!active;
  const unreadCount = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0),
    [conversations]
  );

  const refreshList = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoadingList(true);
    setError("");
    try {
      const rows = await listAdminConversations(filter, search);
      setConversations(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversations.");
    } finally {
      if (!opts?.soft) setLoadingList(false);
    }
  }, [filter, search]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  const syncLatestMessages = useCallback(async (conversationId: string) => {
    const current = messagesRef.current;
    const lastPersisted = [...current].reverse().find((m) => !m.id.startsWith("temp-"));
    try {
      if (!lastPersisted) {
        const rows = await fetchMessages(conversationId, { limit: SUPPORT_PAGE_SIZE });
        setHasMore(rows.length >= SUPPORT_PAGE_SIZE);
        setMessages(rows);
        return;
      }
      const newer = await fetchNewerMessages(conversationId, lastPersisted.created_at);
      if (newer.length > 0) {
        setMessages((prev) => mergeSupportMessages(prev, newer));
      }
    } catch {
      /* keep existing messages */
    }
  }, []);

  const loadThread = useCallback(
    async (conversationId: string, reset = true) => {
      setLoadingMessages(true);
      try {
        const before = reset ? undefined : messagesRef.current[0]?.created_at;
        const rows = await fetchMessages(conversationId, { before, limit: SUPPORT_PAGE_SIZE });
        setHasMore(rows.length >= SUPPORT_PAGE_SIZE);
        setMessages((prev) => (reset ? rows : [...rows, ...prev]));
        await markConversationRead(conversationId, true);
        await refreshList({ soft: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load thread.");
      } finally {
        setLoadingMessages(false);
      }
    },
    [refreshList]
  );

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    void loadThread(activeId, true);
  }, [activeId, loadThread]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | undefined;

    void (async () => {
      await ensureSupportRealtimeAuth();
      if (cancelled) return;
      channel = createClient()
        .channel("admin-support-all")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "support_conversations" },
          (payload) => {
            void refreshList({ soft: true });
            const row = payload.new as SupportConversation | undefined;
            if (row?.id && row.id === activeIdRef.current) {
              void syncLatestMessages(row.id);
            }
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void createClient().removeChannel(channel);
    };
  }, [refreshList, syncLatestMessages]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    let msgChannel: ReturnType<ReturnType<typeof createClient>["channel"]> | undefined;

    void (async () => {
      await ensureSupportRealtimeAuth();
      if (cancelled) return;
      msgChannel = createClient()
        .channel(`admin-support-msg-${activeId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: `conversation_id=eq.${activeId}`,
          },
          (payload) => {
            const row = payload.new as SupportMessageWithAttachments;
            setMessages((prev) => mergeSupportMessages(prev, [{ ...row, attachments: [] }]));
            void markConversationRead(activeId, true);
            void refreshList({ soft: true });
            window.setTimeout(() => void syncLatestMessages(activeId), 600);
          }
        )
        .subscribe();
    })();

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void syncLatestMessages(activeId);
        void refreshList({ soft: true });
      }
    }, THREAD_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      if (msgChannel) void createClient().removeChannel(msgChannel);
    };
  }, [activeId, refreshList, syncLatestMessages]);

  const backToList = () => setActiveId(null);

  const send = async (body: string, files: File[]) => {
    if (!adminId || !activeId) return;
    const clientId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${clientId}`,
        conversation_id: activeId,
        sender_id: adminId,
        sender_role: "admin" as const,
        body,
        is_internal: false,
        delivered_at: null,
        read_at: null,
        client_id: clientId,
        created_at: new Date().toISOString(),
        pending: true,
        attachments: [],
      },
    ]);
    try {
      const saved = await sendMessage({
        conversationId: activeId,
        senderId: adminId,
        senderRole: "admin",
        body,
        clientId,
        files,
      });
      setMessages((prev) => mergeSupportMessages(prev, [{ ...saved, pending: false }]));
      await refreshList({ soft: true });
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.client_id === clientId ? { ...m, failed: true, pending: false } : m))
      );
    }
  };

  const resolve = async (conversationId: string) => {
    await updateConversationStatus(conversationId, "resolved");
    await refreshList({ soft: true });
  };

  const reopen = async (conversationId: string) => {
    await updateConversationStatus(conversationId, "open");
    await refreshList({ soft: true });
  };

  const threadMessages = active ? (
    <SupportMessageList
      messages={messages}
      currentUserId={adminId ?? ""}
      loading={loadingMessages}
      hasMore={hasMore}
      onLoadMore={() => activeId && void loadThread(activeId, false)}
    />
  ) : null;

  const threadComposer = active ? (
    active.status !== "resolved" ? (
      <SupportComposer onSend={send} placeholder="Reply to customer…" compact />
    ) : (
      <div className="shrink-0 border-t border-border p-4 text-center text-sm text-text-tertiary">
        This conversation is resolved.{" "}
        <button
          type="button"
          className="font-medium text-brand hover:underline"
          onClick={() => void reopen(active.id)}
        >
          Reopen
        </button>
      </div>
    )
  ) : undefined;

  const statusActions = active ? (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <SupportStatusBadge status={active.status} />
      {active.status !== "resolved" ? (
        <Button size="sm" onClick={() => void resolve(active.id)}>
          Mark resolved
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => void reopen(active.id)}>
          <RefreshCw className="h-3.5 w-3.5" />
          Reopen
        </Button>
      )}
    </div>
  ) : null;

  const conversationButton = (c: SupportConversationWithUser, dense = false) => (
    <button
      key={c.id}
      type="button"
      onClick={() => setActiveId(c.id)}
      className={cn(
        "w-full border-b border-border text-left transition-colors",
        dense ? "px-4 py-3" : "px-4 py-3.5 active:bg-bg-tertiary/60",
        c.id === activeId ? "bg-bg-tertiary/70" : "hover:bg-bg-tertiary/40"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "flex min-w-0 items-center gap-1.5 truncate font-medium text-text-primary",
            dense ? "text-sm" : "text-[15px]"
          )}
        >
          <User className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
          <span className="truncate">{c.user?.full_name || c.user?.email || "Customer"}</span>
        </p>
        {(c.unread_count ?? 0) > 0 && (
          <span className="rounded-full bg-brand px-1.5 text-[10px] font-bold text-brand-text">
            {c.unread_count}
          </span>
        )}
      </div>
      <p className={cn("truncate text-text-tertiary", dense ? "text-xs" : "text-[13px]")}>{c.subject}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <SupportStatusBadge status={c.status} />
        <span className={cn("text-text-tertiary", dense ? "text-[10px]" : "text-[11px]")}>
          {formatDate(c.last_message_at)}
        </span>
      </div>
    </button>
  );

  const filterBar = (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-bg-tertiary/30 p-1 scrollbar-none">
      {FILTERS.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => setFilter(f)}
          className={cn(
            "min-h-9 shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
            filter === f
              ? "bg-bg-secondary text-text-primary shadow-sm"
              : "text-text-tertiary hover:text-text-primary"
          )}
        >
          {FILTER_LABELS[f]}
        </button>
      ))}
    </div>
  );

  const inboxSearch = (rounded: "full" | "xl") => (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, or subject"
        className={cn(
          "h-10 w-full border border-border bg-bg-tertiary/40 pl-9 pr-3 text-text-primary outline-none focus:ring-1 focus:ring-brand/20",
          rounded === "full" ? "rounded-full text-base" : "rounded-xl text-sm"
        )}
      />
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-4 lg:h-[calc(100dvh-7.5rem)] lg:min-h-[560px]">
      <div className={cn("shrink-0", showThread && "hidden lg:block")}>
        <AdminPageHeader
          title="Support inbox"
          subtitle="Reply to customer conversations, resolve tickets, and track open requests."
          notificationCount={unreadCount}
        />
      </div>

      {error && (
        <p className="shrink-0 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className={cn("shrink-0", showThread && "hidden lg:block")}>{filterBar}</div>

      {/* Mobile inbox */}
      <div className={cn("min-h-0 flex-1 lg:hidden", showThread && "hidden")}>
        <div className="flex h-full min-h-[calc(100dvh-12rem)] flex-col overflow-hidden rounded-2xl border border-border bg-bg-secondary">
          <div className="border-b border-border p-3">{inboxSearch("full")}</div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-bg-tertiary/50" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-text-tertiary">No conversations match this filter.</p>
            ) : (
              conversations.map((c) => conversationButton(c))
            )}
          </div>
        </div>
      </div>

      {/* Mobile full-screen thread */}
      <SupportMobileChatOverlay open={showThread} hideFrom="lg">
        {active && (
          <SupportThreadFrame
            title={active.user?.full_name || active.user?.email || active.subject}
            subtitle={active.subject}
            onBack={backToList}
            safeAreaTop
            trailing={statusActions}
            composer={threadComposer}
          >
            {threadMessages}
          </SupportThreadFrame>
        )}
      </SupportMobileChatOverlay>

      {/* Desktop split pane */}
      <div className="hidden min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-bg-secondary lg:grid lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-border">
          <div className="border-b border-border p-3">{inboxSearch("xl")}</div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-bg-tertiary/50" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-text-tertiary">No conversations match this filter.</p>
            ) : (
              conversations.map((c) => conversationButton(c, true))
            )}
          </div>
        </aside>

        <section className="flex h-full min-h-0 min-w-0 flex-col">
          {active ? (
            <SupportThreadFrame
              title={active.subject}
              subtitle={active.user?.full_name || active.user?.email || undefined}
              trailing={statusActions}
              composer={threadComposer}
            >
              {threadMessages}
            </SupportThreadFrame>
          ) : (
            <SupportEmptyState />
          )}
        </section>
      </div>
    </div>
  );
}
