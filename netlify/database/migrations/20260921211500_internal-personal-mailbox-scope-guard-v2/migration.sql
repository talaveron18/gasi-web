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

DROP TRIGGER IF EXISTS internal_personal_mailbox_scope_guard
  ON internal_personal_mailbox_messages;
CREATE TRIGGER internal_personal_mailbox_scope_guard
BEFORE INSERT OR UPDATE OF tenant_id, center_id, sender_worker_id, recipient_worker_id
ON internal_personal_mailbox_messages
FOR EACH ROW
EXECUTE FUNCTION enforce_internal_personal_mailbox_scope();

REVOKE UPDATE (tenant_id, center_id, sender_worker_id, recipient_worker_id, subject, body, created_at)
ON internal_personal_mailbox_messages FROM PUBLIC;
