-- F6: follow-up/final surveys and durable, private course certificates.
CREATE TABLE aula_surveys(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 course_id uuid NOT NULL REFERENCES aula_courses(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('followup','final')),
 title text NOT NULL CHECK(length(title) BETWEEN 5 AND 180),
 unit_id uuid REFERENCES aula_units(id),
 questions jsonb NOT NULL CHECK(jsonb_typeof(questions)='array' AND jsonb_array_length(questions) BETWEEN 1 AND 20),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX aula_surveys_one_final_per_course ON aula_surveys(course_id) WHERE kind='final';
CREATE TABLE aula_survey_answers(
 survey_id uuid NOT NULL REFERENCES aula_surveys(id) ON DELETE CASCADE,
 enrollment_id uuid NOT NULL REFERENCES aula_enrollments(id) ON DELETE CASCADE,
 responses jsonb NOT NULL CHECK(jsonb_typeof(responses)='object'),
 submitted_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(survey_id,enrollment_id)
);
CREATE INDEX aula_survey_answers_enrollment_idx ON aula_survey_answers(enrollment_id,submitted_at);
CREATE TABLE aula_certificates(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 enrollment_id uuid NOT NULL UNIQUE REFERENCES aula_enrollments(id) ON DELETE CASCADE,
 certificate_code text NOT NULL UNIQUE CHECK(length(certificate_code) BETWEEN 20 AND 64),
 issued_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aula_certificates_issued_idx ON aula_certificates(issued_at);
