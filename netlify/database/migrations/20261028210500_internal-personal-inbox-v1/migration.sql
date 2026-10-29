CREATE TABLE IF NOT EXISTS internal_personal_messages (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  center TEXT NOT NULL,
  sender_worker_id TEXT NOT NULL REFERENCES internal_clinical_workers(id),
  recipient_worker_id TEXT NOT NULL REFERENCES internal_clinical_workers(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ NULL,
  CONSTRAINT internal_personal_messages_tenant_nonempty CHECK (btrim(tenant_id) <> ''),
  CONSTRAINT internal_personal_messages_center_nonempty CHECK (btrim(center) <> ''),
  CONSTRAINT internal_personal_messages_subject_nonempty CHECK (btrim(subject) <> ''),
  CONSTRAINT internal_personal_messages_body_nonempty CHECK (btrim(body) <> ''),
  CONSTRAINT internal_personal_messages_not_self CHECK (sender_worker_id <> recipient_worker_id)
);

-- Inbox access is intentionally keyed by tenant + center + recipient. Runtime
-- routes must derive these values from the authenticated actor; callers must
-- never be allowed to supply an arbitrary tenant when listing/reading mail.
CREATE INDEX IF NOT EXISTS idx_internal_personal_messages_inbox
  ON internal_personal_messages(tenant_id, center, recipient_worker_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_internal_personal_messages_sent
  ON internal_personal_messages(tenant_id, center, sender_worker_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_internal_personal_messages_unread
  ON internal_personal_messages(tenant_id, center, recipient_worker_id, created_at DESC)
  WHERE read_at IS NULL;
