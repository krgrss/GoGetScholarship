````markdown
# GoGetScholarship – System Architecture (LangGraph Edition)

## 1. High-Level Overview

GoGetScholarship is an AI-powered **scholarship coach**, not just a matcher. It:

- Matches students to scholarships using **semantic search + structured filters**.
- Surfaces **transparent eligibility & demographic focus**.
- Helps students **plan** their applications.
- Provides a **rubric-aware essay workspace** that:
  - drafts with the scholarship’s own criteria in mind,
  - **self-grades** against a rubric,
  - and runs a **targeted revision loop** (grade → explain → revise).

At a high level:

1. **Ingest scholarships & rubrics** → normalize into a rich schema → embed with
   **Voyage 3.x** → store in **PostgreSQL + pgvector** (HNSW, inner product).
2. **Student onboards** → profile text summarized → embedded → used for
   personalized matching + context for essays.
3. **Matching** → hard filters (country, level, GPA, demographics) in SQL →
   **pgvector ANN** over `scholarship_embeddings` → matches list with clear
   tags (themes, workload, demographic focus).
4. **Scholarship detail** → transparent eligibility, demographic focus,
   application components, and an AI **“Why this fits you”** explainer.
5. **Essay workspace** → Rubric-aware drafting + **LangGraph**-powered
   **RubricCoach** that grades each criterion and proposes targeted revisions.
6. **Dashboard** → track applications, readiness (from rubric scores), and
   suggest **“low extra work”** scholarships where existing essays can be reused.

---

## 2. User Journey & UX Overview

End-to-end UX flow (also works as a slide diagram):

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
````

### 2.1 Onboard & Profile

* **Screen:** multi-step onboarding.
* Student:

  * Enters country, level, major, GPA.
  * Optionally shares demographic info (gender, race/ethnicity, first-gen, etc.)
    – clearly marked as **optional**.
  * Pastes “About me” or uploads a résumé / activity list.
* System:

  * Saves structured profile to `student_profiles`.
  * Uses Claude to extract a structured profile and generate a profile summary.
  * Embeds the summary with Voyage → `student_profiles.embedding`.

### 2.2 Matches List

* **Screen:** list of scholarship cards with filters.
* Each card shows:

  * Title, provider, amount, deadline.
  * Level / field tags.
  * **Demographic chips** (e.g. “Women in STEM”, “First-gen priority”).
  * **Workload chip** (e.g. “1 essay · 2 refs · transcript”).
* System:

  * `GET /api/matches` → Postgres hard filters + pgvector ANN search
    over `scholarship_embeddings.embedding`.

### 2.3 Scholarship Detail + “Why this fits you”

* **Screen:** detail view with sidebar.
* Sections:

  * Overview & description.
  * Structured eligibility (country, level, GPA, citizenship).
  * **Demographic focus** (required vs priority groups).
  * Application components checklist.
  * Sidebar: “What they care about” (themes + rubric criteria).
  * Buttons: **Plan this**, **Start essay**, **Why this fits you**.
* System:

  * `GET /api/scholarships/:id` for base data.
  * `POST /api/scholarships/:id/explain-fit` → LangGraph `ExplainFitGraph`
    (Claude) returns 3–4 bullets explaining fit & gaps.

### 2.4 Application Planner

* **Screen:** simple checklist + dates.
* For a scholarship:

  * Tasks like “Draft essay”, “Ask recommender”, “Request transcript”.
  * “Do by” dates relative to deadline.
* System:

  * `POST /api/scholarships/:id/plan`:

    * maps `application_components` + `deadline` → tasks and dates
      (pure logic, no LLM).

### 2.5 Essay Workspace (Rubric-Aware)

* **Screen:** split view.

  * Left: prompt + word limit + editor.
  * Right: rubric criteria (“Impact”, “Leadership”, “Fit”), top themes.
  * Actions: “Outline”, “Draft intro”, “Use my bullet points”.
* System:

  * `POST /api/scholarships/:id/essays`:

    * Node → LangGraph `DraftEssayGraph` → Claude generates outline or draft
      conditioned on the rubric + themes + user profile.

### 2.6 Rubric Self-Grading & Revision (RubricCoach)

* **Screen:** rubric tab in the essay workspace.

  * Each criterion: score (1–5), one-line feedback, “Improve this” button.
  * Diff view when revision is proposed (original vs improved).
* System:

  * `POST /api/scholarships/:id/essays/:essayId/grade`:

    * Node → LangGraph `RubricCoachGraph` (grade phase).
  * `POST /api/scholarships/:id/essays/:essayId/improve`:

    * Node → LangGraph `RubricCoachGraph` (revise phase) with `criterion_id`.

### 2.7 Dashboard & “Low Extra Work” Suggestions

* **Screen:** dashboard.

  * Status per scholarship (Not started / In progress / Ready).
  * Readiness meter based on rubric scores.
  * Panel: “Low extra work options” – scholarships with similar prompts and
    similar or lower workload.
* System:

  * `GET /api/dashboard` → aggregates `applications`, `essays`,
    `essay_reviews`.
  * `GET /api/suggestions/low-extra-work` → pgvector similarity between essay
    prompts and other scholarships’ prompts + effort filters.

---

## 3. Stack Summary

### 3.1 Frontend (CORE)

* **React + TanStack Start**

  * Full-stack React framework with SSR and server functions.
  * Routes for both pages and API handlers.

* **TanStack Query / Start loaders**

  * Data-fetching for matches, detail pages, dashboard.

* **shadcn/ui + Tailwind CSS**

  * UI kit and styling:

    * cards, sidebars, dialogs/drawers,
    * tabs for rubric vs editor,
    * diff view wrapper.

* **Editor**

  * Start with textarea or a simple rich-text editor.
  * Optional: TipTap/Slate for advanced formatting (STRETCH).

### 3.2 Backend (Node / TanStack Start)

* **Server routes (Nitro)**

  * `/api/profile`
  * `/api/matches`
  * `/api/scholarships/:id`
  * `/api/scholarships/:id/explain-fit`
  * `/api/scholarships/:id/plan`
  * `/api/scholarships/:id/essays`
  * `/api/scholarships/:id/essays/:essayId/grade`
  * `/api/scholarships/:id/essays/:essayId/improve`
  * `/api/dashboard`
  * `/api/suggestions/low-extra-work`

* **Responsibilities**

  * Input validation and auth.
  * Reading/writing Postgres.
  * Calling:

    * Claude for one-shot tasks (profile summarization),
    * Voyage for embeddings,
    * LangGraph microservice for agentic flows.

### 3.3 LangGraph Agent Service (Python) (CORE FOR RUBRIC FEATURES)

Separate microservice responsible for multi-step LLM workflows.

* Built with:

  * **Python + LangGraph** for stateful graphs.
  * Claude (via official SDK / LangChain integration).

* Graphs:

  1. `ExplainFitGraph`

     * Input: `{ user_id, scholarship_id }`.
     * Output: bullets `why_fit[]`, `potential_gaps[]`.
  2. `DraftEssayGraph`

     * Input: `{ user_id, scholarship_id, mode, bullets? }`.
     * Output: `draft_text`, optional `outline`.
  3. `RubricCoachGraph`

     * Grade phase:

       * Input: `{ essay_id }`.
       * Output: per-criterion scores + feedback + readiness.
     * Revise phase:

       * Input: `{ essay_id, criterion_id }`.

       * Output: revised text + (optional) re-scored criterion.

  * (STRETCH) `LowEffortSuggestionGraph` and `IngestionQAGraph`.

* Exposed via a simple HTTP interface, e.g.:

  * `POST /graph/explain-fit`
  * `POST /graph/draft-essay`
  * `POST /graph/rubric-coach`

### 3.4 LLM & Embeddings

* **Claude (Anthropic)**

  * Sonnet: complex reasoning (rubric grading, fit explanation, drafting).
  * Haiku: cheaper calls for small tasks (summaries, quick checks).

* **Voyage 3.x Embeddings**

  * For:

    * `scholarship_embeddings`
    * `student_profiles.embedding`
    * (later) essay/prompt embeddings for reuse suggestions.

### 3.5 Data Layer (PostgreSQL + pgvector)

* **Postgres**

  * Primary relational store for:

    * users & student profiles,
    * scholarships,
    * rubrics,
    * applications & essays,
    * reviews & plans.

* **pgvector (HNSW, inner product)**

  * `scholarship_embeddings(embedding vector(d))`
  * Optional:

    * `essay_prompt_embeddings`.

---

## 4. Data Model (Key Tables)

### 4.1 Scholarships

Simplified schema (core columns):

```sql
CREATE TABLE scholarships (
  id                uuid PRIMARY KEY,
  name              text NOT NULL,
  provider_name     text NOT NULL,
  provider_type     text NOT NULL, -- 'university','foundation','government',...
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
  frequency         text,          -- 'annual','one_time','rolling',...

  level_of_study        text[] NOT NULL,
  fields_of_study       text[] NOT NULL,
  min_gpa               numeric(3,2),
  gpa_scale             numeric(3,1),
  financial_need_required boolean,

  country_eligibility   text[] NOT NULL,
  citizenship_requirements text[] NOT NULL,
  is_international_students_allowed boolean NOT NULL,

  demographic_eligibility text[] NOT NULL,
  demographic_focus_raw   text,

  description_raw     text NOT NULL,
  eligibility_raw     text NOT NULL,

  essay_required      boolean NOT NULL,
  essay_prompts       jsonb, -- structured prompts [{id,prompt,word_limit}]
  application_components jsonb, -- essays, refs, transcript, etc.
  application_effort  text NOT NULL, -- 'low','medium','high'

  personality_profile jsonb, -- themes, top_themes, constraints
  rubric              jsonb, -- criteria [{id,name,description,weight}]
  transparency        jsonb  -- winners_url, publishes_winners, rating,...
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
USING hnsw (embedding vector_ip_ops); -- inner product
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
  demographic_self   jsonb,  -- self-reported (gender, race, first_gen,...)
  profile_summary    text,   -- LLM-generated summary
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
  status          text NOT NULL, -- 'not_started','in_progress','ready','submitted'
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE essays (
  id              uuid PRIMARY KEY,
  application_id  uuid NOT NULL REFERENCES applications(id),
  prompt_id       text,          -- matches essay_prompts[].id
  content         text NOT NULL,
  version         integer DEFAULT 1,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE essay_reviews (
  id              uuid PRIMARY KEY,
  essay_id        uuid NOT NULL REFERENCES essays(id),
  rubric_snapshot jsonb NOT NULL,      -- criteria at time of grading
  scores          jsonb NOT NULL,      -- [{id, score, max, feedback}]
  readiness       text NOT NULL,       -- 'needs_work','solid','ready'
  created_at      timestamptz DEFAULT now()
);
```

### 4.5 Application Plans

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

## 5. Core Workflows

### 5.1 Scholarship Ingestion (Offline / Back-office)

1. Scrape or manually collect official scholarship pages.
2. Normalize into the schema above:

   * identity, amounts, eligibility, demographics, components.
3. Generate:

   * `scholarship_embeddings.embedding` using Voyage.
   * Optional `personality_profile` / `rubric` via internal tools.
4. Insert into Postgres.

*(This can be a separate ingestion script / notebook, outside hackathon scope.)*

### 5.2 Matching

1. On request to `/api/matches`:

   * Load `student_profiles.embedding`.
   * Hard filter `scholarships` by eligibility fields + demographic_focus.
   * Join `scholarship_embeddings` for filtered IDs.
2. Use **pgvector HNSW** ANN search (inner product) to get top K matches.
3. Return scholarships with:

   * theme chips (from `personality_profile`),
   * workload chips (from `application_components` + `application_effort`).

### 5.3 Explain Fit (LangGraph)

1. Node calls `ExplainFitGraph` with `user_id`, `scholarship_id`.
2. Graph loads:

   * profile, demographics, GPA, field,
   * scholarship criteria, demographic_focus, themes.
3. Claude returns structured explanation.
4. Node returns to UI as bullet list.

### 5.4 Planner

1. Node reads `application_components` + `deadline`.
2. Maps traits to a standard set of tasks.
3. Saves tasks and due dates.
4. UI shows checklist and progress.

### 5.5 DraftEssayGraph (LangGraph)

1. Inputs: user, scholarship, mode (`outline`/`draft`/`rewrite`), bullets.
2. Graph nodes:

   * Load scholarship & rubric.
   * Load user profile summary + (optionally) one past essay.
   * Build LLM prompt with rubric & themes.
   * Claude generates outline/draft.
   * Save in `essays`.
3. Return draft text to UI.

### 5.6 RubricCoachGraph (LangGraph)

**Grade phase:**

1. Node sends `essay_id` → Graph.
2. Graph:

   * loads essay + rubric.
   * instructs Claude to:

     * score each criterion 1–5,
     * provide textual feedback.
   * computes readiness.
   * saves to `essay_reviews`.
3. UI:

   * shows per-criterion scores & feedback,
   * visual readiness meter.

**Revise phase:**

1. User selects criterion to improve.
2. Node sends `{essay_id, criterion_id}` → Graph.
3. Graph:

   * selects relevant text (for now: full essay or main paragraphs).
   * prompts Claude to revise specifically to improve that criterion.
   * saves new version in `essays`.
   * (optional) re-scores that criterion.
4. UI:

   * shows diff view,
   * lets user accept or reject revision.

### 5.7 Dashboard & Low Extra Work

1. `GET /api/dashboard`:

   * aggregate `applications` + `essay_reviews` → statuses & readiness.
2. `GET /api/suggestions/low-extra-work`:

   * embed essay prompts.
   * pgvector similarity to other scholarships’ essay prompts.
   * filter by eligibility + `application_effort <= current`.
   * optionally use Claude to generate a one-line explanation per suggestion.

---

## 6. Core vs Stretch

**CORE (hackathon MVP)**

* Onboarding + profile with optional résumé text.
* Scholarship matching (Postgres + pgvector + Voyage).
* Scholarship detail:

  * transparent eligibility,
  * demographic focus,
  * application components.
* Explain Fit (ExplainFitGraph).
* Planner (simple checklist).
* Essay workspace (basic draft via DraftEssayGraph).
* RubricCoachGraph:

  * single grading pass,
  * single revision per criterion (no loop).
* Dashboard with statuses & readiness.

**STRETCH / POST-HACKATHON**

* Multi-iteration rubric loop (auto re-grade until threshold).
* Multi-persona feedback (admissions officer vs peer vs recruiter).
* Ingestion QA agent (IngestionQAGraph).
* LowEffortSuggestionGraph with richer logic & explanations.
* Rich text editor with templates and saved snippets.
* Transparency scores and winners data visualizations.

---

```
::contentReference[oaicite:0]{index=0}
```
