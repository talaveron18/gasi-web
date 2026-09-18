CREATE TABLE IF NOT EXISTS internal_clinical_workers (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('nurse','physician','psychologist','physiotherapist','admin')),
  display_name TEXT NOT NULL,
  centers JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  auth_version INTEGER NOT NULL DEFAULT 1,
  delegated_privileges JSONB NOT NULL DEFAULT '[]'::jsonb,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS internal_clinical_episodes (
  id TEXT PRIMARY KEY,
  center TEXT NOT NULL,
  patient_ref TEXT NOT NULL,
  discipline TEXT NOT NULL,
  level INTEGER,
  status TEXT NOT NULL,
  document JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_internal_clinical_episode_center_status ON internal_clinical_episodes(center,status);
CREATE INDEX IF NOT EXISTS idx_internal_clinical_episode_discipline_created ON internal_clinical_episodes(discipline,created_at DESC);

CREATE TABLE IF NOT EXISTS internal_clinical_audit (
  seq BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  episode_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_hash TEXT,
  event_hash TEXT NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_internal_clinical_audit_at ON internal_clinical_audit(at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_clinical_audit_episode_at ON internal_clinical_audit(episode_id,at DESC);

CREATE TABLE IF NOT EXISTS internal_clinical_counters (
  name TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0
);
INSERT INTO internal_clinical_counters(name,value) VALUES ('episode',0) ON CONFLICT (name) DO NOTHING;
