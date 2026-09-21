CREATE TABLE IF NOT EXISTS internal_personal_mailbox_messages (
  id uuid PRIMARY KEY,
  tenant_id text NOT NULL,
  center_id text NOT NULL,
  sender_worker_id text NOT NULL,
  recipient_worker_id text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  archived_at timestamptz,
  CONSTRAINT internal_personal_mailbox_tenant_shape CHECK (char_length(btrim(tenant_id)) BETWEEN 1 AND 80 AND tenant_id <> '__MASTER__'),
  CONSTRAINT internal_personal_mailbox_center_shape CHECK (char_length(btrim(center_id)) BETWEEN 1 AND 120),
  CONSTRAINT internal_personal_mailbox_subject_shape CHECK (char_length(btrim(subject)) BETWEEN 1 AND 160),
  CONSTRAINT internal_personal_mailbox_body_shape CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000),
  CONSTRAINT internal_personal_mailbox_sender_recipient CHECK (sender_worker_id <> recipient_worker_id),
  CONSTRAINT internal_personal_mailbox_sender_fk FOREIGN KEY (sender_worker_id) REFERENCES internal_clinical_workers(id) ON DELETE RESTRICT,
  CONSTRAINT internal_personal_mailbox_recipient_fk FOREIGN KEY (recipient_worker_id) REFERENCES internal_clinical_workers(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS internal_personal_mailbox_recipient_idx
  ON internal_personal_mailbox_messages (tenant_id, recipient_worker_id, center_id, created_at DESC);
CREATE INDEX IF NOT EXISTS internal_personal_mailbox_sender_idx
  ON internal_personal_mailbox_messages (tenant_id, sender_worker_id, center_id, created_at DESC);

COMMENT ON TABLE internal_personal_mailbox_messages IS
  'Personal operational mailbox. Clinical records and patient identifiers must not be stored here.';
