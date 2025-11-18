````markdown
# GoGetScholarship – System Architecture (LangGraph Edition)

> **File:** `system-architecture.md`  
> **Purpose:** One-stop reference for UX, backend, LangGraph flows, and data.

---

## 1. High-Level Diagram (Graph)

```text
                          ┌─────────────────────────────────────┐
                          │              STUDENT                │
                          │  (stressed but motivated applicant) │
                          └─────────────────────────────────────┘
                                              │
                                              ▼
┌───────────────────────────────────────────────────────────────────────┐
│                               UX LAYER                               │
│ React + TanStack + shadcn/Tailwind                                   │
│                                                                       │
│ • Onboarding & Profile                                                │
│ • Matches List                                                        │
│ • Scholarship Detail + “Why this fits you”                            │
│ • Application Planner                                                 │
│ • Essay Workspace (rubric-aware editor + diff view)                  │
│ • Rubric Self-Grading & Revision Panel                               │
│ • Dashboard + “Low extra work” suggestions                           │
└───────────────────────────────────────────────────────────────────────┘
                                              │
                                              │ HTTP (JSON, TanStack Start server routes)
                                              ▼
┌───────────────────────────────────────────────────────────────────────┐
│                       APPLICATION / API LAYER                         │
│           Node.js + TanStack Start (Nitro under the hood)            │
│                                                                       │
│  /api/profile                         /api/matches                    │
│  /api/scholarships/:id                /api/scholarships/:id/plan      │
│  /api/scholarships/:id/explain-fit    /api/dashboard                  │
│  /api/scholarships/:id/essays         /api/suggestions/low-extra-work │
│  /api/scholarships/:id/essays/:id/grade                               │
│  /api/scholarships/:id/essays/:id/improve                             │
│                                                                       │
│  • Orchestrates DB reads/writes                                       │
│  • Calls LangGraph microservice for agentic flows                     │
│  • Calls Claude & Voyage directly for simple one-shot tasks           │
└───────────────────────────────────────────────────────────────────────┘
        │                                   │
        │                                   │ HTTP (JSON RPC)
        │                                   ▼
        │                 ┌─────────────────────────────────────┐
        │                 │    LANGGRAPH AGENT SERVICE          │
        │                 │        (Python + LangGraph)         │
        │                 │                                     │
        │                 │  Graphs:                            │
        │                 │   • ExplainFitGraph                  │
        │                 │   • DraftEssayGraph                  │
        │                 │   • RubricCoachGraph (grade+revise) │
        │                 │   • (Future) LowEffortSuggestionGraph│
        │                 │                                     │
        │                 │  Uses Claude via SDK/LangChain      │
        │                 └─────────────────────────────────────┘
        │                                   │
        │                                   │
        ▼                                   ▼
┌──────────────────────────┐      ┌───────────────────────────────────┐
│  DATA LAYER (Postgres)   │      │   AI PROVIDERS / EXTERNAL SVCS   │
│  + pgvector (HNSW, IP)   │      │                                   │
│                          │      │ • Claude (reasoning, drafting,   │
│ Tables:                  │      │   grading, revision)             │
│  • scholarships          │      │ • Voyage (embeddings)            │
│  • scholarship_embeddings│      │ • (Optional) file storage / OCR  │
│  • scholarship_rubrics   │      └───────────────────────────────────┘
│  • student_profiles      │
│  • applications          │
│  • essays, essay_versions│
│  • essay_reviews         │
│  • application_plans     │
│  • application_tasks     │
└──────────────────────────┘
````

---

## 2. Product Narrative & UX Flow

End-to-end flow (talk track for judges):

```text
[1. Onboard & Profile]
        ↓
[2. See Matches]
        ↓
[3. Scholarship Detail + “Why this fits you”]
        ↓
[4. Plan Application]
        ↓
[5. Draft Essay (Rubric-aware)]
        ↓
[6. Self-Grade & Improve (RubricCoach)]
        ↓
[7. Dashboard + “Low Extra Work” Recs]
```

### 2.1 Onboard & Profile

* **UX**

  * Multi-step form:

    * Country, level, major, GPA.
    * Optional demographic info (gender, race/ethnicity, first-gen, LGBTQ+, disability) – clearly marked as **optional for more targeted results**.
    * “Paste your activities / about me” OR upload résumé (text/PDF).
* **Backend**

  * `POST /api/profile`
  * Store structured fields in `student_profiles`.
  * If text/resume present:

    * Claude → structured profile JSON + 1–2 paragraph **profile_summary**.
    * Voyage → embedding of `profile_summary` → `student_profiles.embedding` (pgvector).

### 2.2 Matches List

* **UX**

  * Card list with:

    * title, provider, amount, deadline,
    * level + field tags,
    * **demographic chips** (e.g. “Women in STEM”, “First-gen priority”),
    * **workload chip**: “1 essay · 2 refs · transcript”.
  * Filters:

    * country / citizenship, level, field,
    * workload (“lighter first”),
    * optional: include/exclude scholarships with certain demographic focus.
* **Backend**

  * `GET /api/matches`

    * Load `student_profiles.embedding`.
    * SQL hard filters:

      * `level_of_study`, `fields_of_study`,
      * `country_eligibility`, `citizenship_requirements`,
      * `demographic_focus` (respect `required` vs `preferred` groups).
    * Join `scholarship_embeddings` for filtered IDs.
    * **pgvector HNSW** ANN search (inner product).
    * Decorate results with:

      * theme chips from `personality_profile.top_themes`,
      * workload chips from `application_components` + `application_effort`.

### 2.3 Scholarship Detail + “Why this fits you”

* **UX**

  * Layout:

    * Main: overview, description, structured eligibility.
    * Section: **Demographic focus** (required vs priority).
    * Panel: “Application components” – essays, LORs, transcript, interview.
    * Sidebar: “What they care about” (themes + rubric criteria).
    * Actions:

      * **“Why this fits you”**
      * “Plan this scholarship”
      * “Start essay”
* **Backend**

  * `GET /api/scholarships/:id`

    * Load scholarship record with:

      * identity, URLs,
      * amounts, deadlines,
      * eligibility + `demographic_focus`,
      * `application_components`, `application_effort`,
      * `personality_profile`, `rubric`, `transparency`.
  * `POST /api/scholarships/:id/explain-fit`

    * Node → LangGraph `ExplainFitGraph`.

#### ExplainFitGraph (LangGraph)

* **State**: `{ user_profile, scholarship, explanation }`
* **Nodes**

  1. `LoadUserProfileNode`

     * Pull minimal profile (GPA, level, field, demographics, summary).
  2. `LoadScholarshipNode`

     * Pull eligibility, demographic_focus, rubric/themes.
  3. `BuildExplanationPromptNode`

     * Construct structured prompt:

       * strong matches (criteria, themes),
       * explicit demographic match/mismatch,
       * key gaps.
  4. `ExplainFitLLMNode` (Claude)

     * Return 3–4 bullets:

       * 2× “Why this fits you”
       * 1× “What you might need to strengthen / note about demographics”

---

### 2.4 Application Planner

* **UX**

  * Checklist per scholarship:

    * `[ ] Draft main essay`
    * `[ ] Revise essay`
    * `[ ] Ask recommender`
    * `[ ] Request transcript`
  * Suggested dates relative to deadline ("by Nov 18", etc.).
* **Backend**

  * `POST /api/scholarships/:id/plan`

    * Read `application_components` + `deadline`.
    * Map to tasks (pure business logic).
    * Save `application_plans` + `application_tasks`.

---

### 2.5 Essay Workspace (Rubric-Aware Drafting)

* **UX**

  * Split layout:

    * **Left**

      * Prompt + word limit.
      * Textarea / editor.
      * Buttons: “Generate outline”, “Draft from bullets”, “Rewrite for clarity”.
    * **Right**

      * Rubric criteria list with weights.
      * Themes chips (“Leadership”, “Community impact”).
      * Quick note “What they care about most”.
* **Backend**

  * `POST /api/scholarships/:id/essays`

    * Node → LangGraph `DraftEssayGraph`.

#### DraftEssayGraph (LangGraph)

* **State**: `{ user_profile, scholarship, rubric, draft_request, draft_text }`
* **Nodes**

  1. `LoadScholarshipWithRubricNode`

     * Prompt, rubric criteria, themes.
  2. `LoadUserContextNode`

     * Profile summary, possibly one previous essay for tone.
  3. `BuildDraftPromptNode`

     * System + user messages:

       * emphasise rubric criteria & top themes,
       * enforce word limits and scholarship constraints.
  4. `DraftLLMNode` (Claude)

     * Generates outline or first draft.
  5. `SaveDraftNode`

     * Persist to `essays` with status `"draft"`.

---

### 2.6 Rubric Self-Grading & Revision (RubricCoach)

* **UX**

  * In the same workspace, a **“Rubric check”** tab:

    * Table listing each criterion:

      * Name, score (1–5, coloured), feedback snippet.
      * Button **“Improve this”** per criterion.
  * When clicked:

    * Show diff view (original vs revised section).
    * “Accept revision / Keep original”.

* **Backend: grade**

  * `POST /api/scholarships/:id/essays/:essayId/grade`
  * Node → LangGraph `RubricCoachGraph` (grade phase).

* **Backend: revise**

  * `POST /api/scholarships/:id/essays/:essayId/improve`
  * Node → `RubricCoachGraph` (revise phase) with `criterion_id`.

#### RubricCoachGraph (LangGraph)

* **State**:
  `{ essay_text, rubric, critique, revisions[], target_criterion? }`

* **Grade Phase Nodes**

  1. `LoadEssayAndRubricNode`

     * Fetch essay text + rubric snapshot.

  2. `GradeLLMNode` (Claude)

     * Returns JSON:

       ```json
       {
         "criteria": [
           { "id": "impact", "score": 3, "max": 5, "feedback": "..." },
           { "id": "clarity", "score": 2, "max": 5, "feedback": "..." }
         ],
         "overall_comment": "…"
       }
       ```

  3. `SaveCritiqueNode`

     * Save into `essay_reviews`.

  4. `ComputeReadinessNode`

     * Aggregate scores → `"needs_work" | "solid" | "ready"`.

* **Revise Phase Nodes**

  1. `SelectSectionNode`

     * Select either full essay or relevant paragraphs for `criterion_id`.
  2. `ReviseLLMNode` (Claude)

     * Prompt: “Rewrite only this section to better satisfy criterion X, keep voice & length.”
  3. `SaveRevisionNode`

     * New row in `essays` or `essay_versions`.
  4. (Optional) `ReGradeNode`

     * Quick re-score of that criterion.

---

### 2.7 Dashboard & “Low Extra Work” Suggestions

* **UX**

  * Dashboard:

    * Summary: “You’re tracking 5 scholarships:

      * 1 Ready • 2 In progress • 2 Not started”.
    * Table of scholarships:

      * name, deadline, status pill, readiness bar, quick links.
  * “Low extra work” panel:

    * “Based on your leadership essay, you can also apply to: …”
* **Backend**

  * `GET /api/dashboard`

    * Join `applications`, `essays`, `essay_reviews`.
  * `GET /api/suggestions/low-extra-work`

    * Embed essay prompts.
    * pgvector similarity vs other scholarships’ essay prompts.
    * Filter by eligibility + `application_effort <= current`.
    * (Optional) call Claude for short explanation text.

---

## 3. Stack

### 3.1 Frontend

* **React + TanStack Start** (app shell, routing, SSR)
* **TanStack Query / Start loaders** (data fetching)
* **shadcn/ui + Tailwind CSS** (components + styling)
* **Editor**:

  * MVP: textarea + basic toolbar.
  * Future: TipTap or Slate for rich text + comments.

### 3.2 Backend API (Node / TanStack Start + Nitro)

Key routes:

* `POST /api/profile`
* `GET /api/matches`
* `GET /api/scholarships/:id`
* `POST /api/scholarships/:id/explain-fit`
* `POST /api/scholarships/:id/plan`
* `POST /api/scholarships/:id/essays`
* `POST /api/scholarships/:id/essays/:essayId/grade`
* `POST /api/scholarships/:id/essays/:essayId/improve`
* `GET /api/dashboard`
* `GET /api/suggestions/low-extra-work`

Responsibilities:

* Auth & validation.
* Postgres reads/writes.
* Calls to:

  * Claude (profile summarization, simple helpers),
  * Voyage (embeddings),
  * LangGraph microservice (ExplainFit, Draft, RubricCoach).

### 3.3 LangGraph Agent Service (Python)

* Tech:

  * `langgraph` (for stateful graphs).
  * Claude SDK or `langchain-anthropic`.
* Graphs:

  * `ExplainFitGraph`
  * `DraftEssayGraph`
  * `RubricCoachGraph`
  * (Future) `LowEffortSuggestionGraph`, `IngestionQAGraph`.
* API:

  * `POST /graph/explain-fit`
  * `POST /graph/draft-essay`
  * `POST /graph/rubric-coach`

### 3.4 LLMs & Embeddings

* **Claude (Anthropic)**:

  * Sonnet: grading, explanation, drafting, revision.
  * Haiku: light summarization tasks.
* **Voyage 3.x**:

  * Scholarship embeddings.
  * Student profile embeddings.
  * Optional essay/prompt embeddings.

### 3.5 Data Layer (Postgres + pgvector)

* Core tables:

  * `scholarships`
  * `scholarship_embeddings`
  * `student_profiles`
  * `applications`
  * `essays`, `essay_versions`
  * `essay_reviews`
  * `application_plans`, `application_tasks`
  * Optional: `scholarship_rubrics` / `feedback` / `ontology_feedback`.

---

## 4. Schema Sketches

### 4.1 Scholarships

```sql
CREATE TABLE scholarships (
  id                uuid PRIMARY KEY,
  name              text NOT NULL,
  provider_name     text NOT NULL,
  provider_type     text NOT NULL,
  url               text NOT NULL,
  application_url   text,

  source_country    text NOT NULL,
  last_verified_at  timestamptz NOT NULL,

  amount_min        numeric,
  amount_max        numeric,
  currency          text,
  num_awards        integer,
  is_renewable      boolean,
  deadline          date,
  deadline_note     text,
  frequency         text,

  level_of_study        text[] NOT NULL,
  fields_of_study       text[] NOT NULL,
  min_gpa               numeric(3,2),
  gpa_scale             numeric(3,1),
  financial_need_required boolean,

  country_eligibility     text[] NOT NULL,
  citizenship_requirements text[] NOT NULL,
  is_international_students_allowed boolean NOT NULL,

  demographic_eligibility text[] NOT NULL,
  demographic_focus_raw   text,
  demographic_focus       jsonb,

  description_raw       text NOT NULL,
  eligibility_raw       text NOT NULL,

  essay_required        boolean NOT NULL,
  essay_prompts         jsonb,
  application_components jsonb,
  application_effort    text NOT NULL,

  personality_profile   jsonb,
  rubric                jsonb,
  transparency          jsonb
);
```

### 4.2 Embeddings

```sql
CREATE TABLE scholarship_embeddings (
  scholarship_id uuid PRIMARY KEY REFERENCES scholarships(id),
  embedding      vector(1024) NOT NULL
);

CREATE INDEX scholarship_embeddings_hnsw_idx
ON scholarship_embeddings
USING hnsw (embedding vector_ip_ops);
```

### 4.3 Student Profiles

```sql
CREATE TABLE student_profiles (
  id                 uuid PRIMARY KEY,
  user_id            uuid UNIQUE NOT NULL,
  country            text,
  level_of_study     text,
  major              text,
  gpa                numeric(3,2),
  gpa_scale          numeric(3,1),
  demographic_self   jsonb,
  profile_summary    text,
  embedding          vector(1024),
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
```

### 4.4 Applications & Essays

```sql
CREATE TABLE applications (
  id              uuid PRIMARY KEY,
  user_id         uuid NOT NULL,
  scholarship_id  uuid NOT NULL REFERENCES scholarships(id),
  status          text NOT NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE essays (
  id              uuid PRIMARY KEY,
  application_id  uuid NOT NULL REFERENCES applications(id),
  prompt_id       text,
  content         text NOT NULL,
  version         integer DEFAULT 1,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE essay_reviews (
  id              uuid PRIMARY KEY,
  essay_id        uuid NOT NULL REFERENCES essays(id),
  rubric_snapshot jsonb NOT NULL,
  scores          jsonb NOT NULL,
  readiness       text NOT NULL,
  created_at      timestamptz DEFAULT now()
);
```

### 4.5 Plans & Tasks

```sql
CREATE TABLE application_plans (
  id              uuid PRIMARY KEY,
  application_id  uuid NOT NULL REFERENCES applications(id),
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE application_tasks (
  id              uuid PRIMARY KEY,
  plan_id         uuid NOT NULL REFERENCES application_plans(id),
  label           text NOT NULL,
  due_date        date,
  completed       boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);
```

---

## 5. Core vs Stretch

**Core for hackathon:**

* Onboarding + profile summary & embedding.
* Scholarship matching (filters + pgvector).
* Detail + “Why this fits you” (ExplainFitGraph).
* Planner from `application_components`.
* Rubric-aware drafting (DraftEssayGraph).
* Single-pass rubric grading + single revision (RubricCoachGraph).
* Dashboard with readiness.

**Stretch:**

* Multi-iteration rubric loops.
* Multi-persona critiques.
* Ingestion QA agent.
* Rich essay reuse suggestions (LowEffortSuggestionGraph).
* Advanced editor with commenting & templates.

---

```
::contentReference[oaicite:0]{index=0}
```

## 6. Open Questions / Clarifications (Post-Demo)

These notes are not blocking for the hackathon demo but should be clarified for a more robust v1 architecture:

- **Application and essay status enums:** Confirm the allowed values for `applications.status` and any `readiness` labels, and how they map to dashboard and CTA behavior.
- **LangGraph vs direct LLM usage:** For each `/api/...` route, confirm whether we call the LangGraph service or Claude/Voyage directly in v1, especially if we simplify for the demo.
- **Autosave and versioning semantics:** Decide how frequently essays are autosaved, how `essays.version` is incremented, and how many historical `essay_reviews` we retain per essay.
- **Low-extra-work suggestions logic:** Clarify the similarity/effort heuristics used by `LowEffortSuggestionGraph` so that dashboard copy and expectations match actual behavior.
