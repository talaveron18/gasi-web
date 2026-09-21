-- Supports tenant-scoped episode collection queries without cross-tenant table scans.
-- This is a performance/control prerequisite; authorization remains enforced by the application query and RBAC.
CREATE INDEX IF NOT EXISTS idx_internal_clinical_episodes_center_created_at
  ON internal_clinical_episodes (center, created_at DESC);
