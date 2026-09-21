CREATE TABLE IF NOT EXISTS internal_clinical_patients (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  medical_record_number TEXT NOT NULL,
  given_name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  second_family_name TEXT,
  birth_date DATE,
  age_years SMALLINT CHECK (age_years IS NULL OR (age_years >= 0 AND age_years <= 130)),
  dni TEXT,
  dni_norm TEXT,
  employee_number TEXT,
  employee_number_norm TEXT,
  search_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT internal_clinical_patients_tenant_record_unique UNIQUE (tenant_id, medical_record_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_internal_clinical_patients_tenant_dni
  ON internal_clinical_patients(tenant_id, dni_norm)
  WHERE dni_norm IS NOT NULL AND dni_norm <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_internal_clinical_patients_tenant_employee
  ON internal_clinical_patients(tenant_id, employee_number_norm)
  WHERE employee_number_norm IS NOT NULL AND employee_number_norm <> '';

CREATE INDEX IF NOT EXISTS idx_internal_clinical_patients_tenant_search
  ON internal_clinical_patients(tenant_id, search_name);

CREATE INDEX IF NOT EXISTS idx_internal_clinical_patients_tenant_created
  ON internal_clinical_patients(tenant_id, created_at DESC);

INSERT INTO internal_clinical_counters(name,value)
VALUES ('patient',0)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE internal_clinical_episodes
  ADD COLUMN IF NOT EXISTS patient_id TEXT REFERENCES internal_clinical_patients(id);

CREATE INDEX IF NOT EXISTS idx_internal_clinical_episodes_patient
  ON internal_clinical_episodes(tenant_id, patient_id, created_at DESC);
