# AI & RAG Implementation Snapshot (Hackathon)

This file summarizes what is actually implemented in the codebase today, mapped to the original `ai-rag-requirements.md` and `system-architecture.md`. It is written for judges and reviewers.

---

## 1. End-to-End Flow (What Works Today)

- **Ingestion → Embeddings → DB**
  - `POST /api/ingest` ingests scholarships from JSON and:
    - writes rows into `scholarships`,
    - generates Voyage embeddings via `embedWithVoyage`,
    - stores vectors in `scholarship_embeddings` (pgvector, HNSW index).

- **Profile → Matching → Rerank**
  - `/profile` route builds a structured student summary and saves it via `POST /api/profile` (`students` + `student_embeddings`).
  - `POST /api/match` / `POST /api/retrieve`:
    - embed student summary (Voyage),
    - run pgvector kNN over `scholarship_embeddings` with GPA filter,
    - return top‑K with `distance` + `dot_sim`.
  - `POST /api/rerank`:
    - calls Claude with the student summary + candidate list,
    - returns JSON `{ ranking: [{ id, score, rationale }] }`,
    - UI shows “Claude‑ranked” list with scores and rationales.

- **Scholarship Detail + Personality**
  - `GET /api/scholarship/$id` pulls one scholarship plus personality profile from `scholarship_profiles`.
  - `POST /api/personality` calls Claude to infer weights/themes/tone and upserts into `scholarship_profiles`.
  - `/scholarship/$id` page:
    - shows core scholarship fields,
    - exposes “How to write for this” (tone + themes + weights).

- **Explain “Why this fits you”**
  - `POST /api/explain-fit`:
    - Input: `{ student_id, scholarship_id }`.
    - Joins `students`, `scholarships`, `scholarship_profiles`.
    - Prompt is structured and grounded; output is JSON:
      - `{ reasons: string[], eligibility: string[], gaps: string[], score: number }`.
    - Results are cached per `(student_id, scholarship_id)` and logged via telemetry.
  - `/scholarship/$id` UI has a sidebar panel:
    - Button “Why this fits you” (when `studentId` query param is present),
    - Shows fit score + bullets for reasons, eligibility, and gaps.

- **Rubric-Aware Drafting**
  - `POST /api/rubric`:
    - Admin‑only endpoint to upsert a rubric JSON for a scholarship into `scholarship_rubrics`.
  - `GET /api/rubric?scholarship_id=...` returns stored rubric JSON.
  - `POST /api/draft`:
    - Now accepts optional `rubric: { id, name, description?, weight? }[]` in addition to `personality` + `student_profile`.
    - Prompt includes rubric and explicitly instructs Claude to address high‑weight criteria.
    - Response is strict JSON `{ draft, explanation, outline?, safety }`, validated with Zod.
    - Optionally persists essay into `drafts` if `scholarship_id` and `student_id` provided.
  - `/scholarship/$id` page:
    - If a rubric exists, displays a “How you’ll be graded” card (criteria + weights),
    - Sends that rubric into `/api/draft` so drafts are rubric-aware.

- **Rubric Grading (single-pass RubricCoach)**
  - `POST /api/grade-essay` implements the **grade** phase of RubricCoach:
    - Input: `{ text, rubric: [{ id, name, description?, weight? }] }`.
    - Claude returns JSON:
      - `{ criteria: [{ id, name, score, max, feedback }], overall_comment, readiness }`,
      - `readiness ∈ { "needs_work", "solid", "ready" }`.
    - No new retrieval; uses rubric + essay only.
    - Calls are cached and telemetered (`step: 'grade'`).
  - UI wiring for grading is partially in place (state + helper function on `/scholarship/$id`); adding the button and result panel is straightforward and described in code comments.

---

## 2. Robustness & Safety Features

- **Strict env validation**
  - `src/server/env.ts` uses Zod to require `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `DATABASE_URL`, and applies defaults for model names and embedding dimension.

- **Schema-validated I/O for all LLM calls**
  - Personality, rerank, draft, explain‑fit, and grade endpoints:
    - All use Zod schemas on the Node side (`PersonalityOut`, `RerankOut`, `DraftOut`, `ExplainFitOut`, `GradeOut`).
    - LLM prompts all say “Return EXACTLY this JSON” and outputs are run through `coerceMinifiedJson` + Zod parse.
  - This protects the app from malformed or partial LLM responses.

- **Grounding rules in prompts**
  - Explain‑fit:
    - Separates DB fields vs inference with dedicated sections and rules (“don’t invent eligibility criteria; say ‘unclear’ when missing”).
  - Drafting:
    - Hard rule: use only provided student facts, no fabricated achievements.
    - When rubric is present, instructs the model to focus on highest‑weight criteria.
  - Grading:
    - Explicitly forbids inventing new criteria or changing weights.

- **Rate limiting & admin guards**
  - `rateLimit` wrapper for all expensive endpoints:
    - `/api/ingest`, `/api/personality`, `/api/draft`, `/api/rubric`, `/api/grade-essay`, `/api/explain-fit`, `/api/rerank`.
  - `checkAdminKey` for ingestion, personality, draft, rubric, and grading APIs to keep abuse risk low in shared environments.

- **Caching on key LLM calls**
  - `ExplainFitGraph` equivalent:
    - Cache key: `fit:user:{student_id}:sch:{scholarship_id}`.
  - Rerank:
    - Cache keyed on `(student_summary, candidates, top_k)`.
  - Drafting:
    - Cache keyed on `(scholarship_name, personality, rubric, student_profile, word_target, style)`.
  - Grading:
    - Cache keyed on `(first 2k chars of text, rubric)`.

- **Telemetry for latency & error tracking**
  - `src/server/telemetry.ts` tracks:
    - Steps: `'embed' | 'retrieve' | 'rerank' | 'draft' | 'personality' | 'explain-fit' | 'grade' | 'pipeline'`.
    - Each event logs `ok`, `durationMs`, optional `meta`, and `error`.
  - `/api/admin/telemetry` exposes recent events for debug UI and metric collection.

---

## 3. How This Maps to the Original Requirements

- **ExplainFitGraph**
  - Implemented as a direct Node route `/api/explain-fit` instead of a separate LangGraph microservice.
  - Respects the same invariants:
    - Only uses existing DB rows for `(student_id, scholarship_id)`,
    - Returns structured explanation JSON,
    - Cached per user+scholarship pair and measured via telemetry.

- **DraftEssayGraph**
  - Implemented as `/api/draft`:
    - Accepts scholarship text, personality, optional rubric, and student profile.
    - Produces draft + explanation + outline + safety flags.
    - Can persist drafts to `drafts` table.

- **RubricCoachGraph (grade phase)**
  - Implemented as `/api/grade-essay`:
    - Pure grade‑only phase against rubric JSON.
    - Ready to be extended with revision loops / essay versioning post‑hackathon.

- **LangGraph service (not implemented yet)**
  - Current implementation keeps everything inside the TanStack Start Node app:
    - Simpler deployment and debugging for the hackathon.
  - The LLM helpers, prompts, and JSON contracts are designed so they can be dropped into a LangGraph Python service later with minimal prompt rewrites.

---

## 4. Judge-Friendly Demo Path (AI/RAG)

1. **Profile & Matches**
   - Fill `/profile` with a realistic test persona.
   - Show vector matches, then Claude‑ranked matches with scores and rationales.

2. **Scholarship Detail + Explain Fit**
   - Click into `/scholarship/$id` from the ranked list (with `studentId` in query).
   - Show:
     - Scholarship overview,
     - Personality panel (“How to write for this”),
     - “Why this fits you” explanation card with personalized reasons, eligibility bullets, and gaps.

3. **Rubric-Aware Draft**
   - For a “gold” scholarship with a stored rubric:
     - Show “How you’ll be graded” criteria card.
     - Paste or type a short story; click “Generate draft”.
     - Explain how the draft aligns with both personality weights and rubric criteria.

4. **Rubric Grading (optional for demo)**
   - Call `/api/grade-essay` (either from UI or via debug tool) on the draft:
     - Show criterion scores, readiness label, and overall feedback.
   - Tie this back to evaluation metrics (before/after scores, rubric alignment).

This combination demonstrates: retrieval + reranking, transparent explain‑fit, rubric-aware drafting, and rubric grading, all with strong safety/grounding and observability.
