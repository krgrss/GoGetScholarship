# GoGetScholarship – Product Requirements

> **File:** `product-requirements.md`  
> **Scope:** What the product must do for the hackathon demo (WHAT, not HOW).  
> **Audience:** Judges, PM, eng, design.

---

## 1. Product Summary

### 1.1 One-liner

**GoGetScholarship** is an AI scholarship **coach** that:
- finds **relevant, realistic** scholarships,  
- makes eligibility and demographic focus **transparent**,  
- and **coaches** students through **rubric-aware drafting and self-grading** of their applications.

### 1.2 Target user

- **Primary:**  
  - High school / undergraduate students (including international + first-gen)  
  - Applying to multiple scholarships in Canada / US (expandable globally).
- **Context:**
  - Overwhelmed by choices.
  - Unsure about eligibility (especially demographics, citizenship, GPA).
  - Unsure what a “good” scholarship essay looks like.
  - Limited time → wants **max impact per hour**.

### 1.3 Core problems

1. *“I don’t know which scholarships are actually for me.”*  
   → Too many generic lists, hidden eligibility, unclear demographics.

2. *“I can’t tell if my essays are good enough.”*  
   → No concrete rubric; vague feedback from internet / friends.

3. *“I’m busy; I can’t manage 5–10 different applications in my head.”*  
   → Deadlines, components, and reuse opportunities are hard to track.

---

## 2. Value Proposition

### 2.1 For students

- **Relevant, transparent matches**  
  - See scholarships that actually fit your profile, with clear eligibility & demographic conditions.
- **Rubric-aware coaching**  
  - Draft and refine essays knowing *exactly* what criteria matter.
- **Time-weighted planning**  
  - Know which scholarships are heavy vs light, and which ones you can apply to with **minimal extra work**.

### 2.2 For judges (what’s novel/impressive)

- Not just “AI writes essays” → **AI grounded in real rubrics and eligibility**.
- Clear modeling of **demographic eligibility vs priority**, with transparent UX.
- A **LangGraph-powered RubricCoach**: evaluator–optimizer loop that grades and revises against a rubric, not vibes.
- A realistic **data + RAG** story with transparent sources and rich schema.

---

## 3. User Scenarios (for Demo)

### Scenario A – “Find and understand my scholarships”

1. Student completes profile (country, level, major, GPA, optional demographics + about-me text).
2. Sees a **Matches** page of scholarships:
   - Cards show: eligibility tags, demographic focus chips, workload chip.
3. Clicks a scholarship:
   - Sees eligibility breakdown, demographic focus, components.
   - Clicks **“Why this fits you”** → gets 3–4 bullets grounded in their profile + scholarship data.

**Outcome:** Judge sees we can move from profile → relevant, transparent matches → explanation.

---

### Scenario B – “Plan and draft my main scholarship”

1. On a scholarship detail page, user clicks **“Plan this scholarship”**:
   - App auto-creates a task list (essay, refs, transcript, etc.) with suggested dates.
2. User clicks **“Start essay”**:
   - Opens a workspace with:
     - prompt + word limit,
     - rubric / “what they care about” sidebar,
     - editor and AI buttons (outline, draft from bullets).

**Outcome:** Judge sees we can convert requirements into a **plan** and a **rubric-aware drafting space**.

---

### Scenario C – “Grade and improve my essay with a rubric”

1. Student writes or generates a draft.
2. Clicks **“Grade against rubric”**:
   - Receives per-criterion scores (1–5) and feedback.
   - Sees overall readiness (“Needs work / Solid / Ready”).
3. For a weak criterion, clicks **“Improve this”**:
   - Side-by-side diff: original vs revised.
   - Accepts revision, then sees improved scores / readiness.

**Outcome:** Judge sees a tangible **evaluate → explain → revise** loop, not just one-shot generation.

---

### Scenario D – “Find low extra work scholarships”

1. After finishing one strong essay, student visits **Dashboard**.
2. System shows:
   - status per scholarship,
   - readiness,
   - “Low extra work suggestions”:
     - e.g. “This scholarship has a similar leadership essay, same or lighter workload.”
3. Student clicks suggestion → sees new scholarship detail + can start planning/drafting.

**Outcome:** Judge sees we help students **re-use effort** smartly, leveraging embeddings + workload modeling.

---

## 4. Feature Requirements

### 4.1 Feature 1 – Profile & Onboarding

**Goal:** Collect enough signal to generate **useful, personalized matches**.

**Must-have:**

- Multi-step onboarding:
  - Basics: country, level of study, major, GPA (+ scale).
  - Optional demographics (with clear “optional” labels).
  - About me: free-text textarea; optional resume upload (even if we don’t parse file in MVP, we can treat it as future).
- Save to DB (`student_profiles`).
- Generate profile summary + embedding (Claude + Voyage).

**Nice-to-have:**

- Simple validation and friendly copy.
- “Skip optional” paths that still produce matches.

---

### 4.2 Feature 2 – Scholarship Matching & List

**Goal:** Show a ranked list of **eligible and relevant** scholarships.

**Must-have:**

- Matches list with:
  - Scholarship title, provider.
  - Amount + currency.
  - Deadline + “days left”.
  - Level + field tags.
  - Demographic chips (required vs priority).
  - Workload chip: e.g. “1 essay · 2 refs · transcript”.
- Filters:
  - Level of study, fields, country/region.
  - Workload (light/medium/heavy).
  - Toggle to hide clearly ineligible scholarships.
- Retrieval:
  - Hard filters via SQL.
  - pgvector ANN search on scholarships using `student_profiles.embedding`.

**Nice-to-have:**

- Sorting by deadline or amount.
- Highlight for targeted scholarships that match user demographics.

---

### 4.3 Feature 3 – Scholarship Detail & “Why this fits you”

**Goal:** Help student decide if the scholarship is worth it, and why it’s a good fit.

**Must-have:**

- Detail page sections:
  - About (description).
  - Eligibility (country, level, major, GPA, financial need).
  - Demographic focus:
    - Hard requirements vs priorities.
  - Application components checklist.
  - “What they care about” (themes + rubric criteria if available).
- Button: **“Why this fits you”**:
  - Calls LangGraph `ExplainFitGraph`.
  - Returns:
    - strengths (2–3 bullets),
    - gaps/notes (1–2 bullets),
    - all grounded in profile + scholarship DB fields.

**Nice-to-have:**

- Link to official page and winners page (if present).
- Small fairness text: “Eligibility is based on information from the official page; please double-check.”

---

### 4.4 Feature 4 – Application Planner

**Goal:** Turn components into a **concrete to-do list and timeline**.

**Must-have:**

- Generate plan from `application_components` + deadline:
  - Tasks (essay, refs, transcript, interview).
  - Suggested due dates.
- UI to:
  - view tasks (checkboxes),
  - mark complete,
  - adjust due dates.
- Persist plan and tasks in DB.

**Nice-to-have:**

- Very simple workload estimate (“~3–5 hours”).

---

### 4.5 Feature 5 – Rubric-Aware Essay Workspace

**Goal:** Provide a space that keeps rubric/criteria visible and helps align the essay.

**Must-have:**

- Editor view with:
  - scholarship prompt and word limit,
  - editor textarea,
  - word count.
- Sidebar with:
  - rubric criteria (name + weight) if available,
  - themes (“Leadership”, “Community impact”, etc.).
- AI actions:
  - Generate outline (from prompt + rubric, optional user bullets).
  - Draft from bullets (user provides bullet points → draft paragraph or full essay).

**Nice-to-have:**

- Rewrite for clarity / tone.
- Ability to insert outline separately from final draft.

---

### 4.6 Feature 6 – RubricCoach (Self-Grading & Revision Loop)

**Goal:** Let students **grade and improve** their essay against explicit criteria.

**Must-have:**

- “Grade against rubric” button:
  - Runs `RubricCoachGraph` (grade mode).
  - Returns per-criterion scores (1–5) + textual feedback.
  - Computes readiness label: “Needs work”, “Solid”, or “Ready”.
- Display:
  - Table/list of criteria, scores, brief feedback.
  - Overall feedback and readiness indicator.
- “Improve this” per criterion:
  - Shows revised text vs original (diff or side-by-side).
  - User can accept or reject revision.
- Persist reviews in DB (`essay_reviews`).

**Nice-to-have:**

- Quick re-grade after accepting revision (for that criterion).
- Visual gauge showing progress from first grade to latest.

---

### 4.7 Feature 7 – Dashboard & Low Extra Work Suggestions

**Goal:** Give users a **portfolio view** and highlight where they can reuse effort.

**Must-have:**

- Dashboard listing:
  - scholarships user is tracking,
  - status (not started, in progress, ready, submitted),
  - deadline,
  - readiness (from latest `essay_reviews`).
- “Low extra work suggestions” panel:
  - At least a basic heuristic:
    - pick other scholarships with similar field/themes and lower/equal workload.
    - OR manually curated for demo.
  - Show:
    - reason: “Similar leadership essay” or “short extra essay only”.

**Nice-to-have:**

- Real prompt similarity via embeddings.
- Click goes straight to detail or essay workspace with context.

---

## 5. Constraints & Out-of-Scope (Hackathon)

### 5.1 Constraints

- **Time:** ~10 days hackathon → must prioritize **demo flow** over full completeness.
- **Dataset:** limited but high-quality set (tens–hundreds) of scholarships for demo.
- **Models:** Claude + Voyage only (no custom training).
- **Infra:** single-region, simple deployment (no complex multi-tenant scaling).

### 5.2 Out-of-scope for now

- Native mobile apps.
- Full multi-language support (v1 English only).
- Organization/administrator portals.
- Automatic scraping at large scale in real time (we can rely on prebuilt dataset).
- Fully automated multi-round essay optimization (we do one round, maybe a second).

---

## 6. Success Criteria (for Hackathon)

### 6.1 Demo-level success

We consider the hackathon MVP successful if:

1. **End-to-end flow works for at least 1–2 “gold” scholarships**:
   - Onboard → Matches → Detail → Plan → Draft → Grade → Improve → Dashboard.

2. **Judges can see, live:**
   - Transparent eligibility & demographic focus.
   - A **clear explanation** of fit (“Why this fits you”).
   - A rubric-aware grading panel with scores and actionable feedback.
   - A revision diff that clearly improves a weak criterion.

3. **No blocking failures**:
   - If the AI fails, UI shows a supportive error message and doesn’t lose user’s text.

### 6.2 Product-quality signals

- **Perceived usefulness** (small pilot / judge feedback):
  - “Would you actually use this to prepare your real scholarship applications?”
- **Clarity and trust:**
  - Judges can see where conditions/rubrics come from, not just black-box AI.
- **Responsibility:**
  - Demographic handling and fairness are explicitly surfaced and not hidden.

---

## 7. Release Plan (Hackathon Phases)

### Phase 1 – Skeleton (Days 1–2)

- Implement:
  - Onboarding (profile form).
  - Bare `/matches` page with mocked scholarships.
- Hook:
  - Postgres schema,
  - basic scholarship retrieval,
  - embeddings generation pipeline.

### Phase 2 – Matching + Detail (Days 3–4)

- Real matching using pgvector.
- Implement scholarship detail view with components & demographic focus.
- Implement `ExplainFitGraph` and connect `Why this fits you`.

### Phase 3 – Planner + Essay Workspace (Days 5–6)

- Planner (tasks from components).
- Essay workspace UI:
  - prompt + editor,
  - basic AI draft/outline.

### Phase 4 – RubricCoach (Days 7–8)

- Implement grading and revision flows.
- Store `essay_reviews`.
- UX for rubric panel and revision diff.

### Phase 5 – Dashboard + Polish (Days 9–10)

- Dashboard + simple low extra work suggestions.
- Error handling, loading states, demo paths.
- Final passes on copy, safety, and narrative.

---

## 8. Non-Functional Requirements

- **Performance:**  
  - Matches query: ≤ 500ms typical.
  - Rubric grading: ≤ 3–5s perceived (with spinner and clear status).
- **Reliability (demo context):**
  - Can handle a few concurrent users without breaking.
- **Security / privacy (baseline):**
  - No exposed secrets on frontend.
  - Essays and profiles not logged in plaintext in console logs.

---
