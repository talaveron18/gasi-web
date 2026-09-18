CREATE TABLE IF NOT EXISTS internal_timeclock_devices (
  id TEXT PRIMARY KEY,
  center TEXT NOT NULL,
  label TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  auth_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_internal_timeclock_devices_center_active
  ON internal_timeclock_devices(center, active);

CREATE TABLE IF NOT EXISTS internal_timeclock_events (
  id UUID PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES internal_clinical_workers(id),
  center TEXT NOT NULL,
  device_id TEXT NOT NULL REFERENCES internal_timeclock_devices(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('IN','OUT')),
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_internal_timeclock_events_worker_at
  ON internal_timeclock_events(worker_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_internal_timeclock_events_center_at
  ON internal_timeclock_events(center, occurred_at DESC);

CREATE TABLE IF NOT EXISTS internal_timeclock_corrections (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES internal_timeclock_events(id),
  replacement_event_type TEXT CHECK (replacement_event_type IN ('IN','OUT')),
  replacement_occurred_at TIMESTAMPTZ,
  reason TEXT NOT NULL,
  corrected_by_id TEXT NOT NULL REFERENCES internal_clinical_workers(id),
  corrected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_internal_timeclock_corrections_event
  ON internal_timeclock_corrections(event_id, corrected_at DESC);
