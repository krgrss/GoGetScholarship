````markdown
# GoGetScholarship – AI & RAG Requirements (incl. LangGraph)

> **File:** `ai-rag-requirements.md`  
> **Scope:** How we use Claude + Voyage + pgvector + LangGraph to power
> matching, explainability, rubric-aware drafting, and feedback loops.

---

## 1. Goals & Scope

### 1.1 Primary AI jobs

The AI/RAG system must support:

1. **Personalized scholarship matching**
   - Use a student’s profile + history to find scholarships that are *truly relevant*.
   - Combine **hard constraints** (eligibility) with **semantic fit** (themes, interests).

2. **Transparent explanations**
   - “Why this fits you” – grounded in **real scholarship fields** and **user profile**.
   - Show explicit **eligibility reasons** (GPA, country, demographics) and **theme alignment**.

3. **Rubric-aware essay drafting**
   - Draft and revise essays using:
     - scholarship prompt,
     - rubric criteria & weights,
     - known themes and examples.

4. **Rubric-based self-grading & revision loop**
   - Evaluate essays against a rubric.
   - Generate targeted suggestions and revisions per criterion.

5. **Low extra work recommendations**
   - Use essay prompt similarity + application effort to suggest similar scholarships where existing essays can be reused.

### 1.2 Non-goals (for v1)

- No general web RAG (we don’t call external knowledge in user-facing flows).
- No multi-document long-context retrieval beyond our internal tables.
- No fully autonomous multi-hop browsing agents.

We focus on **structured RAG** over our Postgres schema + a few text fields.

---

## 2. Model & Provider Requirements

### 2.1 LLMs (Claude)

- Provider: **Anthropic** Claude family.
- Usage:
  - **Claude Sonnet**:
    - Rubric grading & revision (RubricCoachGraph).
    - Rubric-aware drafting (DraftEssayGraph).
    - Fit explanations (ExplainFitGraph).
  - **Claude Haiku** (optional):
    - Short summarization tasks (profile summary, minor helper prompts).

Requirements:

- All calls must be **grounded**:
  - System prompts must reference *which fields* came from DB.
  - Encourage models to quote and paraphrase from `description_raw`, `eligibility_raw`, `rubric`, `application_components`.
- Responses must be **structured** when needed:
  - JSON for rubric scores, explanation bullets, etc.

### 2.2 Embeddings (Voyage)

- Provider: **Voyage 3.x** (strong retrieval, good for semantic similarity).
- Vector dimension: **1024** (or chosen to match provider config).
- Distance metric: **inner product** (IP) via `vector_ip_ops` in pgvector.
- Uses:
  - `scholarship_embeddings.embedding`: embeddings of scholarships (description + eligibility).
  - `student_profiles.embedding`: embedding of profile summary.
  - (Optional) essay/prompt embeddings for reuse suggestions.

---

## 3. Knowledge Stores (RAG Sources)

RAG operates over **structured DB tables + text fields**. Primary stores:

### 3.1 Scholarship Store

Source: `scholarships` + `scholarship_embeddings`.

- Structured fields:
  - identity, amounts, deadlines.
  - eligibility (level, field, GPA, country, citizenship).
  - demographics (`demographic_eligibility`, `demographic_focus`).
  - application requirements (`application_components`, `application_effort`).
  - rubric and transparency info.
- Text fields:
  - `description_raw`
  - `eligibility_raw`
- Embedding:
  - Vector summarizing description + title + eligibility.

Use-cases:

- Matching (profile → scholarships).
- Explaining fit (eligibility + themes).
- Conditioning drafts & grading on **real criteria**.

### 3.2 Rubric & Criteria Store

- Embedded in `scholarships.rubric` JSON:
  - `{ id, name, description, weight }[]`.
- Used by:
  - DraftEssayGraph.
  - RubricCoachGraph.

No standalone vector index needed initially – we always address rubric by scholarship ID.

### 3.3 Winners / Examples (Optional / Stretch)

If ingested:

- Table: `scholarship_winners`.
- Links to:
  - `winner_profile_url`
  - `winning_essay_url`
- RAG usage (future):
  - Provide anonymized/summary hints like “Strong winning essays often…” (never copying full text).
  - Not core for v1.

### 3.4 User Profile & Essays

- `student_profiles`:
  - `profile_summary` (text) used for embeddings and context.
  - `demographic_self` for eligibility / targeted recommendations.
- `essays`:
  - `content` used by RubricCoachGraph.
  - (Optionally) prompt embeddings for low extra work suggestions.

---

## 4. Embedding Strategy & Indexing

### 4.1 Scholarship Embeddings

**What to embed:**

Concatenate:

- `name`
- `provider_name`
- `description_raw` (truncated if very long)
- `eligibility_raw`

into a single text blob per scholarship.

**Storage / indexing:**

```sql
CREATE TABLE scholarship_embeddings (
  scholarship_id uuid PRIMARY KEY REFERENCES scholarships(id) ON DELETE CASCADE,
  embedding      vector(1024) NOT NULL
);

CREATE INDEX scholarship_embeddings_hnsw_idx
ON scholarship_embeddings
USING hnsw (embedding vector_ip_ops);
````

**Ingestion requirements:**

* When a scholarship is created/updated:

  * Recompute embedding via Voyage.
  * Upsert row in `scholarship_embeddings`.

### 4.2 Student Profile Embeddings

Embedding over `profile_summary` (or “About me” text if no summary).

```sql
ALTER TABLE student_profiles
ADD COLUMN embedding vector(1024);
```

**Constraints:**

* Null is allowed for profiles with no free text (still usable via structured matching).
* Embedding generated/updated when profile is updated.

### 4.3 Optional Essay Prompt Embeddings

For low extra work recs (stretch):

* Table (simplified):

```sql
CREATE TABLE essay_prompt_embeddings (
  id              uuid PRIMARY KEY,
  scholarship_id  uuid NOT NULL REFERENCES scholarships(id),
  prompt_id       text,           -- matches scholarships.essay_prompts[].id
  embedding       vector(1024) NOT NULL
);

CREATE INDEX essay_prompt_embeddings_hnsw_idx
ON essay_prompt_embeddings
USING hnsw (embedding vector_ip_ops);
```

---

## 5. Query Patterns (RAG Behavior)

### 5.1 Matching Query

Goal: find scholarships that are:

* **Eligible** (hard constraints),
* **Relevant** (profile vs scholarship embedding).

Steps:

1. **Hard-filter scholarships** in SQL:

   * `level_of_study @> [user.level]`
   * `fields_of_study && user.fields` (if available)
   * `country_eligibility` + `citizenship_requirements`
   * `demographic_eligibility` vs `student_profiles.demographic_self` (for inclusion where required).
   * `is_active = true` and in date range.

2. **Vector search**:

   * Take `student_profiles.embedding` as query.
   * Restrict to filtered set via:

     * `WHERE id IN (filtered_ids)` or join.
   * Order by `embedding <#> user_embedding` (inner product) limit K.

3. **Decorate**:

   * Add workload chips from `application_components` + `application_effort`.
   * Add theme chips from `personality_profile` (if present).

### 5.2 Explain-Fit Query (ExplainFitGraph)

Goal: given `(user_id, scholarship_id)`, generate human-understandable explanation.

Data fetch (no vector search needed at this stage):

* From `student_profiles`:

  * country, level, major, GPA, demographic_self, profile_summary.
* From `scholarships`:

  * eligibility, demographic_focus, personality_profile (themes), rubric.

The LLM gets **structured JSON** describing:

* user’s key attributes,
* scholarship’s hard requirements & “priority” demographics,
* themes/rubric summary.

RAG requirement: **no new retrieval**, just reuse known IDs and rows.

### 5.3 Drafting Query (DraftEssayGraph)

Goal: create essay outline/draft aligned to prompt + rubric.

Graph retrieval:

* `LoadScholarshipWithRubricNode`:

  * Scholarship record: prompt text from `essay_prompts`, rubric, themes.
* `LoadUserContextNode`:

  * Profile summary, optionally 1–2 previous essays (for tone).

RAG rules:

* Only use relevant scholarships (current ID).
* If fetching previous essays:

  * Select essays for same user, sorted by updated_at desc, optionally limit to 1–2.
  * We can embed & rank by similarity, but for v1, just pick latest or user-chosen.

### 5.4 Rubric Grading Query (RubricCoachGraph)

Goal: grade essay vs rubric.

RAG data:

* `LoadEssayAndRubricNode`:

  * Essay text from `essays`.
  * Rubric from `scholarships.rubric` or snapshot.

RAG usage:

* The rubric is the **only** source of criteria; no runtime retrieval beyond DB read.
* Claude is instructed to **reference rubric names/weights** explicitly in JSON output.

### 5.5 Low Extra Work Suggestions Query

Goal: find scholarships where existing essays apply with minor changes.

RAG behavior:

1. For selected essay:

   * Embed its prompt text (or essay + prompt) → `q_vec`.

2. Vector search in `essay_prompt_embeddings`:

   * `ORDER BY embedding <#> q_vec LIMIT K`.

3. Filter:

   * Eligibility (like in matching).
   * Compare `application_effort` to current scholarship; require `<=` or `(same + small delta)`.

4. Optional LLM step:

   * For top matches, ask Claude to generate a one-line explanation:

     * “Similar leadership essay; requires only a short extra paragraph.”

---

## 6. LangGraph Requirements

We have **three core graphs**:

* `ExplainFitGraph`
* `DraftEssayGraph`
* `RubricCoachGraph`

### 6.1 Common Graph Requirements

* Graph state always contains:

  ```python
  {
    "user_id": ...,
    "scholarship_id": ...,
    "db_handles": ...,  # or an abstraction to read DB
    "llm_client": ...  # Claude client
  }
  ```

* All DB retrieval is done in dedicated **loader nodes**, not inside LLM nodes.

* LLM nodes receive:

  * **Plain text** fields for context (prompt, rubric, etc.).
  * **Structured JSON** representing criteria, eligibility, components.

#### 6.1.1 Error Handling

* If any DB lookup fails:

  * Short-circuit with explicit error payload (`{ "error": "Scholarship not found" }`).
* If LLM call fails:

  * Return error to Node API; UI shows toast.

#### 6.1.2 Tracing (internal)

* Each graph should log:

  * Input IDs.
  * Node transitions.
  * LLM prompt + truncated output (for debugging).

No requirement to expose traces to end-users in v1.

---

### 6.2 ExplainFitGraph

**Input:**

```json
{ "user_id": "...", "scholarship_id": "..." }
```

**State fields:**

* `user_profile`
* `scholarship`
* `fit_explanation`

**Nodes:**

1. `LoadUserProfileNode`

   * Query `student_profiles` (join with `users` if needed).

2. `LoadScholarshipNode`

   * Query `scholarships`.

3. `BuildExplanationPromptNode`

   * Create prompt with:

     * user basic info (level, field, GPA),
     * eligibility comparison (meets/doesn’t meet),
     * demographic match/mismatch,
     * themes/rubric summary.

4. `ExplainFitLLMNode` (Claude)

   * Output structured JSON:

     ```json
     {
       "strengths": ["..."],
       "gaps": ["..."],
       "notes": "..."
     }
     ```

5. `ReturnNode`

   * Graph returns `fit_explanation` to Node API.

---

### 6.3 DraftEssayGraph

**Input:**

```json
{
  "user_id": "...",
  "scholarship_id": "...",
  "mode": "outline" | "first_draft" | "rewrite",
  "bullet_points": "..."  // optional
}
```

**State fields:**

* `user_profile`
* `scholarship`
* `rubric`
* `draft_request`
* `draft_text`
* `outline`

**Nodes:**

1. `LoadScholarshipWithRubricNode`
2. `LoadUserContextNode`

   * Optionally fetch prior essay for style.
3. `BuildDraftPromptNode`

   * Compose system + user messages:

     * include rubric criteria names + weights,
     * include key eligibility themes,
     * include bullet points if provided.
4. `DraftLLMNode` (Claude)

   * Output:

     * `outline` if mode is `outline`.
     * `draft_text` for others.
5. `SaveDraftNode`

   * Upsert into `essays`.
6. `ReturnNode`

   * Return `draft_text` and/or `outline`.

---

### 6.4 RubricCoachGraph

Supports two “modes”: **grade** and **revise**.

**Input (grade):**

```json
{ "essay_id": "..." }
```

**Input (revise):**

```json
{ "essay_id": "...", "criterion_id": "impact" }
```

**State fields:**

* `essay`
* `rubric`
* `scores`
* `readiness`
* `target_criterion`
* `revised_text`

**Grade phase nodes:**

1. `LoadEssayAndRubricNode`

2. `GradeLLMNode`

   * Claude outputs:

     ```json
     {
       "criteria": [
         { "id":"impact","name":"Community impact","score":3,"max":5,"feedback":"..." },
         { "id":"clarity","name":"Clarity","score":4,"max":5,"feedback":"..." }
       ],
       "overall_comment":"..."
     }
     ```

3. `ComputeReadinessNode`

   * Map scores → `'needs_work' | 'solid' | 'ready'`.

4. `SaveReviewNode`

   * Insert `essay_reviews`.

5. `ReturnNode`

   * Return scores + readiness.

**Revise phase nodes:**

1. `LoadEssayAndRubricNode`
2. `SelectSectionNode`

   * Simple v1: whole essay; stretch: relevant paragraphs.
3. `ReviseLLMNode`

   * Claude rewrites text focusing on `target_criterion` with instructions to:

     * keep voice,
     * keep length roughly similar.
4. `SaveRevisionNode`

   * Update `essays.content` or create new version.
5. (Optional) `QuickReGradeNode`

   * Only for the single criterion.
6. `ReturnNode`

   * Return revised text + note.

---

## 7. Prompting & Context Construction Requirements

### 7.1 General Rules

* Always make it clear **which fields** come from DB vs what the model should infer.
* Use explicit sections in prompts:

  * `## STUDENT PROFILE`
  * `## SCHOLARSHIP ELIGIBILITY`
  * `## RUBRIC`
  * `## TASK`
* Ask model to **quote** or paraphrase from scholarship text where appropriate, rather than inventing.

### 7.2 Avoiding Hallucinations

* For `"Why this fits you"`:

  * Instruct Claude:

    * “Only reference eligibility criteria that appear in the provided scholarship data. If you are uncertain about a detail, say so.”
* For rubric grading:

  * Explicitly instruct:

    * “You may only use the rubric criteria listed below to assign scores. Do not invent extra criteria.”
* For demographic focus:

  * Instruct:

    * “If a user does not match a required demographic, highlight this as a potential ineligibility. Do not assume their demographics if not provided.”

---

## 8. Caching & Performance

### 8.1 LLM Call Caching

* Cache outputs for:

  * `ExplainFitGraph` per (user_id, scholarship_id) pair.
  * Initial grading results per `essay_id` (until essay changes).

* Cache keys:

  * `fit:user:{user_id}:sch:{scholarship_id}`
  * `grade:essay:{essay_id}:version:{version}`

* Invalidation:

  * Change in essay → new `version` → new cache key.
  * Change in profile → re-run explain-fit when requested.

### 8.2 Retrieval Efficiency

* For matches:

  * Pre-filter on SQL fields before vector search.
  * Limit top-k results (e.g., 100) then apply sort, not full scan.

---

## 9. Evaluation & Logging

### 9.1 Internal Metrics

Track (internally):

* Time per:

  * vector search,
  * LangGraph run,
  * LLM call.
* Frequency of:

  * “No matches found” cases.
  * “Rubric not configured” cases.

### 9.2 Qualitative Signals

From `effort_feedback` / `ontology_feedback` (if implemented):

* Where users say:

  * “Workload feels heavier than labeled”.
  * “Field tag is wrong / incomplete”.

Use this for **post-hackathon** refinement, not real-time adaptation.

---

## 10. Core vs Stretch Work (AI/RAG)

### Core (Hackathon)

* Voyage embeddings for:

  * `scholarships` and `student_profiles`.
* pgvector HNSW index for scholarship search.
* LangGraph graphs:

  * `ExplainFitGraph`
  * `DraftEssayGraph`
  * `RubricCoachGraph` (single pass).
* Prompt templates for:

  * fit explanation,
  * rubric-aware drafting,
  * rubric grading & revision.

### Stretch (Post-Hackathon)

* Essay prompt embeddings and low-extra-work RAG.
* Winners/examples ingestion:

  * use them to generate pattern-based guidance (not copying essays).
* Ingestion QA LangGraph:

  * check scraped scholarships for missing or inconsistent fields.
* Multi-iteration rubric loops:

  * automatically re-grade until threshold or max iterations.

---

```
::contentReference[oaicite:0]{index=0}
```
