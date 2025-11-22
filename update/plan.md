# GoGetScholarship – Short-Term Implementation Plan (Updated)

This plan reflects the current codebase and focuses on getting the *real* end‑to‑end demo working reliably with Neon, Voyage, and Claude.

---

## 0. Golden Path We Care About

Primary judge/demo flow (no mocks):

- Onboarding (`/onboarding`) → profile persisted via `POST /api/profile` (`students` + `student_embeddings`).
- Matches (`/matches`) → real results from `/api/match` or `/api/retrieve` over `scholarship_embeddings`.
- Scholarship detail (`/scholarship/$id`) → real row from `scholarships` + `scholarship_profiles` + `metadata`.
- Planning (`/scholarship/$id` → “Plan this scholarship”) → `/api/plan` writes to `applications` + `application_plans` + `application_tasks`.
- Essay workspace (`/essay/$id`) → rubric from `/api/rubric`, drafts from `/api/drafts`, grading via `/api/grade-essay`.
- Dashboard (`/dashboard`) → `/api/dashboard` summarises real drafts + scholarships for that `student_id`.

Everything in this plan is about making that path solid with real data.

---

## 1. Fix DB & Ingestion for Neon (Blocking)

Goal: make sure Neon matches `sql/schema.sql` and contains the same scholarships the app expects.

- [ ] **Apply full schema to Neon**
  - [ ] Run `sql/schema.sql` once against the Postgres instance pointed to by `DATABASE_URL` (via Neon console or `psql`).
  - [ ] Confirm core tables exist: `scholarships`, `scholarship_embeddings`, `students`, `student_embeddings`, `scholarship_profiles`, `drafts`, `applications`, `application_plans`, `application_tasks`, `scholarship_rubrics`.
  - [ ] Make sure `CREATE EXTENSION IF NOT EXISTS vector;` succeeds (required for `scholarship_embeddings.embedding`).

- [ ] **Re‑ingest scholarships into that Neon DB**
  - [ ] Start the dev server (`pnpm dev`) so `/api/ingest` is available.
  - [ ] Run `ADMIN_API_KEY=... pnpm ingest:rich data/scholarships.json` (or the JSONL variant) from the app root.
  - [ ] Verify:
    - [ ] `select count(*) from scholarships;` > 0
    - [ ] `select count(*) from scholarship_embeddings;` > 0

- [ ] **Sanity‑check matching**
  - [ ] Create a test profile via `/onboarding` and reach `/matches` without errors.
  - [ ] Confirm `/api/match` succeeds and returns rows with real IDs, names, and `dot_sim` values.

---

## 2. Planner & Dashboard: Make `/api/plan` Real

Goal: “Plan this scholarship” works without 500s and the dashboard can summarise applications.

- [ ] **Unblock `/api/plan`**
  - [ ] After the schema is applied, call `/api/plan` directly with a known `student_id` and `scholarship_id` (e.g., via Thunder Client / Postman) and confirm it returns `{ ok: true, tasks: [...] }`.
  - [ ] From `/scholarship/$id`, click “Plan this scholarship” and confirm tasks render in the UI instead of a generic error.
  - [ ] Verify rows were created:
    - [ ] `select * from applications where student_id = ... limit 5;`
    - [ ] `select * from application_tasks where plan_id in (select id from application_plans where application_id = ...);`

- [ ] **Wire Dashboard to planner data**
  - [ ] Confirm `/api/dashboard?student_id=...` returns `kpi` and `applications` without errors.
  - [ ] From `/dashboard`, verify:
    - [ ] KPI cards (total, inProgress, completed, potentialValue) reflect real drafts/applications.
    - [ ] Table rows link back to `/scholarship/$id` and correspond to real `drafts` + `scholarships` rows.
  - [ ] Leave the “Low extra work” suggestions heuristic/static for now but ensure it does not reference non‑existent IDs.

---

## 3. Winner Stories & “What Wins Here”

Goal: `data/winners.jsonl` actually influences what you see on `/scholarship/$id` via `metadata.winner_patterns`.

- [ ] **Align IDs between winners and scholarships**
  - [ ] For each “gold” scholarship you care about (e.g., Loran, Schulich, 3M, RBC):
    - [ ] Confirm `data/scholarships.json` `id` matches the corresponding `scholarship_id` in `data/winners.jsonl`.
    - [ ] If they differ (e.g., `...-2024` vs `...-2025`), either:
      - update the JSON source `id`, or
      - adjust the winners file so `winners.scholarship_id` equals `scholarships.metadata->>'id'` after ingest.

- [ ] **Run the winner‑pattern mining script against Neon**
  - [ ] Ensure `ANTHROPIC_API_KEY` and `DATABASE_URL` are set in your shell.
  - [ ] Run:  
    `node scripts/mine-winner-patterns.js data/winners.jsonl`
  - [ ] For a known scholarship (e.g., `3m-national-student-fellowship-ca-ug-2025`), verify in Neon:  
    `select metadata->'winner_patterns' from scholarships where metadata->>'id' = '3m-national-student-fellowship-ca-ug-2025';`

- [ ] **Verify UI integration**
  - [ ] Open `/scholarship/$id` for a scholarship that has winner patterns.
  - [ ] Confirm the right‑hand panel shows “What wins here” / winner‑pattern content drawn from `metadata.winner_patterns` (not mocked text).

---

## 4. Essay Workspace & Rubric Grading

Goal: `/essay/$id` uses real rubrics and real grading, with no hard‑coded scores or mock shapes.

- [ ] **Rubrics in the DB**
  - [ ] For at least 2–3 gold scholarships, create a rubric and store it via `POST /api/rubric`:
    - Payload: `{ scholarship_id: <uuid>, rubric: [{ id, name, description?, weight? }, ...] }`.
  - [ ] Confirm `scholarship_rubrics` contains those rows and `GET /api/rubric?scholarship_id=...` returns them.

- [ ] **Essay workspace wiring**
  - [ ] On `/essay/$id`, confirm:
    - [ ] Scholarship name and prompt are loaded from `/api/scholarship/$id` (`metadata.essay_prompts_raw[0]` when present).
    - [ ] The editor loads the latest draft from `/api/drafts?student_id=...&scholarship_id=...` when available.
    - [ ] “Save” writes to `/api/drafts` and updates `drafts` in Neon.

- [ ] **Grading UI matches `/api/grade-essay` schema**
  - [ ] Ensure `handleAnalyze` sends `{ text, rubric }` to `/api/grade-essay` and that the response shape `{ criteria: [{ id, name, score, max, feedback }], readiness }` is used directly:
    - [ ] Replace the hard‑coded `72 / 100` score in the sidebar with an aggregate score derived from `criteria` (e.g., average of `score/max * 100`).
    - [ ] Update rubric list items to use `name`, `score`, `max`, and `feedback` instead of the old mock fields (`criteria`, `maxScore`, `status`).
  - [ ] Decide on auth for grading:
    - [ ] Either drop the ADMIN key requirement for `/api/grade-essay` (hackathon‑only), **or**
    - [ ] Add a thin, unauthenticated proxy route the UI calls, which in turn hits `/api/grade-essay` with the server‑side ADMIN key.

---

## 5. Explain‑Fit & Student Identity

Goal: “Why this fits you” works reliably for the same student across Matches, Detail, and Essay.

- [ ] **Student ID propagation**
  - [ ] Confirm `/onboarding` POSTs to `/api/profile` and receives a `student_id`.
  - [ ] Ensure `scholarship_student_id` and `student_id` are both stored in `localStorage` (already wired in `onboarding.tsx`) and that `/scholarship/$id` and `/essay/$id` read from those keys.

- [ ] **Explain‑fit end‑to‑end**
  - [ ] For a known scholarship + profile, click “Why this fits you” on `/scholarship/$id`.
  - [ ] Confirm `/api/explain-fit` returns structured JSON and the dialog shows:
    - [ ] Overall score,
    - [ ] Reasons,
    - [ ] Eligibility notes,
    - [ ] Gaps.
  - [ ] If the button is clicked without a `student_id` present, show a clear message (“Complete onboarding first”) rather than a generic alert.

---

## 6. UX Polish & Safety (After Things Work)

Once the above is stable, clean up the experience:

- [ ] **Navigation & landing**
  - [ ] Make `/onboarding` the primary entry point; ensure `/` clearly points judges there on first visit.
  - [ ] Keep `/profile` as an advanced/dev page (linked but not primary).

- [ ] **Loading and error feedback**
  - [ ] Confirm every critical action along the golden path has good UX:
    - onboarding submit → `/api/profile`
    - matches fetch → `/api/match` / `/api/retrieve`
    - plan creation → `/api/plan`
    - essay save → `/api/drafts`
    - essay grading → `/api/grade-essay`
    - explain‑fit → `/api/explain-fit`
  - [ ] Add toasts or inline messages for error cases; never leave a blank state after a 4xx/5xx.

- [ ] **Demo rehearsal**
  - [ ] Run at least one full walkthrough (Onboarding → Matches → Scholarship Detail → Plan → Essay → Grade → Dashboard) using a single “gold” scholarship and student profile and confirm no 5xxs, no obviously wrong data, and reasonable latency at each step.

