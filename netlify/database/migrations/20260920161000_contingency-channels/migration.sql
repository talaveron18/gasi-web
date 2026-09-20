CREATE TABLE IF NOT EXISTS internal_contingency_channels (
  tenant_id TEXT NOT NULL,
  center TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  label TEXT NOT NULL,
  target TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_id TEXT NOT NULL REFERENCES internal_clinical_workers(id),
  PRIMARY KEY (tenant_id, center),
  CONSTRAINT internal_contingency_tenant_shape CHECK (
    char_length(btrim(tenant_id)) BETWEEN 1 AND 80
    AND tenant_id <> '__MASTER__'
  ),
  CONSTRAINT internal_contingency_center_shape CHECK (
    char_length(btrim(center)) BETWEEN 1 AND 160
  ),
  CONSTRAINT internal_contingency_type CHECK (
    channel_type IN ('PHONE','URL','REFERENCE')
  ),
  CONSTRAINT internal_contingency_label_shape CHECK (
    char_length(btrim(label)) BETWEEN 1 AND 160
  ),
  CONSTRAINT internal_contingency_target_shape CHECK (
    char_length(btrim(target)) BETWEEN 1 AND 500
  )
);

CREATE INDEX IF NOT EXISTS idx_internal_contingency_tenant_active
  ON internal_contingency_channels(tenant_id, active, center);
