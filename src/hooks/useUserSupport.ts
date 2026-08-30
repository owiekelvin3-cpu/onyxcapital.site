"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createConversation,
  ensureSupportRealtimeAuth,
  fetchMessages,
  fetchNewerMessages,
  isConversationUnreadForUser,
  listUserConversations,
  markConversationRead,
  mergeSupportMessages,
  sendMessage,
  SUPPORT_PAGE_SIZE,
  updateConversationStatus,
  type SupportMessageWithAttachments,
} from "@/lib/support";
import type { SupportConversation } from "@/lib/support-types";

const THREAD_POLL_MS = 4000;

export function useUserSupport(userId: string | undefined) {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
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

  const refreshList = useCallback(async (opts?: { soft?: boolean }) => {
    if (!userId) return;
    if (!opts?.soft) setLoadingList(true);
    setError("");
    try {
      setConversations(await listUserConversations(userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load conversations.");
    } finally {
      if (!opts?.soft) setLoadingList(false);
    }
  }, [userId]);

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
      if (newer.length > 0) setMessages((prev) => mergeSupportMessages(prev, newer));
    } catch {
      /* keep existing messages */
    }
  }, []);

  const loadMessages = useCallback(
    async (conversationId: string, reset = true) => {
      setLoadingMessages(true);
      setError("");
      try {
        const before = reset ? undefined : messagesRef.current[0]?.created_at;
        const rows = await fetchMessages(conversationId, { before, limit: SUPPORT_PAGE_SIZE });
        setHasMore(rows.length >= SUPPORT_PAGE_SIZE);
        setMessages((prev) => (reset ? rows : [...rows, ...prev]));
        if (userId) await markConversationRead(conversationId, false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load messages.");
      } finally {
        setLoadingMessages(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    void loadMessages(activeId, true);
  }, [activeId, loadMessages]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let convChannel: ReturnType<ReturnType<typeof createClient>["channel"]> | undefined;

    void (async () => {
      await ensureSupportRealtimeAuth();
      if (cancelled) return;
      const supabase = createClient();
      convChannel = supabase
        .channel(`support-conv-user-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "support_conversations", filter: `user_id=eq.${userId}` },
          () => {
            void refreshList({ soft: true });
            const id = activeIdRef.current;
            if (id) void syncLatestMessages(id);
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (convChannel) void createClient().removeChannel(convChannel);
    };
  }, [userId, refreshList, syncLatestMessages]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    let msgChannel: ReturnType<ReturnType<typeof createClient>["channel"]> | undefined;

    void (async () => {
      await ensureSupportRealtimeAuth();
      if (cancelled) return;
      const supabase = createClient();
      msgChannel = supabase
        .channel(`support-msg-${activeId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${activeId}` },
          (payload) => {
            const row = payload.new as SupportMessageWithAttachments;
            setMessages((prev) => mergeSupportMessages(prev, [{ ...row, attachments: [] }]));
            void markConversationRead(activeId, false);
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

  const startNew = async (subject: string, firstMessage: string) => {
    if (!userId) return;
    const { conversation } = await createConversation(userId, subject, firstMessage);
    await refreshList({ soft: true });
    setActiveId(conversation.id);
  };

  const send = async (body: string, files: File[]) => {
    if (!userId || !activeId) return;
    const clientId = crypto.randomUUID();
    const optimistic: SupportMessageWithAttachments = {
      id: `temp-${clientId}`,
      conversation_id: activeId,
      sender_id: userId,
      sender_role: "user",
      body,
      is_internal: false,
      delivered_at: null,
      read_at: null,
      client_id: clientId,
      created_at: new Date().toISOString(),
      pending: true,
      attachments: [],
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const saved = await sendMessage({
        conversationId: activeId,
        senderId: userId,
        senderRole: "user",
        body,
        clientId,
        files,
      });
      setMessages((prev) => mergeSupportMessages(prev, [{ ...saved, pending: false }]));
      await refreshList({ soft: true });
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.client_id === clientId ? { ...m, pending: false, failed: true } : m))
      );
    }
  };

  const reopen = async (conversationId: string) => {
    await updateConversationStatus(conversationId, "open");
    await refreshList({ soft: true });
  };

  return {
    conversations,
    activeId,
    setActiveId,
    messages,
    loadingList,
    loadingMessages,
    hasMore,
    error,
    startNew,
    send,
    reopen,
    loadOlder: () => activeId && void loadMessages(activeId, false),
    refreshList,
    unreadTotal: conversations.filter(isConversationUnreadForUser).length,
  };
}
