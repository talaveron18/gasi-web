ALTER TABLE internal_clinical_workers
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'GASI-LEGACY';

ALTER TABLE internal_clinical_episodes
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'GASI-LEGACY';

ALTER TABLE internal_center_workstations
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'GASI-LEGACY';

ALTER TABLE internal_attendance_events
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'GASI-LEGACY';

ALTER TABLE internal_clinical_workers
  DROP CONSTRAINT IF EXISTS internal_clinical_workers_tenant_nonempty;
ALTER TABLE internal_clinical_workers
  ADD CONSTRAINT internal_clinical_workers_tenant_nonempty CHECK (btrim(tenant_id) <> '');

ALTER TABLE internal_clinical_episodes
  DROP CONSTRAINT IF EXISTS internal_clinical_episodes_tenant_nonempty;
ALTER TABLE internal_clinical_episodes
  ADD CONSTRAINT internal_clinical_episodes_tenant_nonempty CHECK (btrim(tenant_id) <> '');

ALTER TABLE internal_center_workstations
  DROP CONSTRAINT IF EXISTS internal_center_workstations_tenant_nonempty;
ALTER TABLE internal_center_workstations
  ADD CONSTRAINT internal_center_workstations_tenant_nonempty CHECK (btrim(tenant_id) <> '');

ALTER TABLE internal_attendance_events
  DROP CONSTRAINT IF EXISTS internal_attendance_events_tenant_nonempty;
ALTER TABLE internal_attendance_events
  ADD CONSTRAINT internal_attendance_events_tenant_nonempty CHECK (btrim(tenant_id) <> '');

DROP INDEX IF EXISTS uq_internal_center_workstations_center;
CREATE UNIQUE INDEX IF NOT EXISTS uq_internal_center_workstations_tenant_center
  ON internal_center_workstations(tenant_id, center);

CREATE INDEX IF NOT EXISTS idx_internal_clinical_workers_tenant
  ON internal_clinical_workers(tenant_id, role, active);

CREATE INDEX IF NOT EXISTS idx_internal_clinical_episode_tenant_center_status
  ON internal_clinical_episodes(tenant_id, center, status);

CREATE INDEX IF NOT EXISTS idx_internal_attendance_tenant_worker_time
  ON internal_attendance_events(tenant_id, worker_id, occurred_at DESC);
