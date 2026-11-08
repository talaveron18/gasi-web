-- F5: course competencies and authored reference resources, append only.
ALTER TABLE aula_courses ADD COLUMN competencies jsonb NOT NULL DEFAULT '[]'::jsonb
 CHECK(jsonb_typeof(competencies)='array');
ALTER TABLE aula_units ADD COLUMN resources jsonb NOT NULL DEFAULT '[]'::jsonb
 CHECK(jsonb_typeof(resources)='array');
