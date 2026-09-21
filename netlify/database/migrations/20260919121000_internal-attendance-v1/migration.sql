CREATE TABLE IF NOT EXISTS internal_center_workstations (
  id TEXT PRIMARY KEY,
  center TEXT NOT NULL,
  label TEXT NOT NULL,
  credential_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_internal_center_workstations_center_active
  ON internal_center_workstations(center, active);

CREATE TABLE IF NOT EXISTS internal_attendance_events (
  seq BIGSERIAL PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES internal_clinical_workers(id),
  center TEXT NOT NULL,
  workstation_id TEXT NOT NULL REFERENCES internal_center_workstations(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('CLOCK_IN','CLOCK_OUT','CORRECTION')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  related_event_seq BIGINT REFERENCES internal_attendance_events(seq),
  reason TEXT,
  actor_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_internal_attendance_worker_time
  ON internal_attendance_events(worker_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_attendance_center_time
  ON internal_attendance_events(center, occurred_at DESC);

CREATE OR REPLACE FUNCTION internal_attendance_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'internal_attendance_events are append-only';
END;
$$;

DROP TRIGGER IF EXISTS internal_attendance_no_update_delete ON internal_attendance_events;
CREATE TRIGGER internal_attendance_no_update_delete
BEFORE UPDATE OR DELETE ON internal_attendance_events
FOR EACH ROW EXECUTE FUNCTION internal_attendance_immutable();
