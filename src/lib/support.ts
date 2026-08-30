import { createClient } from "@/lib/supabase/client";
import type {
  ProfileSnippet as Profile,
  SupportAttachment,
  SupportConversation,
  SupportConversationStatus,
  SupportInternalNote,
  SupportMessage,
  SupportPriority,
  SupportSenderRole,
} from "@/lib/support-types";

function db() {
  return createClient();
}

export const SUPPORT_PAGE_SIZE = 40;
export const SUPPORT_ATTACH_BUCKET = "support-attachments";
export const SUPPORT_MAX_FILE_BYTES = 10 * 1024 * 1024;

export type SupportConversationWithUser = SupportConversation & {
  user?: Pick<Profile, "id" | "email" | "full_name" | "avatar_url" | "kyc_status" | "created_at" | "role"> | null;
  assigned_admin?: Pick<Profile, "id" | "email" | "full_name"> | null;
  unread_count?: number;
};

export type SupportMessageWithAttachments = SupportMessage & {
  attachments?: SupportAttachment[];
  pending?: boolean;
  failed?: boolean;
};

export type AdminSupportFilter = "all" | "open" | "pending" | "resolved" | "unread" | "high" | "archived";

function newClientId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function listUserConversations(userId: string): Promise<SupportConversation[]> {
  const { data, error } = await db()
    .from("support_conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listAdminConversations(
  filter: AdminSupportFilter = "all",
  search = ""
): Promise<SupportConversationWithUser[]> {
  let query = db()
    .from("support_conversations")
    .select("*")
    .order("pinned", { ascending: false })
    .order("last_message_at", { ascending: false });

  if (filter === "archived") query = query.eq("archived", true);
  else query = query.eq("archived", false);

  if (filter === "open" || filter === "pending" || filter === "resolved") {
    query = query.eq("status", filter);
  }
  if (filter === "high") query = query.eq("priority", "high");

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as SupportConversation[];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const adminIds = [...new Set(rows.map((r) => r.assigned_admin_id).filter(Boolean))] as string[];

  const [{ data: users }, { data: admins }] = await Promise.all([
    db().from("profiles").select("id, email, full_name, avatar_url, kyc_status, created_at, role").in("id", userIds),
    adminIds.length
      ? db().from("profiles").select("id, email, full_name").in("id", adminIds)
      : Promise.resolve({ data: [] as Pick<Profile, "id" | "email" | "full_name">[] }),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const adminMap = new Map((admins ?? []).map((a) => [a.id, a]));

  let result: SupportConversationWithUser[] = rows.map((row) => {
    const user = userMap.get(row.user_id) ?? null;
    const unread =
      !row.admin_last_read_at ||
      new Date(row.last_message_at).getTime() > new Date(row.admin_last_read_at).getTime()
        ? 1
        : 0;
    return {
      ...row,
      user,
      assigned_admin: row.assigned_admin_id ? adminMap.get(row.assigned_admin_id) ?? null : null,
      unread_count: unread,
    };
  });

  if (filter === "unread") {
    result = result.filter((r) => (r.unread_count ?? 0) > 0);
  }

  const q = search.trim().toLowerCase();
  if (q) {
    result = result.filter((r) => {
      const name = r.user?.full_name?.toLowerCase() ?? "";
      const email = r.user?.email?.toLowerCase() ?? "";
      const subject = r.subject.toLowerCase();
      return name.includes(q) || email.includes(q) || subject.includes(q) || r.id.toLowerCase().includes(q);
    });
  }

  return result;
}

export async function createConversation(
  userId: string,
  subject: string,
  firstMessage: string
): Promise<{ conversation: SupportConversation; message: SupportMessage }> {
  const { data: conversation, error } = await db()
    .from("support_conversations")
    .insert({
      user_id: userId,
      subject: subject.trim() || "Support request",
      status: "open",
    })
    .select()
    .single();
  if (error) throw error;

  const message = await sendMessage({
    conversationId: conversation.id,
    senderId: userId,
    senderRole: "user",
    body: firstMessage.trim(),
  });

  return { conversation, message };
}

export async function fetchMessages(
  conversationId: string,
  options?: { before?: string; limit?: number }
): Promise<SupportMessageWithAttachments[]> {
  const limit = options?.limit ?? SUPPORT_PAGE_SIZE;
  let query = db()
    .from("support_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.before) {
    query = query.lt("created_at", options.before);
  }

  const { data, error } = await query;
  if (error) throw error;

  const messages = ((data ?? []) as SupportMessage[]).reverse();
  if (messages.length === 0) return [];

  const ids = messages.map((m) => m.id);
  const { data: attachments } = await db()
    .from("support_attachments")
    .select("*")
    .in("message_id", ids);

  const byMsg = new Map<string, SupportAttachment[]>();
  for (const att of attachments ?? []) {
    const list = byMsg.get(att.message_id) ?? [];
    list.push(att);
    byMsg.set(att.message_id, list);
  }

  return messages.map((m) => ({ ...m, attachments: byMsg.get(m.id) ?? [] }));
}

/** Fetch messages created after a timestamp (for live sync without full reload). */
export async function fetchNewerMessages(
  conversationId: string,
  afterIso: string
): Promise<SupportMessageWithAttachments[]> {
  const { data, error } = await db()
    .from("support_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .gt("created_at", afterIso)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw error;

  const messages = (data ?? []) as SupportMessage[];
  if (messages.length === 0) return [];

  const ids = messages.map((m) => m.id);
  const { data: attachments } = await db()
    .from("support_attachments")
    .select("*")
    .in("message_id", ids);

  const byMsg = new Map<string, SupportAttachment[]>();
  for (const att of attachments ?? []) {
    const list = byMsg.get(att.message_id) ?? [];
    list.push(att);
    byMsg.set(att.message_id, list);
  }

  return messages.map((m) => ({ ...m, attachments: byMsg.get(m.id) ?? [] }));
}

/** Merge server messages into local list, replacing optimistic temps by client_id. */
export function mergeSupportMessages(
  prev: SupportMessageWithAttachments[],
  incoming: SupportMessageWithAttachments[]
): SupportMessageWithAttachments[] {
  if (incoming.length === 0) return prev;

  const next = [...prev];
  let changed = false;

  for (const row of incoming) {
    const byClientIdx =
      row.client_id != null
        ? next.findIndex((m) => m.client_id === row.client_id)
        : -1;
    const byIdIdx = next.findIndex((m) => m.id === row.id);
    const idx = byIdIdx >= 0 ? byIdIdx : byClientIdx;

    if (idx >= 0) {
      const prevRow = next[idx];
      next[idx] = {
        ...prevRow,
        ...row,
        pending: false,
        failed: false,
        attachments: row.attachments?.length ? row.attachments : prevRow.attachments,
      };
      changed = true;
      continue;
    }

    next.push({ ...row, pending: false });
    changed = true;
  }

  if (!changed) return prev;
  return next.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

/** Keep Realtime JWT in sync so RLS-filtered postgres_changes events are delivered. */
export async function ensureSupportRealtimeAuth() {
  const { data } = await db().auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    await db().realtime.setAuth(token);
  }
}

export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  senderRole: SupportSenderRole;
  body: string;
  isInternal?: boolean;
  clientId?: string;
  files?: File[];
}): Promise<SupportMessageWithAttachments> {
  const clientId = params.clientId ?? newClientId();
  const { data: message, error } = await db()
    .from("support_messages")
    .insert({
      conversation_id: params.conversationId,
      sender_id: params.senderId,
      sender_role: params.senderRole,
      body: params.body,
      is_internal: params.isInternal ?? false,
      client_id: clientId,
      delivered_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  const attachments: SupportAttachment[] = [];
  if (params.files?.length) {
    for (const file of params.files) {
      const att = await uploadAttachment({
        conversationId: params.conversationId,
        messageId: message.id,
        uploaderId: params.senderId,
        file,
      });
      attachments.push(att);
    }
  }

  return { ...message, attachments };
}

export async function uploadAttachment(params: {
  conversationId: string;
  messageId: string;
  uploaderId: string;
  file: File;
}): Promise<SupportAttachment> {
  if (params.file.size > SUPPORT_MAX_FILE_BYTES) {
    throw new Error("File exceeds 10MB limit");
  }

  const safeName = params.file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${params.uploaderId}/${params.conversationId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await db().storage
    .from(SUPPORT_ATTACH_BUCKET)
    .upload(path, params.file, { upsert: false, contentType: params.file.type });
  if (uploadError) throw uploadError;

  const { data, error } = await db()
    .from("support_attachments")
    .insert({
      message_id: params.messageId,
      conversation_id: params.conversationId,
      file_name: params.file.name,
      file_path: path,
      file_size: params.file.size,
      mime_type: params.file.type || "application/octet-stream",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAttachmentUrl(filePath: string): Promise<string> {
  const { data, error } = await db().storage
    .from(SUPPORT_ATTACH_BUCKET)
    .createSignedUrl(filePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function markConversationRead(conversationId: string, asAdmin: boolean) {
  const patch = asAdmin
    ? { admin_last_read_at: new Date().toISOString() }
    : { user_last_read_at: new Date().toISOString() };
  const { error } = await db().from("support_conversations").update(patch).eq("id", conversationId);
  if (error) throw error;

  // Mark peer messages as read
  const roleFilter = asAdmin ? "user" : "admin";
  await db()
    .from("support_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("sender_role", roleFilter)
    .is("read_at", null);
}

export async function updateConversationStatus(
  conversationId: string,
  status: SupportConversationStatus
) {
  const { data, error } = await db()
    .from("support_conversations")
    .update({ status, archived: status === "archived" })
    .eq("id", conversationId)
    .select()
    .single();
  if (error) throw error;
  return data as SupportConversation;
}

export async function setConversationPinned(conversationId: string, pinned: boolean) {
  const { data, error } = await db()
    .from("support_conversations")
    .update({ pinned })
    .eq("id", conversationId)
    .select()
    .single();
  if (error) throw error;
  return data as SupportConversation;
}

export async function setConversationPriority(conversationId: string, priority: SupportPriority) {
  const { data, error } = await db()
    .from("support_conversations")
    .update({ priority })
    .eq("id", conversationId)
    .select()
    .single();
  if (error) throw error;
  return data as SupportConversation;
}

export async function assignConversation(conversationId: string, adminId: string | null) {
  const { data, error } = await db()
    .from("support_conversations")
    .update({ assigned_admin_id: adminId })
    .eq("id", conversationId)
    .select()
    .single();
  if (error) throw error;
  return data as SupportConversation;
}

export async function archiveConversation(conversationId: string, archived = true) {
  const { data, error } = await db()
    .from("support_conversations")
    .update({
      archived,
      status: archived ? "archived" : "open",
    })
    .eq("id", conversationId)
    .select()
    .single();
  if (error) throw error;
  return data as SupportConversation;
}

export async function deleteConversation(conversationId: string) {
  const { error } = await db().from("support_conversations").delete().eq("id", conversationId);
  if (error) throw error;
}

export async function listInternalNotes(conversationId: string): Promise<SupportInternalNote[]> {
  const { data, error } = await db()
    .from("support_internal_notes")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addInternalNote(conversationId: string, adminId: string, body: string) {
  const { data, error } = await db()
    .from("support_internal_notes")
    .insert({ conversation_id: conversationId, admin_id: adminId, body: body.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as SupportInternalNote;
}

export async function listAdminStaff(): Promise<Pick<Profile, "id" | "email" | "full_name">[]> {
  const { data, error } = await db()
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "admin")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function isConversationUnreadForUser(c: SupportConversation) {
  if (!c.user_last_read_at) return true;
  return new Date(c.last_message_at).getTime() > new Date(c.user_last_read_at).getTime();
}

export const SUPPORT_EMOJI = [
  "😀", "🙂", "😊", "😅", "🙏", "👍", "👏", "🔥",
  "✅", "❌", "💡", "📎", "📄", "💰", "📈", "🏦",
  "🤝", "⏳", "🔒", "⭐", "🎉", "💬", "📞", "✉️",
];
