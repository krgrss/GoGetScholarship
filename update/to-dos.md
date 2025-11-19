# GoGetScholarship - Hackathon To-Dos

## 1. Demo Happy Path (High Priority)
- [ ] Create a guided landing/dashboard on `/` with clear steps: **Profile → Matches → Scholarship → Draft & Grade**.
- [ ] Add a prominent link/button on `/` to `/profile` (e.g., "Start with your profile").
- [ ] Smoke-test the full flow with 2-3 curated profiles and scholarships (no errors, reasonable latency).
- [ ] clarify the guided flow text as: Profile → Matches → Scholarship → Draft, and explicitly mention updating CTAs/copy in src/routes/index.tsx.

## 2. Profile & Matching
- [ ] Lightly polish the `/profile` layout so the new fields (education level, status, identity, need) feel grouped and readable.
- [ ] Verify `student_summary` looks clean for 2-3 example inputs (no duplicated or noisy lines).
- [ ] Ensure `/api/match` + `/api/rerank` still perform well with the richer summary (no obvious irrelevant top results).
- [ ] A checkbox to use /api/retrieve + /api/match + /api/rerank in tests (not just /api/match).
- [ ] A checkbox to compute and record good@10 / (good+meh)@10 for 3 demo profiles directly into docs/evaluation-metrics.md.
- [ ] Update /api/profile and the backing tables to the documented `student_profiles` shape (level_of_study, fields_of_study, gpa_scale, demographic_self, profile_summary + embedding) and swap match/explain-fit/draft flows to read from that instead of the legacy `students`/`student_embeddings` pair.

## 3. Scholarship Detail & Drafting
- [ ] For 3-5 demo scholarships, run `/api/personality` and store profiles so the sidebar and drafts are well-targeted.
- [ ] For the same scholarships, define and save rubrics via `/api/rubric` that match their prompts/values.
- [ ] On `/scholarship/$id`, confirm:
  - [ ] Personality section loads correctly (weights, themes, tone).
  - [ ] Draft generation with `/api/draft` works for the demo profiles.
  - [ ] Rubric grading (`/api/grade-essay`) produces clear, non-buggy feedback.
  - [ ] Keep personality + drafting checks.
Add a checkbox to capture 2–3 before/after essay pairs and log average improvement in docs/evaluation-metrics.md.
  - [ ] For 2–3 “gold” scholarships, verify rubric + explain‑fit + drafting + grading all work together end‑to‑end (single scholarship where every AI feature is turned on).

## 4. "Why This Fits You" Explanation
- [ ] Decide on the `studentId` strategy for the fit explanation:
  - [ ] Either wire a simple transient `studentId` from profile → matches → scholarship, **or**
  - [ ] Update the fit explanation flow to rely on `studentSummary` instead of `studentId` for the demo.
- [ ] Once decided, test the "Why this fits you" button on `/scholarship/$id` for the curated demo cases.

## 5. Evaluation & Telemetry (Lightweight)
- [ ] For 3 demo profiles, manually judge top-10 matches and record `good@10` / `(good+meh)@10` in `docs/evaluation-metrics.md`.
- [ ] Capture at least 2-3 before/after essay samples and rate them (1-5) to show improvement with RubricCoach.
- [ ] Skim recent telemetry logs to ensure no repeated 5xx/400 errors on the main demo path.
- [ ] Simulate LLM failure (e.g., temporarily break ANTHROPIC_API_KEY) and confirm the UI shows a clear, non-scary error message per AI error UX docs (no blank states, no JSON dumps).
- [ ] A checkbox to use /admin/debug to approximate latency for /api/match, /api/rerank, and /api/draft and write p50/p90‑style numbers into docs/evaluation-metrics.md.

## 6. Judge-Facing Story
- [ ] Draft 1-2 slides or a short doc summarizing:
  - [ ] Problem & target user.
  - [ ] Pipeline overview (ingest → embed → retrieve → rerank → personality → draft → grade).
  - [ ] Key differentiators: demographic transparency, rubric-aware coaching, reuse of effort.
- [ ] Practice the live demo with a timebox (e.g., 5-7 minutes) to ensure it fits judging constraints.

## 7. Navigation & Information Architecture
- [ ] Replace demo navigation in `src/components/Header.tsx` with top-level nav items for `Matches` and `Dashboard` (and `Profile` if time).
- [ ] Ensure `/` behaves per UX docs: redirect to `/onboarding` (or `/profile` as an interim) on first visit, `/matches` when a profile is complete.
- [ ] Align route naming with docs where feasible (e.g., treat `/profile` as `/onboarding` and add a dedicated `Matches` list view).

## 8. Onboarding & Profile Wizard
- [ ] Break the current `/profile` into a simple multi-step flow (e.g., Basics → Academics → Activities & Stories → Demographics & Identity), even if implemented as sections on one route.
- [ ] Add brief helper copy explaining optional demographic/identity fields and how they are used.
- [ ] Confirm the richer onboarding still produces a concise, readable `student_summary` for the AI pipeline.

## 9. Matches Page & Cards
- [ ] Introduce a dedicated `Matches` screen that reads from `/api/match` + `/api/rerank` but presents results as cards instead of a plain list.
- [ ] Add eligibility and demographic focus chips on each card (e.g., level, country, priority demographics) using existing scholarship metadata/personality.
- [ ] Include a lightweight workload indicator on cards (e.g., "Essay + Recs" vs "Short form") based on available components metadata or a simple heuristic.

## 10. Planner & Workload Modeling
- [ ] Decide where to store application components/workload (e.g., in `scholarships.metadata` or a dedicated table as per `docs/db-requirements.md`).
- [ ] Implement a simple per-scholarship task list on `/scholarship/$id` (e.g., "Essay", "Recs", "Transcript") and mark completion in local state for the demo.
- [ ] If time allows, surface a rough workload chip ("Light / Medium / Heavy") derived from the components on both matches cards and the scholarship page.
- [ ] Bring the scholarships data model in line with `docs/system-architecture.md`/`docs/db-requirements.md` (explicit deadline, level_of_study/fields_of_study arrays, country_eligibility/citizenship, demographic_focus, application_components/application_effort) so planner generation and workload chips aren’t depending on ad-hoc metadata.

## 11. Dashboard & Low Extra Work Suggestions
- [ ] Create a minimal `/dashboard` route that shows scholarships the student has opened or drafted for (local/session-based is fine for hackathon).
- [ ] Display readiness labels pulled from rubric grading (`needs_work` / `solid` / `ready`) for those scholarships.
- [ ] Add a "Low extra work" suggestions section, even if heuristic (e.g., same field, similar prompt, and lower/equal workload than the main essay), and wire CTAs back into the scholarship detail page.

## 12. RubricCoach Revise Loop (MVP)
- [ ] Add an API endpoint or extend existing routes to support "revise for criterion X" based on `/api/grade-essay` and the rubric.
- [ ] On `/scholarship/$id`, let the user pick a weak criterion from the grading results and request a targeted revision.
- [ ] Show original vs revised text for that section and allow the user to accept or discard the revision (no need for a multi-iteration loop yet).

## 13. LangGraph & Architecture Alignment (Stretch)
- [ ] Sketch or stub LangGraph-style orchestrator functions (ExplainFitGraph, PlannerGraph, DraftEssayGraph, RubricCoachGraph) that wrap the existing APIs, even if they stay in-process for the hackathon.
- [ ] Update `docs/system-architecture.md` and `docs/architecture_2.md` with any deviations between the original graph plan and the implemented API-based flows.
