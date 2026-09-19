ALTER TABLE internal_center_workstations
  ADD COLUMN IF NOT EXISTS network_fingerprint_hash TEXT NULL;
