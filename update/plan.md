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
  - [ ] If Claude access is unavailable, run the non‑LLM fallback:  
    `DATABASE_URL=... node scripts/apply-winner-patterns.js data/winners.jsonl`  
    then re‑check the query above to confirm `metadata.winner_patterns` is present.

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


## 0. Critical Bug Fixes (Immediate Priority) ⚠️ ROOT CAUSE IDENTIFIED

### **BUG #1: Onboarding Never Saves to Database** 🔴 CRITICAL

**File**: `src/routes/onboarding.tsx` lines 102-106
**Root Cause**: The `/api/profile` POST request has been **completely removed** and replaced with a fake delay:

```typescript
// Simulate API call  ← THIS IS THE BUG
await new Promise((resolve) => setTimeout(resolve, 800))

toast.success('Profile saved!')  ← LIE - Nothing was actually saved!
navigate({ to: '/matches' })
```

**Impact**:

- Profile is ONLY saved to` localStorage`, NOT the database
- No `student_id` is created in the `students` table
- No student embedding is created in `student_embeddings` table
- This breaks ALL downstream features that need student_id (matching, explain-fit, etc.)

**Fix Required**: Replace fake delay with real `/api/profile` call (see `src/routes/profile.tsx` lines 43-64 for correct implementation)

---

### **BUG #2: Matches Page Shows Mock Data** 🔴 CRITICAL

**File**: `src/routes/matches.tsx` line 59-115
**Root Cause**: Page uses hardcoded `MOCK_MATCHES` array instead of calling `/api/match`

```typescript
const MOCK_MATCHES: MatchCard[] = [  ← 4 hardcoded fake scholarships
  { id: '1', name: 'First-Gen STEM Innovators Scholarship', ... },
  // ... 3 more fake ones
]
```

**Impact**:

- Shows same 4 fake scholarships to every user
- Real scholarship database (74+ scholarships) is never queried
- User profile is never used for matching
- Defeats the entire purpose of the AI matching system

**Fix Required**: Replace MOCK_MATCHES with `/api/match` API call (with fallback for error states only)

---

### **BUG #3: Dashboard Entirely Fake** 🟡 MEDIUM

**File**: `src/routes/dashboard.tsx` lines 51-135
**Root Cause**: All dashboard data is hardcoded mock data:

- `kpiData` (lines 52-77) - Fake statistics
- `applications` (lines 79-120) - 4 fake applications
- `suggestions` (lines 122-135) - Fake "low extra work" suggestions

**Impact**:

- Dashboard shows same fake data to every user
- No actual application data from database
- "Low Extra Work" suggestions don't use real analysis

**Fix Required**: Wire to real database queries for user's actual applications

---

### **BUG #4: Dashboard Route Points to Wrong URL** 🟢 LOW

**File**: `src/components/Header.tsx` line 63
**Root Cause**: Dashboard link points to `/` instead of `/dashboard`

```typescript
<Link to="/" ...>  ← Should be "/dashboard"
```

---

### **BUG #5: Auto-Skip in Onboarding Final Step** 🟡 MEDIUM

**File**: `src/routes/onboarding.tsx` around line 36-40
**Root Cause**: The 'about' step likely has `optional: true` flag causing it to skip automatically

---

### **✅ WORKING CORRECTLY**:

- `src/routes/scholarship/$id.tsx` - Uses real `/api/scholarship/{id}` endpoint (lines 107-111)
- `src/routes/profile.tsx` - Correctly calls `/api/profile` (lines 43-64)

## 1. Make Scholarship Detail Fully Real (No Mocks)

- Replace the hard-coded scholarship object in `src/routes/scholarship/$id.tsx` with data from `GET /api/scholarship/$id` (at least for 2–3 “gold” demo scholarships).
- Surface real personality data (weights, themes, tone) on the scholarship page using `scholarship_profiles` populated via `/api/personality`.
- Wire the “Plan this scholarship” action to `/api/plan` so it creates/updates `applications` + `application_plans` + `application_tasks` for the current `student_id`/`scholarship_id` pair.

## 2. Hook Up AI Actions on Scholarship Page

- Add a “Generate tailored essay” button that calls `/api/draft` with:
  - the scholarship’s personality and rubric (if present),
  - the student profile (from onboarding/profile),
  - and show the returned `draft` + `explanation` in the UI with loading/error states.
- Add a “Grade against rubric” button that sends the current essay text and rubric to `/api/grade-essay`, then displays criterion scores, feedback, and readiness in a clear, compact panel.
- Add a “Why this fits you” button that calls `/api/explain-fit` using the saved `student_id` and `scholarship_id`, and render strengths/eligibility/gaps in a dialog or sidebar section.

## 3. Tighten the Golden Path UX

- Make `/onboarding` the canonical entry point:
  - Ensure the landing page (`/`) primary CTA points to `/onboarding`.
  - Hide `/profile` from the main nav or clearly label it as an advanced/dev page to avoid confusion.
- Add spinners and success/error toasts around all critical steps:
  - onboarding submit → `/api/profile`,
  - matches loading → `/api/match`,
  - draft generation → `/api/draft`,
  - grading → `/api/grade-essay`,
  - explain-fit → `/api/explain-fit`.
- Do a full walkthrough (Onboarding → Matches → Scholarship → Draft & Grade) from a judge’s perspective and fix any confusing copy, layout jumps, or dead controls (especially filters that don’t yet affect results).

## 4. Prepare a Comparative Demo & Metrics

- Choose 1–2 “gold” scholarships and a realistic student profile to use in all demos.
- For at least one of those scholarships:
  - Capture a naive/generic essay and a tailored essay generated via `/api/draft`.
  - Grade both with `/api/grade-essay` and record the rubric scores and readiness labels.
- Update `docs/evaluation-metrics.md` with:
  - measured `good@10` / `(good+meh)@10` for ~3 demo profiles,
  - before/after rubric scores for the comparative essay case,
  - rough p50/p90 latencies for `/api/match`, `/api/rerank`, and `/api/draft`.
- Use these concrete numbers and examples as the backbone of the slide deck and 10-15 minute video narrative.

## 5. Add High-Impact “Standout” Features

- Implement a small “Bring your own scholarship” panel where a student can paste a URL or scholarship description:
  - Call `/api/personality` (and optionally derive a simple rubric) on that text,
  - Show a live personality card (weights, themes, tone) and rubric,
  - Let the user immediately generate a tailored draft via `/api/draft` for that ad‑hoc scholarship.
- Add a “Story Reframer” view:
  - Let the student enter 1–2 core stories (projects, leadership, adversity),
  - For two different scholarships, show side‑by‑side drafts that emphasize different angles (leadership vs innovation vs need),
  - Grade both with `/api/grade-essay` and surface the rubric criteria that improve between versions.
- Add a “Compare essays” view on the scholarship page:
  - Show a naive/generic essay vs your tailored essay,
  - Grade both with `/api/grade-essay` and highlight the score/readiness delta and a few key rubric criteria where the tailored draft does better.
- Make explainability more visual:
  - Render scholarship personality weights as a simple bar chart or tagged chips (“what this scholarship really cares about”),
  - In the “Why this fits you” dialog, clearly map each strength/gap bullet back to specific personality weights and student profile fields.

## 6. Winner Stories & Pattern Mining

- Curate a tiny “winners set” of 5–10 scholarships already present in `data/scholarships_clean.jsonl` where public winner stories or profiles exist.
- Create a `data/winners.jsonl` file with a minimal schema per winner:
  - `scholarship_id`, `year`, `source_url`, a short `story_excerpt` or summary, `themes` tags, and an `angle` field (e.g., leadership / innovation / financial_need).
- Build a small offline script that, for each gold scholarship:
  - Loads the scholarship description + 1–3 winner excerpts,
  - Calls Claude with a “pattern mining” prompt to extract `pattern_themes`, `messaging_tips`, and `common_pitfalls`,
  - Writes these distilled patterns into `scholarships.metadata` (or a dedicated patterns table).
- Use those stored patterns to:
  - Power a “What wins here” card on the scholarship detail page,
  - Influence drafting prompts (e.g., “based on winners, emphasize projects over GPA”),
  - Enrich explain-fit and rubric displays for gold scholarships in the demo.
