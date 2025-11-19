-- Schema: GoGetScholarship
-- Purpose: Core relational + vector tables used for scholarship ingestion,
-- retrieval (pgvector), personality profiles, and essay drafts.
-- Notes:
-- - Embedding dimension defaults to 1024 (Voyage 3.5). Keep in sync with ENV.EMBED_DIM.
-- - Use `vector_cosine_ops` for cosine distance `<=>` and HNSW index.

-- Enable pgvector once
CREATE EXTENSION IF NOT EXISTS vector;

-- Scholarships
CREATE TABLE scholarships (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  sponsor text,
  url text,
  raw_text text NOT NULL,
  min_gpa numeric(3,2),
  country text,
  fields text[],
  metadata jsonb DEFAULT '{}'::jsonb
);

COMMENT ON TABLE scholarships IS 'Scholarship metadata and raw description text';
COMMENT ON COLUMN scholarships.id IS 'Primary key (UUID)';
COMMENT ON COLUMN scholarships.name IS 'Display name of the scholarship';
COMMENT ON COLUMN scholarships.sponsor IS 'Sponsoring organization';
COMMENT ON COLUMN scholarships.url IS 'Public URL for scholarship details';
COMMENT ON COLUMN scholarships.raw_text IS 'Full textual description used for embeddings & profiling';
COMMENT ON COLUMN scholarships.min_gpa IS 'Minimum GPA if specified (NULL = no minimum)';
COMMENT ON COLUMN scholarships.country IS 'Country eligibility if applicable';
COMMENT ON COLUMN scholarships.fields IS 'Relevant fields/areas of study';
COMMENT ON COLUMN scholarships.metadata IS 'Additional JSON metadata';

-- Students
CREATE TABLE students (
  id uuid PRIMARY KEY,
  name text,
  email text,
  gpa numeric(3,2),
  major text,
  country text,
  metadata jsonb DEFAULT '{}'::jsonb
);

COMMENT ON TABLE students IS 'Student profiles used for matching/drafting';
COMMENT ON COLUMN students.id IS 'Primary key (UUID)';
COMMENT ON COLUMN students.name IS 'Student name';
COMMENT ON COLUMN students.email IS 'Student email (optional)';
COMMENT ON COLUMN students.gpa IS 'Student GPA';
COMMENT ON COLUMN students.major IS 'Major/field';
COMMENT ON COLUMN students.country IS 'Country of study/residence';
COMMENT ON COLUMN students.metadata IS 'Additional JSON metadata';

-- Embeddings (Voyage: choose a single dimension, e.g., 1024)
CREATE TABLE scholarship_embeddings (
  scholarship_id uuid PRIMARY KEY REFERENCES scholarships(id) ON DELETE CASCADE,
  embedding vector(1024) NOT NULL
);

CREATE TABLE student_embeddings (
  student_id uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  embedding vector(1024) NOT NULL
);

COMMENT ON TABLE scholarship_embeddings IS 'pgvector embeddings for scholarships (dimension=1024)';
COMMENT ON COLUMN scholarship_embeddings.scholarship_id IS 'FK to scholarships.id';
COMMENT ON COLUMN scholarship_embeddings.embedding IS 'Vector embedding (cosine distance)';

COMMENT ON TABLE student_embeddings IS 'pgvector embeddings for students (optional cache)';
COMMENT ON COLUMN student_embeddings.student_id IS 'FK to students.id';
COMMENT ON COLUMN student_embeddings.embedding IS 'Vector embedding (cosine distance)';

-- Claude-inferred “personality” profile per scholarship
CREATE TABLE scholarship_profiles (
  scholarship_id uuid PRIMARY KEY REFERENCES scholarships(id) ON DELETE CASCADE,
  weights jsonb NOT NULL,          -- {"academics":0.4,"leadership":0.3,...}
  themes text[] NOT NULL,          -- ["STEM innovation","community impact"]
  tone text NOT NULL,              -- e.g. "formal technical"
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE scholarship_profiles IS 'Claude-inferred personality profile for a scholarship';
COMMENT ON COLUMN scholarship_profiles.scholarship_id IS 'FK to scholarships.id';
COMMENT ON COLUMN scholarship_profiles.weights IS 'JSON weights over factors (must sum ≈ 1)';
COMMENT ON COLUMN scholarship_profiles.themes IS 'Key themes extracted from description';
COMMENT ON COLUMN scholarship_profiles.tone IS 'Preferred writing tone/style';
COMMENT ON COLUMN scholarship_profiles.updated_at IS 'Last update timestamp';

-- Essay drafts
CREATE TABLE drafts (
  id              uuid PRIMARY KEY,
  student_id      uuid REFERENCES students(id),
  scholarship_id  uuid REFERENCES scholarships(id),
  kind            text,      -- "generic" | "tailored"
  content         text,
  explanation     text,      -- why we wrote it this way
  created_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE drafts IS 'Stored essay drafts for students';
COMMENT ON COLUMN drafts.id IS 'Primary key (UUID)';
COMMENT ON COLUMN drafts.student_id IS 'FK to students.id';
COMMENT ON COLUMN drafts.scholarship_id IS 'FK to scholarships.id';
COMMENT ON COLUMN drafts.kind IS 'Draft kind: generic | tailored';
COMMENT ON COLUMN drafts.content IS 'Essay content';
COMMENT ON COLUMN drafts.explanation IS 'Model explanation/rationale for structure';
COMMENT ON COLUMN drafts.created_at IS 'Creation timestamp';

-- Applications: a student planning or working on a specific scholarship
CREATE TABLE applications (
  id              uuid PRIMARY KEY,
  student_id      uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  scholarship_id  uuid NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  status          text NOT NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE applications IS 'Student applications for specific scholarships';
COMMENT ON COLUMN applications.id IS 'Primary key (UUID)';
COMMENT ON COLUMN applications.student_id IS 'FK to students.id';
COMMENT ON COLUMN applications.scholarship_id IS 'FK to scholarships.id';
COMMENT ON COLUMN applications.status IS 'Application status (e.g., planned | in_progress | submitted)';
COMMENT ON COLUMN applications.created_at IS 'Creation timestamp';
COMMENT ON COLUMN applications.updated_at IS 'Last update timestamp';

-- Application plans: high-level plan per application
CREATE TABLE application_plans (
  id              uuid PRIMARY KEY,
  application_id  uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  created_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE application_plans IS 'Per-application checklist plan';
COMMENT ON COLUMN application_plans.id IS 'Primary key (UUID)';
COMMENT ON COLUMN application_plans.application_id IS 'FK to applications.id';
COMMENT ON COLUMN application_plans.created_at IS 'Creation timestamp';

-- Application tasks: concrete tasks (draft essay, request transcript, etc.)
CREATE TABLE application_tasks (
  id              uuid PRIMARY KEY,
  plan_id         uuid NOT NULL REFERENCES application_plans(id) ON DELETE CASCADE,
  label           text NOT NULL,
  due_date        date,
  completed       boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE application_tasks IS 'Tasks within an application plan';
COMMENT ON COLUMN application_tasks.id IS 'Primary key (UUID)';
COMMENT ON COLUMN application_tasks.plan_id IS 'FK to application_plans.id';
COMMENT ON COLUMN application_tasks.label IS 'Human-readable task label';
COMMENT ON COLUMN application_tasks.due_date IS 'Target due date (if known)';
COMMENT ON COLUMN application_tasks.completed IS 'Whether the task is completed';
COMMENT ON COLUMN application_tasks.created_at IS 'Creation timestamp';

-- HNSW index (negative inner product / dot product). Use L2 ops if you prefer Euclidean.
CREATE INDEX scholarship_embeddings_hnsw_ip
  ON scholarship_embeddings
  USING hnsw (embedding vector_ip_ops)
  WITH (m = 16, ef_construction = 200);

-- Optional rubric JSON per scholarship (criteria and weights)
CREATE TABLE scholarship_rubrics (
  scholarship_id uuid PRIMARY KEY REFERENCES scholarships(id) ON DELETE CASCADE,
  rubric jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE scholarship_rubrics IS 'Stored rubric criteria for a scholarship';
COMMENT ON COLUMN scholarship_rubrics.scholarship_id IS 'FK to scholarships.id';
COMMENT ON COLUMN scholarship_rubrics.rubric IS 'Rubric JSON (criteria with weights/labels)';
COMMENT ON COLUMN scholarship_rubrics.updated_at IS 'Last update timestamp';
