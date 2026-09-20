ALTER TABLE internal_clinical_workers
  DROP CONSTRAINT IF EXISTS internal_clinical_workers_tenant_shape;
ALTER TABLE internal_clinical_workers
  ADD CONSTRAINT internal_clinical_workers_tenant_shape
  CHECK (char_length(btrim(tenant_id)) BETWEEN 1 AND 80);

ALTER TABLE internal_clinical_episodes
  DROP CONSTRAINT IF EXISTS internal_clinical_episodes_tenant_shape;
ALTER TABLE internal_clinical_episodes
  ADD CONSTRAINT internal_clinical_episodes_tenant_shape
  CHECK (char_length(btrim(tenant_id)) BETWEEN 1 AND 80 AND tenant_id <> '__MASTER__');

ALTER TABLE internal_center_workstations
  DROP CONSTRAINT IF EXISTS internal_center_workstations_tenant_shape;
ALTER TABLE internal_center_workstations
  ADD CONSTRAINT internal_center_workstations_tenant_shape
  CHECK (char_length(btrim(tenant_id)) BETWEEN 1 AND 80 AND tenant_id <> '__MASTER__');

ALTER TABLE internal_attendance_events
  DROP CONSTRAINT IF EXISTS internal_attendance_events_tenant_shape;
ALTER TABLE internal_attendance_events
  ADD CONSTRAINT internal_attendance_events_tenant_shape
  CHECK (char_length(btrim(tenant_id)) BETWEEN 1 AND 80 AND tenant_id <> '__MASTER__');
