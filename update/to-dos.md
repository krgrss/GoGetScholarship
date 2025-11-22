# GoGetScholarship - Hackathon To-Dos

## 0. Critical Bug Fixes ⚠️ ROOT CAUSE IDENTIFIED (BLOCKING - Fix First!)

### **BUG #1: Onboarding Never Saves to Database** 🔴 CRITICAL

- [ ] **Replace fake API call with real `/api/profile` POST** in `src/routes/onboarding.tsx`
  - [ ] Remove lines 102-103 (fake `setTimeout` delay)
  - [ ] Add real API call pattern from `src/routes/profile.tsx` lines 43-64
  - [ ] Must POST to `/api/profile` with: `summary`, `name`, `gpa`, `major`, `country`, `metadata`
  - [ ] Must save returned `student_id` to `localStorage.setItem('scholarship_student_id', student_id)`
  - [ ] Keep existing localStorage save for `scholarship_profile` for backward compatibility
- [ ] **Verify fix works**: Complete onboarding → check database for new row in `students` table

### **BUG #2: Matches Page Uses Mock Data** 🔴 CRITICAL

- [ ] **Replace MOCK_MATCHES with real API call** in `src/routes/matches.tsx`
  - [ ] Remove hardcoded `MOCK_MATCHES` array (lines 59-115)
  - [ ] Add `useEffect` to fetch from `/api/match` on page load
  - [ ] Get `student_summary` from `localStorage.getItem('scholarship_profile')`
  - [ ] Call `/api/match` with `{ student_summary, k: 20 }`
  - [ ] Map API response to `MatchCard[]` format
  - [ ] Keep MOCK_MATCHES as fallback ONLY for error states
- [ ] **Add Browse All mode**: Fetch all scholarships without profile filter
- [ ] **Add "Find My Match" button**: Toggle between Browse All and profile-matched

### **BUG #3: Dashboard Shows Mock Data** 🟡 MEDIUM

- [ ] **Wire dashboard to real data** in `src/routes/dashboard.tsx`
  - [ ] Replace `kpiData` (lines 52-77) with real stats from database
  - [ ] Replace `applications` (lines 79-120) with user's actual applications
  - [ ] Replace `suggestions` (lines 122-135) with real "low extra work" analysis
- [ ] **For now**: Show message "Dashboard coming soon" or hide the page

### **BUG #4: Dashboard Route Wrong** 🟢 LOW

- [ ] **Fix link** in `src/components/Header.tsx` line 63
  - [ ] Change `to="/"` to `to="/dashboard"`

### **BUG #5: Onboarding Auto-Skip** 🟡 MEDIUM

- [ ] **Check 'about' step** in `src/routes/onboarding.tsx` around lines 36-40
  - [ ] Remove `optional: true` flag if present on 'about' step
  - [ ] Test that final step doesn't auto-skip

---

### **FILES THAT WORK CORRECTLY** ✅

- `src/routes/scholarship/$id.tsx` - Uses real API
- `src/routes/profile.tsx` - Correct `/api/profile` implementation (use as reference!)
- All `/api/*` endpoints appear to be working

## 1. Demo Happy Path (High Priority)

- [ ] Create a guided landing/dashboard on `/` with clear steps: **Profile → Matches → Scholarship → Draft & Grade**.
- [ ] Add a prominent link/button on `/` to `/profile` (e.g., "Start with your profile").
- [ ] Smoke-test the full flow with 2-3 curated profiles and scholarships (no errors, reasonable latency).
- [ ] Clarify the guided flow text as: Profile → Matches → Scholarship → Draft, and explicitly mention updating CTAs/copy in `src/routes/index.tsx`.

## 2. Smooth UX & Polish

- [ ] Add loading states (spinners or skeletons) for onboarding submit, matches fetch, and scholarship detail load so the user never sees confusing blank screens.
- [ ] Make sure all critical actions (submit profile, generate draft, grade essay, explain fit) show clear success/error toasts and never leave the user wondering what happened.
- [ ] Double-check keyboard navigation and focus handling on the main flow (onboarding → matches → scholarship → draft/grade) so the demo looks accessible and well-considered.
- [ ] Do at least one full “walkthrough” pass from a judge’s perspective and fix any awkward copy, layout jumps, or confusing labels before recording the video.

## 3. Profile & Matching

- [ ] Lightly polish the `/profile` layout so the new fields (education level, status, identity, need) feel grouped and readable.
- [ ] Verify `student_summary` looks clean for 2-3 example inputs (no duplicated or noisy lines).
- [ ] Ensure `/api/match` + `/api/rerank` still perform well with the richer summary (no obvious irrelevant top results).
- [ ] Confirm `/onboarding` successfully persists to `/api/profile` and that `scholarship_student_id` is available for downstream APIs.
- [ ] Replace remaining uses of `MOCK_MATCHES` by wiring `/matches` fully to `/api/match` (keep a small static fallback only for error states).
- [ ] Add a checkbox in the evaluation checklist to explicitly run `/api/retrieve` + `/api/match` + `/api/rerank` in tests (not just `/api/match`).
- [ ] Add a checkbox to compute and record `good@10` / `(good+meh)@10` for 3 demo profiles directly into `docs/evaluation-metrics.md`.
- [x] Update `/api/profile` and backing tables toward the documented `student_profiles` shape (level_of_study, fields_of_study, gpa_scale, demographic_self, profile_summary + embedding) so future work can swap to that cleanly.

## 4. Scholarship Detail & Drafting

- [ ] For 3-5 demo scholarships, run `/api/personality` and store profiles so the sidebar and drafts are well-targeted.
- [ ] For the same scholarships, define and save rubrics via `/api/rubric` that match their prompts/values.
- [ ] On `/scholarship/$id`, confirm:
  - [ ] The hard-coded mock scholarship object in `src/routes/scholarship/$id.tsx` is replaced with real data from `/api/scholarship/$id` (at least for the gold demo IDs).
  - [ ] Personality section loads correctly (weights, themes, tone).
  - [ ] Draft generation with `/api/draft` works for the demo profiles.
  - [ ] Rubric grading (`/api/grade-essay`) produces clear, non-buggy feedback.
  - [ ] For 2-3 "gold" scholarships, verify rubric + explain-fit + drafting + grading all work together end-to-end (single scholarship where every AI feature is turned on).

## 5. "Why This Fits You" Explanation

- [ ] Decide on the `studentId` strategy for the fit explanation:
  - [ ] Either wire a simple transient `studentId` from onboarding/profile → matches → scholarship, **or**
  - [ ] Update the fit explanation flow to rely on `studentSummary` instead of `studentId` for the demo.
- [ ] Once decided, test the "Why this fits you" button on `/scholarship/$id` for the curated demo cases.

## 6. Evaluation & Telemetry (Lightweight)

- [ ] For 3 demo profiles, manually judge top-10 matches and record `good@10` / `(good+meh)@10` in `docs/evaluation-metrics.md`.
- [ ] Capture at least 2-3 before/after essay samples and rate them (1-5) to show improvement with RubricCoach.
- [ ] Skim recent telemetry logs to ensure no repeated 5xx/400 errors on the main demo path.
- [ ] Simulate LLM failure (e.g., temporarily break `ANTHROPIC_API_KEY`) and confirm the UI shows a clear, non-scary error message per AI error UX docs (no blank states, no JSON dumps).
- [x] Use `/admin/debug` or a simple timing harness to approximate p50/p90 latency for `/api/match`, `/api/rerank`, and `/api/draft` and write those numbers into `docs/evaluation-metrics.md`.

## 7. Judge-Facing Story

- [ ] Draft 1-2 slides or a short doc summarizing:
  - [ ] Problem & target user.
  - [ ] Pipeline overview (ingest → embed → retrieve → rerank → personality → draft → grade).
  - [ ] Key differentiators: demographic transparency, rubric-aware coaching, reuse of effort.
- [ ] Practice the live demo with a timebox (e.g., 5-7 minutes) to ensure it fits judging constraints.

## 8. Navigation & Information Architecture

- [ ] Replace demo navigation in `src/components/Header.tsx` with top-level nav items for `Matches` and `Dashboard` (and `Profile` if time).
- [ ] Ensure `/` behaves per UX docs: redirect to `/onboarding` (or `/profile` as an interim) on first visit, `/matches` when a profile is complete.
- [ ] Align route naming with docs where feasible (e.g., treat `/onboarding` + `/matches` + `/scholarship/$id` as the primary flow).
- [ ] Make `/onboarding` the canonical entry point for judges (only primary CTA), and either hide `/profile` from the main nav or clearly mark it as an advanced/dev page to avoid confusion.

## 9. Onboarding & Profile Wizard

- [ ] Break the current `/profile` into a simple multi-step flow (e.g., Basics → Academics → Activities & Stories → Demographics & Identity), even if implemented as sections on one route.
- [ ] Add brief helper copy explaining optional demographic/identity fields and how they are used.
- [ ] Confirm the richer onboarding still produces a concise, readable `student_summary` for the AI pipeline.

## 10. Matches Page & Cards

- [ ] Ensure the `Matches` screen reads from `/api/match` + `/api/rerank` and presents results as cards (no lingering mock-only cards beyond fallback).
- [ ] Add eligibility and demographic focus chips on each card (e.g., level, country, priority demographics) using existing scholarship metadata/personality.
- [ ] Include a lightweight workload indicator on cards (e.g., "Essay + Recs" vs "Short form") based on available components metadata or a simple heuristic.

## 11. Planner & Workload Modeling

- [ ] Decide where to store application components/workload (e.g., in `scholarships.metadata` or the planner tables described in `docs/db-requirements.md`).
- [ ] Implement a simple per-scholarship task list on `/scholarship/$id` (e.g., "Essay", "Recs", "Transcript") and mark completion in local state for the demo.
- [ ] If time allows, surface a rough workload chip ("Light / Medium / Heavy") derived from the components on both matches cards and the scholarship page.
- [ ] Bring the scholarships data model in line with `docs/system-architecture.md` / `docs/db-requirements.md` (explicit deadline, level_of_study/fields_of_study arrays, country_eligibility/citizenship, demographic_focus, application_components/application_effort) so planner generation and workload chips have structured data to rely on.

## 12. Dashboard & Low Extra Work Suggestions

- [ ] Create a minimal `/dashboard` route that shows scholarships the student has opened or drafted for (local/session-based is fine for hackathon).
- [ ] Display readiness labels pulled from rubric grading (`needs_work` / `solid` / `ready`) for those scholarships.
- [ ] Add a "Low extra work" suggestions section, even if heuristic (e.g., same field, similar prompt, and lower/equal workload than the main essay), and wire CTAs back into the scholarship detail page.

## 13. RubricCoach Revise Loop (MVP)

- [ ] Add an API endpoint or extend existing routes to support "revise for criterion X" based on `/api/grade-essay` and the rubric.
- [ ] On `/scholarship/$id`, let the user pick a weak criterion from the grading results and request a targeted revision.
- [ ] Show original vs revised text for that section and allow the user to accept or discard the revision (no need for a multi-iteration loop yet).

## 14. LangGraph & Architecture Alignment (Stretch)

- [ ] Sketch or stub LangGraph-style orchestrator functions (ExplainFitGraph, PlannerGraph, DraftEssayGraph, RubricCoachGraph) that wrap the existing APIs, even if they stay in-process for the hackathon.
- [ ] Update `docs/system-architecture.md` and `docs/architecture_2.md` with any deviations between the original graph plan and the implemented API-based flows.

## 15. Gemini UI Pass Alignment (New Branch)

- [ ] Review the new home page (`/` in `src/routes/index.tsx`) against `docs/ui-3.md` and update copy/CTAs so the four-step strip explicitly matches the primary flow: **Profile → Matches → Scholarship → Draft & Grade** (including linking "Detail" and "Draft" steps to the actual routes).
- [ ] Replace any remaining mock-only scholarships and matches in `src/routes/matches.tsx` and `src/routes/scholarship/$id.tsx` with real data from `/api/match` + `/api/scholarship/$id`, preserving the improved Shadcn-based layouts.
- [ ] Wire the `Priority matches only` / `Hide ineligible` checkboxes in `src/routes/matches.tsx` to the actual eligibility logic from `/api/match` (including demographic hard filters) instead of being purely visual toggles.
- [ ] Extend the new scholarship detail page (`/scholarship/$id`) to include a proper essay workspace section (prompt + editor + AI actions) and connect it to `/api/draft` + `/api/grade-essay`, so the visually rich layout also exercises the AI/RAG pipeline.
- [ ] Convert the inline "fit analysis" mock text on `/scholarship/$id` into a real `Why this fits you` dialog backed by `/api/explain-fit`, with sections for strengths and gaps that map to the JSON response.
- [ ] Ensure the new UI components (Cards, Badges, Dialogs, Filters) still respect accessibility and responsive requirements from `docs/ux-requirements.md` (focus states, keyboard navigation, mobile filter Sheet behavior).

## 16. Hackathon Requirements Alignment (Video, Deck, Comparative Demo)

- [ ] Design and record a 10-15 minute video demo that walks through: onboarding → matches → scholarship detail → plan → draft → grade → "why this fits you", using 1-2 "gold" scholarships and a realistic student profile.
- [ ] Build the required slide deck (PDF/PPTX) covering: approach overview, pattern-recognition + adaptive weighting + drafting methodology, comparison to generic essay tools, limitations, and future work.
- [ ] Implement and showcase a comparative demo: for at least one scholarship, generate (a) a generic essay and (b) a tailored essay using your system, then grade both with `/api/grade-essay` and highlight the improvement.
- [ ] For at least a couple of scholarships, ingest or mock winner stories and demonstrate how they influence personality weights, rubrics, or drafting guidance (e.g., "based on winners, emphasize projects over GPA").
- [ ] In the demo narrative, explicitly call out how you satisfy the hackathon's core requirements: pattern recognition, adaptive scoring, content generation, explainable AI, comparative improvement, and use of real scholarship data.

## 17. Data Ingestion Requirements (Dataset Quality)

- [ ] Ensure `data/scholarships.json` (or a `scholarships_clean.jsonl`) meets the MUST-HAVE fields from `docs/data-ingestion-requirements.md` for at least 50-150 scholarships: IDs, URLs, eligibility, demographics, components, application_effort, and core text fields.
- [ ] Spot-check that Canada/US scholarships dominate the demo set, with a few UK/EU/ASEAN examples to show geographic diversity.
- [ ] For 10-20 "gold" scholarships, verify that application_components, application_effort, essay_prompts, and basic rubrics are populated so planner, workload chips, and RubricCoach have meaningful data.
- [ ] Add a short note to `update/ai-rag.md` or `update/db.md` summarizing which parts of `docs/data-ingestion-requirements.md` are fully satisfied (MUST-HAVE fields) and which are simplified or deferred (winners, deep transparency metadata).

## 18. Standout Features

- [ ] Add a small “Bring your own scholarship” panel (URL/text input) that:
  - [ ] Calls `/api/personality` on the pasted scholarship text,
  - [ ] Optionally derives a simple rubric (or uses a default rubric shape),
  - [ ] Shows a live personality card (weights, themes, tone) and rubric,
  - [ ] Lets the user generate a tailored draft for that ad-hoc scholarship via `/api/draft`.
- [ ] Implement a “Story Reframer” view where a student can enter 1–2 core stories, then:
  - [ ] Select two scholarships and generate two drafts that emphasize different angles (e.g., leadership vs innovation vs need),
  - [ ] Grade both drafts via `/api/grade-essay` and surface which rubric criteria improved between framings.
- [ ] Add a “Compare essays” view on the scholarship detail page that:
  - [ ] Shows a naive/generic essay vs a tailored essay from `/api/draft`,
  - [ ] Grades both with `/api/grade-essay` and highlights the score/readiness delta and a few key rubric criteria where the tailored draft scores higher.
- [ ] Make personality and explain-fit more visual:
  - [ ] Render scholarship personality weights as a simple bar chart or chip set to show “what this scholarship really cares about,”
  - [ ] In the “Why this fits you” dialog, clearly map each strength/gap bullet back to specific personality weights and student profile fields so the AI’s reasoning is transparent.
