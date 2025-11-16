# GoGetScholarship – System Architecture

## 1. High-Level Overview

GoGetScholarship is an AI-powered assistant that:

- Matches students to scholarships using **semantic search + LLM reranking**.
- Generates **tailored essay drafts** for each scholarship based on what that
  scholarship actually values.

At a high level:

1. **Ingest scholarships** → extract text → embed with **Voyage 3.x** →
   store vectors in **PostgreSQL + pgvector** (HNSW, inner product).
2. **Student fills profile** → summarize profile → embed → vector search in
   Postgres to get top-K candidate scholarships.
3. **Claude reranker** takes the student + candidate list and produces an
   **adaptive ranking** (setwise / listwise, Rank-R1-style).
4. Student picks a scholarship → **Claude essay agent** generates a tailored
   draft using the scholarship’s “personality” and the student’s profile.

We clearly separate **core** vs **stretch** features:

- **CORE:** TanStack Start app, Postgres+pgvector retrieval, Voyage embeddings,
  Claude reranker, Claude essay generator.
- **STRETCH:** Optional Qdrant vector layer, winner-essay pattern mining,
  more advanced scoring models.

---

## 2. Stack Summary

### 2.1 Frontend / App Framework (CORE)

- **TanStack Start (React + Vite + TanStack Router)**
  - Full-stack React framework with SSR, streaming, server functions, and
    type-safe routing, built on TanStack Router and Vite.
  - We use TanStack Start routes for both UI pages and API/server functions.

- **UI**
  - **Tailwind CSS** for styling.
  - **shadcn/ui** for base components (cards, tabs, dialog, skeleton, etc.).

### 2.2 Backend (CORE)

- **Runtime:** Node.js server powered by TanStack Start.
- **Routing:** TanStack Router file-based routes, e.g.
  - `/` – landing / dashboard.
  - `/api/match` – takes a student profile, returns ranked scholarships.
  - `/api/draft` – generates a tailored essay draft.
  - `/api/personality` – analyzes a scholarship into a “personality profile”.
- **Validation:** Zod schemas for API inputs/outputs.
- **DB Access:** `pg` (or similar) Postgres client.

### 2.3 LLM & Embedding Services (CORE)

- **LLMs: Anthropic Claude**
  - **Claude Sonnet 4.5** as the main reasoning model for:
    - Scholarship personality analysis.
    - Setwise reranking of candidates.
    - Essay draft generation.
  - **Claude Haiku 4.5** (optional) for lighter tasks (health checks, quick
    summaries) to save latency/cost.

- **Embeddings: Voyage AI – voyage-3.5 / voyage-3.5-lite**
  - General-purpose embedding model (32K context, 1024-dim).
  - Used for embedding:
    - Scholarship descriptions (documents).
    - Student profile summaries (queries).

---

## 3. Data Layer

### 3.1 PostgreSQL + pgvector (CORE)

We use PostgreSQL as the **primary database + vector store**.

- **pgvector extension**
  - Adds a `vector` column type and vector similarity operators (`<->`, `<=>`,
    etc.) for nearest-neighbour search.
  - Supports HNSW / IVFFlat indexes for approximate search.

**Key tables (simplified):**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Students
CREATE TABLE students (
  id        uuid PRIMARY KEY,
  name      text NOT NULL,
  email     text NOT NULL,
  gpa       numeric(3, 2),
  major     text,
  country   text,
  metadata  jsonb
);

CREATE TABLE student_embeddings (
  student_id uuid PRIMARY KEY REFERENCES students(id),
  embedding  vector(1024)
);

-- Scholarships
CREATE TABLE scholarships (
  id         uuid PRIMARY KEY,
  name       text NOT NULL,
  sponsor    text,
  url        text,
  raw_text   text NOT NULL,
  min_gpa    numeric(3, 2),
  country    text,
  fields     text[],
  metadata   jsonb
);

CREATE TABLE scholarship_embeddings (
  scholarship_id uuid PRIMARY KEY REFERENCES scholarships(id),
  embedding      vector(1024)
);

-- Personality profile per scholarship
CREATE TABLE scholarship_profiles (
  scholarship_id  uuid PRIMARY KEY REFERENCES scholarships(id),
  weights         jsonb,    -- { "gpa":0.3, "leadership":0.2, ... }
  themes          text[],   -- ["STEM innovation","community impact",...]
  tone            text,     -- "formal technical", "story-driven", ...
  last_updated_at timestamptz DEFAULT now()
);

-- Essay drafts
CREATE TABLE drafts (
  id              uuid PRIMARY KEY,
  student_id      uuid REFERENCES students(id),
  scholarship_id  uuid REFERENCES scholarships(id),
  kind            text,             -- "generic" | "tailored"
  content         text NOT NULL,
  explanation     text,
  created_at      timestamptz DEFAULT now()
);
```

**Vector index example (HNSW, inner product):**

```sql
CREATE INDEX ON scholarship_embeddings
USING hnsw (embedding vector_ip_ops);
```

This turns Postgres into a vector DB suitable for RAG-style pipelines.

### 3.2 Optional Qdrant Layer (STRETCH)

-   **Qdrant Cloud** as an external vector DB.
    

Plan:

-   Mirror `scholarship_embeddings` into a Qdrant `scholarships` collection.
    
-   Use Qdrant for fast ANN search + metadata filters.
    
-   Keep Postgres as the source-of-truth for relational data.
    

This is **not required** for a working prototype; it’s a scalability /  
“extra polish” feature.

---

## 4\. Core Workflows

### 4.1 Scholarship Ingestion & Personality Profiling (CORE)

**Goal:** Turn raw scholarship descriptions into vectors + “personalities”.

1.  **Input:** New scholarship (name, URL, raw description text) plus fields  
    like `min_gpa`, `country`, `fields`, etc.
    
2.  **Store metadata** in `scholarships`.
    
3.  **Embeddings**
    
    -   Call Voyage embeddings API with the full description text.
        
    -   Store the resulting 1024-dim vector in `scholarship_embeddings`.
        
4.  **Personality profile (Claude)**
    
    -   Prompt Claude with the scholarship text.
        
    -   Ask for:
        
        -   `weights` over aspects like `gpa`, `leadership`, `community`, `need`,  
            `projects`, `research`, `innovation`, `background`, `extracurriculars`.
            
        -   `themes`: short phrases summarizing focus areas.
            
        -   `tone`: how to write for this scholarship.
            
        -   Optional `constraints` / `notes`.
            
    -   Normalize weights (sum ≈ 1).
        
    -   Store in `scholarship_profiles`.
        

Result: Each scholarship has both a semantic vector (for retrieval) and a  
structured personality (for reranking + drafting).

---

### 4.2 Student Matching Pipeline (CORE)

**Goal:** Given a student, produce a ranked list of scholarships with reasons.

1.  **Student profile input (frontend)**
    
    -   Collect GPA, major, country, plus free-text about achievements,  
        projects, and personal background.
        
2.  **Student summary & embedding**
    
    -   Either:
        
        -   Directly use the concatenated text, or
            
        -   Ask a small Claude prompt to produce a concise summary.
            
    -   Embed the summary with Voyage → `student_embedding`.
        
3.  **First-stage retrieval (pgvector, inner product)**
    
    -   Query `scholarship_embeddings` with cosine / dot-product similarity  
        to `student_embedding`, e.g.:
        
        ```sql
        SELECT s.id, s.name, s.url,
               -(e.embedding <#> $1::vector) AS dot_similarity
        FROM scholarships s
        JOIN scholarship_embeddings e
          ON s.id = e.scholarship_id
        WHERE s.min_gpa IS NULL OR s.min_gpa <= $2
        ORDER BY e.embedding <#> $1::vector
        LIMIT 40;
        ```
        
    -   Output: candidate set of ~20–40 scholarships.
        
4.  **Setwise LLM reranking (Claude Sonnet)**
    
    -   Build a JSON array of candidate objects:
        
        -   `id`, `name`, short `desc` snippet.
            
        -   `weights`, `themes`, `tone` from `scholarship_profiles`.
            
        -   Optional: raw vector similarity score.
            
    -   Call the **reranker agent** (see `prompts/agent_reranker.md`):
        
        -   Provide the student profile + candidate list.
            
        -   Ask for:
            
            -   A **global ranking** (list of IDs).
                
            -   A numeric score (0–100) per scholarship.
                
            -   A short rationale per scholarship.
                
    -   This mirrors setwise/listwise LLM reranking: the LLM sees top-k  
        candidates and returns a refined ordering based on reasoning over  
        query + docs.
        
5.  **Response to frontend**
    
    -   Return ranked scholarships with:
        
        -   `score`
            
        -   `summary` (description snippet)
            
        -   `reason` (top rationale from the LLM).
            

---

### 4.3 Essay Draft Generation (CORE)

**Goal:** For a chosen scholarship, generate a tailored essay draft.

1.  **Input**
    
    -   `student` profile JSON.
        
    -   `scholarship` metadata + full text.
        
    -   `personality` from `scholarship_profiles`.
        
    -   Target word count (e.g. 350–500) and optional style override.
        
2.  **Prompt Claude via the essay agent (`prompts/agent_essay_drafter.md`)**
    
    -   System: “You are an assistant that drafts authentic scholarship  
        application essays. Use only facts provided. Don’t fabricate.”
        
    -   User: includes:
        
        -   Scholarship text + personality (weights/themes/tone).
            
        -   Student profile JSON (academics, activities, projects, stories).
            
        -   Output JSON schema: `draft`, `explanation`, `outline`, `safety`.
            
3.  **Output**
    
    -   `draft`: full essay text tailored to that scholarship.
        
    -   `explanation`: why the essay is written that way (which  
        weights/themes it targeted).
        
    -   `outline`: optional section-level structure.
        
    -   `safety`: flags for missing info / eligibility mismatches.
        
4.  **Persist & show**
    
    -   Save to `drafts` (`kind = 'tailored'`).
        
    -   Display in UI with an editor so the student can modify it.
        

---

## 5\. Core vs Stretch Summary

-   **Core**
    
    -   TanStack Start app (React, Router, Tailwind, shadcn).
        
    -   Postgres + pgvector (vector search).
        
    -   Voyage 3.5 embeddings (1024-dim).
        
    -   Claude Sonnet reranker (setwise, Rank-R1-inspired).
        
    -   Claude essay drafter (personality-aware, JSON output).
        
-   **Stretch**
    
    -   Qdrant vector DB as an alternative/secondary retrieval layer.
        
    -   Using winner essays to refine scholarship profiles.
        
    -   Generic personal-statement generator.
        
    -   Advanced scoring models (e.g., small GBDT combining embedding  
        similarity + LLM score + feature score).
        
    -   Deeper observability (Sentry, request traces) and rate-limited  
        queues around LLM calls.
        
