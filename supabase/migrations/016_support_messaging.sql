-- Support conversations, messages, attachments, notes, realtime, notifications

CREATE TYPE support_conversation_status AS ENUM ('open', 'pending', 'resolved', 'archived');
CREATE TYPE support_priority AS ENUM ('normal', 'high');
CREATE TYPE support_sender_role AS ENUM ('user', 'admin', 'system');

CREATE TABLE IF NOT EXISTS support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT 'Support request',
  status support_conversation_status NOT NULL DEFAULT 'open',
  priority support_priority NOT NULL DEFAULT 'normal',
  assigned_admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  archived BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_preview TEXT,
  user_last_read_at TIMESTAMPTZ,
  admin_last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_role support_sender_role NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  is_internal BOOLEAN NOT NULL DEFAULT false,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  client_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES support_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_conv_user ON support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conv_status ON support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_conv_last_msg ON support_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conv_assigned ON support_conversations(assigned_admin_id);
CREATE INDEX IF NOT EXISTS idx_support_conv_pinned ON support_conversations(pinned) WHERE pinned = true;
CREATE INDEX IF NOT EXISTS idx_support_msg_conv_created ON support_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_msg_client ON support_messages(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_att_message ON support_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_support_notes_conv ON support_internal_notes(conversation_id, created_at DESC);

ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_conv_select ON support_conversations FOR SELECT
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY support_conv_insert ON support_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin());
CREATE POLICY support_conv_update ON support_conversations FOR UPDATE
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY support_conv_delete ON support_conversations FOR DELETE
  USING (is_admin());

CREATE POLICY support_msg_select ON support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations c
      WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR is_admin())
    )
    AND (is_internal = false OR is_admin())
  );
CREATE POLICY support_msg_insert ON support_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM support_conversations c
      WHERE c.id = conversation_id
        AND (
          (c.user_id = auth.uid() AND sender_role = 'user' AND is_internal = false)
          OR (is_admin() AND sender_role IN ('admin', 'system'))
        )
    )
  );
CREATE POLICY support_msg_update ON support_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations c
      WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY support_att_select ON support_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_conversations c
      WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR is_admin())
    )
  );
CREATE POLICY support_att_insert ON support_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_conversations c
      WHERE c.id = conversation_id AND (c.user_id = auth.uid() OR is_admin())
    )
  );
CREATE POLICY support_att_delete ON support_attachments FOR DELETE
  USING (is_admin());

CREATE POLICY support_notes_select ON support_internal_notes FOR SELECT USING (is_admin());
CREATE POLICY support_notes_insert ON support_internal_notes FOR INSERT WITH CHECK (is_admin() AND admin_id = auth.uid());
CREATE POLICY support_notes_delete ON support_internal_notes FOR DELETE USING (is_admin());

CREATE OR REPLACE FUNCTION support_after_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv support_conversations%ROWTYPE;
  preview TEXT;
  user_email TEXT;
BEGIN
  preview := CASE
    WHEN NEW.is_internal THEN '[Internal note]'
    WHEN length(NEW.body) > 120 THEN left(NEW.body, 117) || '...'
    ELSE NEW.body
  END;

  UPDATE support_conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = preview,
    updated_at = NOW(),
    status = CASE
      WHEN status = 'resolved' AND NEW.sender_role = 'user' AND NEW.is_internal = false THEN 'open'::support_conversation_status
      WHEN NEW.sender_role = 'admin' AND NEW.is_internal = false AND status = 'open' THEN 'pending'::support_conversation_status
      ELSE status
    END
  WHERE id = NEW.conversation_id
  RETURNING * INTO conv;

  NEW.delivered_at := COALESCE(NEW.delivered_at, NOW());

  IF NEW.is_internal = false THEN
    SELECT email INTO user_email FROM profiles WHERE id = conv.user_id;

    IF NEW.sender_role = 'admin' THEN
      PERFORM create_notification(
        conv.user_id,
        'Support replied',
        COALESCE(NULLIF(NEW.body, ''), 'You have a new reply from support.')
      );
    ELSIF NEW.sender_role = 'user' THEN
      PERFORM notify_all_admins(
        'New support message',
        COALESCE(user_email, 'A user') || ': ' || COALESCE(NULLIF(left(NEW.body, 80), ''), 'Sent an attachment')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_support_after_message
  BEFORE INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION support_after_message();

CREATE OR REPLACE FUNCTION support_notify_conversation_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM profiles WHERE id = NEW.user_id;
  PERFORM notify_all_admins(
    'New support conversation',
    COALESCE(user_email, 'A user') || ' opened: ' || NEW.subject
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_support_conv_created
  AFTER INSERT ON support_conversations
  FOR EACH ROW
  EXECUTE FUNCTION support_notify_conversation_created();

CREATE OR REPLACE FUNCTION support_notify_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'resolved' THEN
      PERFORM create_notification(
        NEW.user_id,
        'Ticket resolved',
        'Your support ticket "' || NEW.subject || '" was marked resolved.'
      );
    ELSIF OLD.status = 'resolved' AND NEW.status IN ('open', 'pending') THEN
      PERFORM create_notification(
        NEW.user_id,
        'Ticket reopened',
        'Your support ticket "' || NEW.subject || '" was reopened.'
      );
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_support_status_change
  BEFORE UPDATE ON support_conversations
  FOR EACH ROW
  EXECUTE FUNCTION support_notify_status_change();

CREATE OR REPLACE FUNCTION support_notify_attachment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv support_conversations%ROWTYPE;
  user_email TEXT;
  msg_role support_sender_role;
BEGIN
  SELECT * INTO conv FROM support_conversations WHERE id = NEW.conversation_id;
  SELECT sender_role INTO msg_role FROM support_messages WHERE id = NEW.message_id;
  SELECT email INTO user_email FROM profiles WHERE id = conv.user_id;

  IF msg_role = 'user' THEN
    PERFORM notify_all_admins(
      'Support attachment uploaded',
      COALESCE(user_email, 'A user') || ' uploaded ' || NEW.file_name
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_support_attachment
  AFTER INSERT ON support_attachments
  FOR EACH ROW
  EXECUTE FUNCTION support_notify_attachment();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments',
  'support-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY support_storage_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'support-attachments'
    AND (is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
  );

CREATE POLICY support_storage_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
  );

CREATE POLICY support_storage_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'support-attachments'
    AND (is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)
  );

ALTER TABLE support_conversations REPLICA IDENTITY FULL;
ALTER TABLE support_messages REPLICA IDENTITY FULL;
ALTER TABLE support_attachments REPLICA IDENTITY FULL;
ALTER TABLE support_internal_notes REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_conversations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_attachments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE support_attachments;
  END IF;
END $$;
