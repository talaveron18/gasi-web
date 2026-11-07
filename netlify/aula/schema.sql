-- F1/F2 GASI Aula Virtual. Run with psql ON_ERROR_STOP=1 on a *private*
-- PostgreSQL database; no production/student data seeded by this migration.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS aula_users(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK(email=lower(email)),
  name text NOT NULL CHECK(length(name) BETWEEN 2 AND 160),
  role text NOT NULL CHECK(role IN ('admin','author','tutor','student')),
  password_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS aula_sessions(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES aula_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aula_sessions_active_idx ON aula_sessions(user_id,expires_at) WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS aula_login_attempts(
  key_hash text PRIMARY KEY,
  failures integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS aula_courses(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK(length(title) BETWEEN 3 AND 180),
  objective text NOT NULL DEFAULT '',
  target_audience text NOT NULL DEFAULT '',
  requirements text NOT NULL DEFAULT '',
  presentation text NOT NULL DEFAULT '',
  duration_hours integer NOT NULL DEFAULT 1 CHECK(duration_hours BETWEEN 1 AND 2000),
  access_days integer NOT NULL DEFAULT 90 CHECK(access_days BETWEEN 1 AND 730),
  max_units_per_day integer CHECK(max_units_per_day IS NULL OR max_units_per_day BETWEEN 1 AND 100),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','archived')),
  created_by uuid NOT NULL REFERENCES aula_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS aula_units(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES aula_courses(id) ON DELETE CASCADE,
  unit_no integer NOT NULL CHECK(unit_no>=0),
  title text NOT NULL CHECK(length(title) BETWEEN 3 AND 180),
  introduction text NOT NULL DEFAULT '',
  content_blocks jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(content_blocks)='array'),
  learning_outcomes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(learning_outcomes)='array'),
  requires_test boolean NOT NULL DEFAULT false,
  requires_practice boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id,unit_no)
);
CREATE INDEX IF NOT EXISTS aula_units_course_idx ON aula_units(course_id,unit_no);
CREATE TABLE IF NOT EXISTS aula_course_tutors(
  course_id uuid NOT NULL REFERENCES aula_courses(id) ON DELETE CASCADE,
  tutor_id uuid NOT NULL REFERENCES aula_users(id),
  PRIMARY KEY(course_id,tutor_id)
);
CREATE TABLE IF NOT EXISTS aula_enrollments(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES aula_courses(id),
  student_id uuid NOT NULL REFERENCES aula_users(id),
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','revoked','completed')),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  deadline timestamptz NOT NULL,
  UNIQUE(course_id,student_id)
);
CREATE INDEX IF NOT EXISTS aula_enrollments_student_idx ON aula_enrollments(student_id,status);
CREATE TABLE IF NOT EXISTS aula_unit_progress(
  enrollment_id uuid NOT NULL REFERENCES aula_enrollments(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES aula_units(id) ON DELETE CASCADE,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  viewed_seconds integer NOT NULL DEFAULT 0 CHECK(viewed_seconds>=0),
  completed_at timestamptz,
  test_passed_at timestamptz,
  practice_approved_at timestamptz,
  PRIMARY KEY(enrollment_id,unit_id)
);
CREATE TABLE IF NOT EXISTS aula_audit(
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES aula_users(id),
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS aula_audit_actor_idx ON aula_audit(actor_id,occurred_at DESC);
COMMIT;
