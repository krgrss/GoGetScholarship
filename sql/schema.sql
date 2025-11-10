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

-- Embeddings (Voyage: choose a single dimension, e.g., 1024)
CREATE TABLE scholarship_embeddings (
  scholarship_id uuid PRIMARY KEY REFERENCES scholarships(id) ON DELETE CASCADE,
  embedding vector(1024) NOT NULL
);

CREATE TABLE student_embeddings (
  student_id uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  embedding vector(1024) NOT NULL
);

-- Claude-inferred “personality” profile per scholarship
CREATE TABLE scholarship_profiles (
  scholarship_id uuid PRIMARY KEY REFERENCES scholarships(id) ON DELETE CASCADE,
  weights jsonb NOT NULL,          -- {"academics":0.4,"leadership":0.3,...}
  themes text[] NOT NULL,          -- ["STEM innovation","community impact"]
  tone text NOT NULL,              -- e.g. "formal technical"
  updated_at timestamptz DEFAULT now()
);

-- HNSW index (cosine distance). Use L2 ops if you prefer Euclidean.
CREATE INDEX scholarship_embeddings_hnsw_cos
  ON scholarship_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);
