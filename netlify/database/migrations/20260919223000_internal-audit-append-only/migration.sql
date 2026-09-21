CREATE OR REPLACE FUNCTION internal_clinical_audit_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'internal clinical audit is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_internal_clinical_audit_immutable ON internal_clinical_audit;
CREATE TRIGGER trg_internal_clinical_audit_immutable
BEFORE UPDATE OR DELETE ON internal_clinical_audit
FOR EACH ROW EXECUTE FUNCTION internal_clinical_audit_immutable();
