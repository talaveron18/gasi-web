-- WEB_INFRA: make audit ownership explicit at storage level without trusting callers.
-- The runtime already injects actor_tenant_id from the authenticated worker into
-- metadata. A generated column makes that scope queryable/indexable and prevents
-- request payloads from choosing a different tenant_id column value.
ALTER TABLE internal_clinical_audit
  ADD COLUMN IF NOT EXISTS tenant_id TEXT GENERATED ALWAYS AS (
    COALESCE(NULLIF(btrim(metadata->>'actor_tenant_id'), ''), 'GASI-LEGACY')
  ) STORED;

ALTER TABLE internal_clinical_audit
  DROP CONSTRAINT IF EXISTS internal_clinical_audit_tenant_nonempty;
ALTER TABLE internal_clinical_audit
  ADD CONSTRAINT internal_clinical_audit_tenant_nonempty
  CHECK (btrim(tenant_id) <> '');

CREATE INDEX IF NOT EXISTS idx_internal_clinical_audit_tenant_time
  ON internal_clinical_audit(tenant_id, at DESC, seq DESC);

CREATE INDEX IF NOT EXISTS idx_internal_clinical_audit_tenant_episode_time
  ON internal_clinical_audit(tenant_id, episode_id, at DESC, seq DESC)
  WHERE episode_id IS NOT NULL;
