# DB Implementation Snapshot

This file summarizes the actual PostgreSQL schema we ship for the hackathon and how it relates to the more ambitious `db-requirements.md` design.

---

## 1. Core Tables (Implemented)

**`scholarships`**  
- Minimal but sufficient fields for matching + display:
  - `id uuid PK`
  - `name text`
  - `sponsor text`
  - `url text`
  - `raw_text text` – canonical text used for embeddings + profiling.
  - `min_gpa numeric(3,2)` – optional cutoff.
  - `country text`
  - `fields text[]`
  - `metadata jsonb` – flexible extension point for richer data
    - can hold `rubric`, `application_components`, `application_effort`, `essay_prompts`, etc. as we ingest richer records.

**`students`**  
- Stores basic profile info used in matching + explain‑fit + drafting:
  - `id uuid PK`
  - `name, email`
  - `gpa, major, country`
  - `metadata jsonb` – used for richer attributes such as demographics, education level, financial need, identity tags, and stories.

**Embeddings (`pgvector`)**  
- `scholarship_embeddings`:
  - `scholarship_id uuid PK → scholarships(id)`
  - `embedding vector(1024)` – Voyage 3.5 compatible, with HNSW index on `vector_ip_ops`.
- `student_embeddings`:
  - `student_id uuid PK → students(id)`
  - `embedding vector(1024)` – cached profile embedding for faster matching.

**Personality Profiles**  
- `scholarship_profiles`:
  - `scholarship_id uuid PK → scholarships(id)`
  - `weights jsonb` – factor weights (academics, leadership, need, etc.).
  - `themes text[]`
  - `tone text`
  - `updated_at timestamptz`

These power `/api/personality` and the “How to write for this” sidebar.

**Drafted Essays**  
- `drafts`:
  - `id uuid PK`
  - `student_id uuid → students(id)`
  - `scholarship_id uuid → scholarships(id)`
  - `kind text` – `"generic"` | `"tailored"`.
  - `content text` – essay text.
  - `explanation text` – why the agent wrote it this way.
  - `created_at timestamptz`.

The `/api/draft` endpoint optionally persists to this table when both IDs are provided.

**Applications & Planner (lightweight)**  
- `applications`:
  - `id uuid PK`
  - `student_id uuid → students`
  - `scholarship_id uuid → scholarships`
  - `status text` – e.g. `planned | in_progress | submitted`.
  - `created_at, updated_at`.

- `application_plans`:
  - `id uuid PK`
  - `application_id uuid → applications`

- `application_tasks`:
  - `id uuid PK`
  - `plan_id uuid → application_plans`
  - `label text`
  - `due_date date`
  - `completed boolean`.

These tables give us a proper home for the “Application planner” checklist without over‑engineering.

**Rubrics**  
- `scholarship_rubrics`:
  - `scholarship_id uuid PK → scholarships(id)`
  - `rubric jsonb` – `{ id, name, description?, weight? }[]`.
  - `updated_at timestamptz`.

Used by `/api/rubric` (admin CRUD) and by `/api/grade-essay` when grading essays against rubric criteria.

---

## 2. What’s Simplified vs. the Full Design

The original `db-requirements.md` defines a richer schema with explicit fields like:
- `level_of_study[]`, `fields_of_study[]`, `country_eligibility[]`, `citizenship_requirements[]`,
- `demographic_eligibility`, `demographic_focus`,
- `application_components`, `application_effort`,
- `essay_prompts`, `transparency` metadata,
- `student_profiles`, `essays`, `essay_reviews`, etc.

For the hackathon implementation we chose to:

- **Keep relational tables small and stable**  
  - `scholarships` and `students` are lean, with a `metadata jsonb` field to hold richer attributes as needed.
  - This allowed us to ship ingestion + matching + drafting quickly without constant schema migrations.

- **Use JSONB for flexible, “richer later” fields**  
  - Rubrics are first‑class in `scholarship_rubrics` (because they are central for RubricCoach and easy to reason about).
  - Other complex structures (`application_components`, `essay_prompts`, `demographic_focus`) can be safely stored in `scholarships.metadata` when ingested, and gradually normalized later if the product matures.

- **Unify “essays” and “drafts” for v1**  
  - We use a single `drafts` table rather than separate `essays` + `essay_versions` + `essay_reviews`.
  - Rubric grading currently operates in a stateless way via `/api/grade-essay`; persisting reviews is a straightforward extension (e.g. `essay_reviews` table) if time permits.

This design hits the sweet spot between **demo‑ready** and **extensible**. The schema can grow toward the full design without breaking existing APIs.

---

## 3. RAG-Specific Considerations

- **pgvector as the only vector store**  
  - We use Postgres + pgvector exclusively; no external vector DB.
  - HNSW index on `scholarship_embeddings.embedding` using `vector_ip_ops` (inner product) matches the Voyage 3.5 setup.

- **Separation of structure vs. free text**  
  - `raw_text` is used for embeddings and profiling.
  - Structured eligibility and rubric‑like information can live in `metadata` or dedicated tables (`scholarship_profiles`, `scholarship_rubrics`).

- **LangGraph compatibility**  
  - The schema and RAG access pattern match the graphs described in the docs:
    - ExplainFitGraph: reads `students`, `scholarships`, `scholarship_profiles`, `scholarship_rubrics`.
    - DraftEssayGraph: reads `scholarships`, `scholarship_rubrics`, and `drafts` for context.
    - RubricCoachGraph: reads `drafts` (or essays) + `scholarship_rubrics`.
  - Today, these flows are implemented directly in Node routes, but the DB layout is ready for a LangGraph microservice to plug in later.

---

## 4. How to Apply This Schema

- Run `sql/schema.sql` once against your Postgres database (with `pgvector` extension enabled).
- Use `/api/ingest` + `/scripts/ingest-rich-scholarships.js` to seed scholarships and embeddings.
- Use `/api/personality` and `/api/rubric` to populate `scholarship_profiles` and `scholarship_rubrics` for “gold” scholarships you want to highlight in the demo.

This schema is intentionally compact but powerful enough to support:
- semantic matching + LLM reranking,
- explain‑fit explanations,
- rubric‑aware drafting,
- rubric grading,
- and a basic application planner—all within the hackathon timeframe.
