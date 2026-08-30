export type SupportConversationStatus = "open" | "pending" | "resolved" | "archived";
export type SupportPriority = "normal" | "high";
export type SupportSenderRole = "user" | "admin" | "system";

export type SupportConversation = {
  id: string;
  user_id: string;
  subject: string;
  status: SupportConversationStatus;
  priority: SupportPriority;
  assigned_admin_id: string | null;
  pinned: boolean;
  archived: boolean;
  last_message_at: string;
  last_message_preview: string | null;
  user_last_read_at: string | null;
  admin_last_read_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: SupportSenderRole;
  body: string;
  is_internal: boolean;
  delivered_at: string | null;
  read_at: string | null;
  client_id: string | null;
  created_at: string;
};

export type SupportAttachment = {
  id: string;
  message_id: string;
  conversation_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
};

export type SupportInternalNote = {
  id: string;
  conversation_id: string;
  admin_id: string;
  body: string;
  created_at: string;
};

export type ProfileSnippet = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url?: string | null;
  kyc_status?: string;
  created_at?: string;
  role?: string;
};
