-- F4: forums, tutor correspondence and per-unit feedback. Private Aula only.
CREATE TABLE aula_forum_threads(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 course_id uuid NOT NULL REFERENCES aula_courses(id) ON DELETE CASCADE,
 created_by uuid NOT NULL REFERENCES aula_users(id),
 title text NOT NULL CHECK(length(title) BETWEEN 8 AND 180),
 locked boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aula_forum_threads_course_idx ON aula_forum_threads(course_id,created_at DESC);
CREATE TABLE aula_forum_posts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 thread_id uuid NOT NULL REFERENCES aula_forum_threads(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES aula_users(id),
 body text NOT NULL CHECK(length(body) BETWEEN 2 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX aula_forum_posts_thread_idx ON aula_forum_posts(thread_id,created_at);
CREATE TABLE aula_tutorial_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 course_id uuid NOT NULL REFERENCES aula_courses(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES aula_users(id),
 question text NOT NULL CHECK(length(question) BETWEEN 10 AND 4000),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','answered','closed')),
 answer text,
 answered_by uuid REFERENCES aula_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 answered_at timestamptz
);
CREATE INDEX aula_tutorial_requests_course_idx ON aula_tutorial_requests(course_id,status,created_at);
CREATE INDEX aula_tutorial_requests_student_idx ON aula_tutorial_requests(student_id,created_at);
CREATE TABLE aula_unit_ratings(
 enrollment_id uuid NOT NULL REFERENCES aula_enrollments(id) ON DELETE CASCADE,
 unit_id uuid NOT NULL REFERENCES aula_units(id) ON DELETE CASCADE,
 rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),
 comment text NOT NULL DEFAULT '' CHECK(length(comment)<=2000),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(enrollment_id,unit_id)
);
CREATE INDEX aula_unit_ratings_unit_idx ON aula_unit_ratings(unit_id);
