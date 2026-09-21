CREATE TABLE IF NOT EXISTS public_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  picture TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS public_users_email_lower_uq ON public_users ((lower(email)));

CREATE TABLE IF NOT EXISTS public_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS public_sessions_user_idx ON public_sessions(user_id);
CREATE INDEX IF NOT EXISTS public_sessions_expiry_idx ON public_sessions(expires_at);

CREATE TABLE IF NOT EXISTS public_login_throttle (
  key_hash TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL,
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public_courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration TEXT NOT NULL,
  course_type TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_free BOOLEAN NOT NULL DEFAULT TRUE,
  thumbnail TEXT,
  modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public_enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public_users(id) ON DELETE RESTRICT,
  course_id TEXT NOT NULL REFERENCES public_courses(id) ON DELETE RESTRICT,
  progress NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed_module_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ,
  certificate_id TEXT UNIQUE,
  payment_status TEXT,
  stripe_checkout_session_id TEXT,
  stripe_event_id TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);
CREATE INDEX IF NOT EXISTS public_enrollments_course_idx ON public_enrollments(course_id);
CREATE INDEX IF NOT EXISTS public_enrollments_user_idx ON public_enrollments(user_id);

CREATE TABLE IF NOT EXISTS public_course_materials (
  material_id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES public_courses(id) ON DELETE RESTRICT,
  module_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/pdf',
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 26214400),
  content BYTEA NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DELETING')),
  created_by TEXT NOT NULL REFERENCES public_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS public_course_materials_course_module_idx ON public_course_materials(course_id,module_id);
CREATE INDEX IF NOT EXISTS public_course_materials_course_status_idx ON public_course_materials(course_id,status);

CREATE TABLE IF NOT EXISTS public_payment_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
