CREATE OR REPLACE FUNCTION enforce_internal_personal_mailbox_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  sender_tenant text;
  sender_centers jsonb;
  sender_active boolean;
  recipient_tenant text;
  recipient_centers jsonb;
  recipient_active boolean;
BEGIN
  -- Message identity, routing and original content are append-only. Read/archive
  -- state may change, but an existing message must never be rewritten or moved.
  IF TG_OP = 'UPDATE' AND (
       NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.center_id IS DISTINCT FROM OLD.center_id
    OR NEW.sender_worker_id IS DISTINCT FROM OLD.sender_worker_id
    OR NEW.recipient_worker_id IS DISTINCT FROM OLD.recipient_worker_id
    OR NEW.subject IS DISTINCT FROM OLD.subject
    OR NEW.body IS DISTINCT FROM OLD.body
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'mailbox_message_immutable' USING ERRCODE = '23514';
  END IF;

  SELECT tenant_id, centers, active
    INTO sender_tenant, sender_centers, sender_active
    FROM internal_clinical_workers
   WHERE id = NEW.sender_worker_id;

  SELECT tenant_id, centers, active
    INTO recipient_tenant, recipient_centers, recipient_active
    FROM internal_clinical_workers
   WHERE id = NEW.recipient_worker_id;

  IF sender_tenant IS NULL OR recipient_tenant IS NULL THEN
    RAISE EXCEPTION 'mailbox_worker_not_found' USING ERRCODE = '23503';
  END IF;
  IF NOT sender_active OR NOT recipient_active THEN
    RAISE EXCEPTION 'mailbox_worker_inactive' USING ERRCODE = '23514';
  END IF;
  IF NEW.tenant_id = '__MASTER__'
     OR sender_tenant <> NEW.tenant_id
     OR recipient_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'mailbox_cross_tenant_denied' USING ERRCODE = '23514';
  END IF;
  IF NOT COALESCE(sender_centers, '[]'::jsonb) ? NEW.center_id
     OR NOT COALESCE(recipient_centers, '[]'::jsonb) ? NEW.center_id THEN
    RAISE EXCEPTION 'mailbox_cross_center_denied' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

-- Run the guard for every update: immutable payload changes must be rejected,
-- while legitimate read/archive state transitions remain possible.
DROP TRIGGER IF EXISTS internal_personal_mailbox_scope_guard
  ON internal_personal_mailbox_messages;
CREATE TRIGGER internal_personal_mailbox_scope_guard
BEFORE INSERT OR UPDATE
ON internal_personal_mailbox_messages
FOR EACH ROW
EXECUTE FUNCTION enforce_internal_personal_mailbox_scope();
