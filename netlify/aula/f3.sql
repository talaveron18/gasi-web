-- F3 incremental migration. Run AFTER schema.sql on the isolated private Aula database.
-- Idempotent DDL; no data from real learners is added.
BEGIN;
CREATE TABLE IF NOT EXISTS aula_test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES aula_units(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK(position BETWEEN 1 AND 15),
  prompt text NOT NULL CHECK(length(prompt) BETWEEN 10 AND 2000),
  options jsonb NOT NULL CHECK(jsonb_typeof(options)='array' AND jsonb_array_length(options)=3),
  correct_index integer NOT NULL CHECK(correct_index BETWEEN 0 AND 2),
  explanation text NOT NULL DEFAULT '',
  UNIQUE(unit_id,position)
);
CREATE INDEX IF NOT EXISTS aula_test_questions_unit_idx ON aula_test_questions(unit_id);
CREATE TABLE IF NOT EXISTS aula_test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES aula_enrollments(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES aula_units(id) ON DELETE CASCADE,
  question_ids uuid[] NOT NULL CHECK(array_length(question_ids,1)=10),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer CHECK(score BETWEEN 0 AND 10),
  passed boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  CHECK ((submitted_at IS NULL AND score IS NULL AND passed IS NULL)
      OR (submitted_at IS NOT NULL AND score IS NOT NULL AND passed IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS aula_test_attempts_recent_idx ON aula_test_attempts(enrollment_id,unit_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS aula_test_attempt_one_pending_idx
 ON aula_test_attempts(enrollment_id,unit_id) WHERE submitted_at IS NULL;
CREATE TABLE IF NOT EXISTS aula_practice_assignments (
  unit_id uuid PRIMARY KEY REFERENCES aula_units(id) ON DELETE CASCADE,
  title text NOT NULL CHECK(length(title) BETWEEN 3 AND 180),
  prompt text NOT NULL CHECK(length(prompt) BETWEEN 10 AND 6000),
  reference_solution text NOT NULL CHECK(length(reference_solution) BETWEEN 10 AND 8000),
  rubric jsonb NOT NULL CHECK(jsonb_typeof(rubric)='array' AND jsonb_array_length(rubric)>=4
       AND jsonb_array_length(rubric)<=12),
  min_per_criterion integer NOT NULL DEFAULT 2 CHECK(min_per_criterion BETWEEN 1 AND 4)
);
CREATE TABLE IF NOT EXISTS aula_practice_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES aula_enrollments(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES aula_units(id) ON DELETE CASCADE,
  answer text NOT NULL CHECK(length(answer) BETWEEN 30 AND 10000),
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  grades jsonb,
  tutor_feedback text,
  reviewed_by uuid REFERENCES aula_users(id),
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aula_practice_submissions_queue_idx ON aula_practice_submissions(status,submitted_at);
CREATE INDEX IF NOT EXISTS aula_practice_submissions_student_idx ON aula_practice_submissions(enrollment_id,unit_id,submitted_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS aula_practice_one_pending_idx
 ON aula_practice_submissions(enrollment_id,unit_id) WHERE status='pending';
COMMIT;
