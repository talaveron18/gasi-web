ALTER TABLE internal_center_workstations
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ NULL;
