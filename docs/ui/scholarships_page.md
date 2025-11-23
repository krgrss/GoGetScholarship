# GoGetScholarship – Scholarship Detail Page Spec

_Last updated: 2025-11-22_

## 1. Purpose & Vision

This page is the **hub for one specific scholarship**.

Primary job:

> Take a single scholarship and walk the student from **“what is this?”** → **“am I eligible?”** → **“what do I need?”** → **“how do I write a winning essay?”** → **“how do I plan and track it?”**, while **showcasing our AI (embeddings, personality, drafting, grading, planner)**.

It should feel like:

- a **clear brief + strategy** on the left,
- a **guided AI workspace** on the right.

Not: a collection of loosely related widgets.

---

## 2. Route & Layout

### 2.1 Route

- Route: `src/routes/scholarship/$scholarshipId.tsx`
- Query params:
  - `score` (optional): match score from Matches page.
  - `eligibility` (optional): `eligible | borderline | ineligible`.

### 2.2 Page Layout (Desktop)

```text
┌───────────────────────────────────────────────────────────────┐
│ Nav (Matches | Dashboard | Custom | Profile + Avatar)        │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ Back to Matches   Scholarship name + provider                 │
│                       [ Profile Match | Personality | Draft | Grade ] 
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ [ Left: Scholarship Snapshot & Requirements ]   [ Right: AI Workspace ] 
│   - About                                           - Stepper: 1–4 steps
│   - Eligibility summary                             - Strategy & Personality
│   - What you’ll need                                - Draft essay
│                                                     - Grade & compare
│                                                     - Plan & tasks
└───────────────────────────────────────────────────────────────┘
````

### 2.3 Page Sections (High Level)

1. **Header & Nav chips**

   * Scholarship title, provider, amount, frequency, deadline, match status.
   * Chips: `Profile Match`, `Personality`, `Draft`, `Grade` (scroll to sections).

2. **Left column – “Scholarship Snapshot”**

   * About this scholarship (+ Explain Fit).
   * Eligibility summary (how we checked).
   * Application components / workload.
   * Link(s) to official page and sources.

3. **Right column – “Application Workspace (AI)”**

   * **Step 1 – Strategy & Personality**
   * **Step 2 – Draft Essay**
   * **Step 3 – Grade & Compare**
   * **Step 4 – Plan & Tasks (for this scholarship)**

---

## 3. Global UX & Copy Principles

* **Student-first:** one clear story: “This is what this scholarship is, and here’s exactly how to win it.”
* **Guided flow:** Right side acts as a **stepper**:

  * `1) Strategy` → `2) Draft` → `3) Grade & compare` → `4) Plan & track`.
* **Group related concepts:**

  * All **requirements & eligibility** together.
  * All **essay work & rubric stuff** together.
  * All **planning/tasks** together.
* **AI visible but gentle:**

  * Light labels: `AI-explained`, `Embeddings-based`, `AI readiness`, `RubricCoach`.
  * Student copy uses simple language; judges can still infer tech from labels/tooltips.
* **No duplication:**

  * “Application components” + “Plan your application” + “Suggested tasks” should be one coherent story, not three scattered blocks.

---

## 4. Sections & Components

### 4.1 Header Bar & Nav Chips

**Component:** `<ScholarshipHeader />`

**Responsibilities:**

* Show:

  * `Back to Matches` link.
  * Scholarship name (2-line max) + provider.
  * Badges:

    * Amount range + frequency (`USD 1,000 – 50,000 · annual`).
    * Deadline + countdown (`Deadline: 12/14/2025 · 22 days left`).
    * Match score / status pill:

      * `Match score: 82` or `Match score unavailable`.
      * Subtext: `Using your saved profile + embeddings to rank this scholarship.`

* Nav chips (anchor links):

  * `Profile Match` (scroll to About + Eligibility).
  * `Personality` (scroll to Strategy & Personality).
  * `Draft` (scroll to Essay workspace).
  * `Grade` (scroll to Grade & Compare).

**Mobile:**

* Chips become a horizontally scrollable pill list.
* Header sticks to top (or at least chips do) when scrolling.

---

### 4.2 Left Column – Scholarship Snapshot

#### 4.2.1 About this scholarship

**Component:** `<ScholarshipAbout />`

**Data shape (conceptual):**

```ts
type ScholarshipAbout = {
  description: string; // short paragraph
  officialUrl: string;
  sources: { label: string; href: string }[];
};
```

**UI:**

* Title: `About this scholarship`
* Body text: description (2–4 lines).
* Primary action: `Explain Fit` button (AI).

  * Opens a small panel/modal summarizing:

    * Why this scholarship was recommended (profile features + embeddings).
    * How it aligns with the student’s GPA, activities, interests.
* Secondary actions in a row:

  * `View official page`
  * `Sources used` (if relevant).

---

#### 4.2.2 Eligibility summary

**Component:** `<EligibilitySummary />`

**Data shape:**

```ts
type EligibilitySummary = {
  academic: "confirmed" | "approximate" | "unknown";
  regions: string[];              // ["CA", "US"]
  demographics: string[];         // ["first-gen", "women in STEM"] or []
  levelOfStudy: string[];         // ["high_school", "undergrad"]
  fieldsOfStudy: string[];        // ["any"] or more specific fields
  minimumGpa?: number;            // 2.5 etc.
  citizenshipRequirements: string[]; // ["canadian_citizen", ...]
  howChecked: string;             // short explanation string
};
```

**UI:**

* Title: `Eligibility`

* Subtext: `How we checked this for you.`

* Rows/tags:

  * `Academic:` `Requirements listed` / `Approx. from description`.
  * `Geographic:` list with tags (e.g. `CA`, `US`).
  * `Citizenship:` tags (e.g. `Canadian citizen`, `US citizen`, `PR`).
  * `Level of study:` tags.
  * `Fields of study:` tags.
  * If GPA is present: `Minimum GPA: 2.50`.

* Small note:

  > “We infer this from the official description and curated sources, not random scraping.”

---

#### 4.2.3 Application components & workload

**Component:** `<ApplicationComponents />`

**Data shape:**

```ts
type ApplicationComponent = {
  id: string;
  type: "essay" | "short_answer" | "transcript" | "rec_letter" | "resume" | "other";
  label: string;          // "Personal statement essay"
};

type ApplicationComponentsBlock = {
  workloadLevel: "Light" | "Medium" | "Heavy";
  summary: string;        // e.g. "1 essay · Transcript"
  components: ApplicationComponent[];
};
```

**UI:**

* Title: `What you’ll likely need`

* Subtext: `Application components & workload.`

* Workload pill: `Medium workload` + summary: `1 essay · Transcript`.

* List bullets:

  * `Personal statement essay`
  * `Official transcript`
  * (others if present).

* Bottom link: `Plan this scholarship →` (scrolls/open to Step 4 – Plan & Tasks on right side).

---

### 4.3 Right Column – Application Workspace (AI)

The right column is a **stepper**, not just multiple unrelated cards.

**Component:** `<ScholarshipWorkspace />`

Pseudo-layout:

```text
┌─────────────────────────────────────────────┐
│ Stepper: 1 Strategy | 2 Draft | 3 Grade | 4 Plan │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ [Active step content]                       │
└─────────────────────────────────────────────┘
```

#### 4.3.1 Step 1 – Strategy & Personality

**Component:** `<StrategyStep />`

**Goal:**
Convert scholarship description + winner patterns into a **human strategy** for this student.

**Input data (conceptual):**

```ts
type StrategyData = {
  keywords: string[];         // recommended phrases / themes
  tone: string;               // "Professional & authentic"
  tips: string[];             // short bullet tips
  coreThemes: string[];       // from personality/winner patterns
  personalitySummary: string; // short para about "what it cares about"
  canRunProfiler: boolean;
};
```

**UI:**

* Header: `1. Strategy & Personality`

* Subtext:

  > `Tailored advice to maximize your chances, based on winner patterns and provider language.`

* Sections:

  1. **Winning Strategy (text)**
     Short paragraph: how to approach, what angle to lean on.
  2. **Keywords to use**
     Chips with recommended themes/phrases.
  3. **Suggested tone**
     E.g. `Professional & authentic` with a one-line explanation.
  4. **Core themes**
     Chips or a small list: `Community impact`, `Leadership`, `Resilience`, etc.
  5. **Run profiler** button (optional):

     * `Run personality profiler` → triggers deeper LLM call, updates themes/keywords.

* Small label: `AI-explained` near header.

---

#### 4.3.2 Step 2 – Draft Essay

**Component:** `<DraftStep />`

**Goal:**
Provide a clean, focused place to **draft the main essay** using AI, with privacy note.

**Data shape (conceptual):**

```ts
type EssayRubricCriterion = {
  id: string;
  name: string;        // "Academics", "Leadership", etc.
  description: string; // short explanation
};

type DraftStepData = {
  rubricCriteria: EssayRubricCriterion[];
  textareaPlaceholder: string;
};
```

**UI:**

* Header: `2. Draft essay`

* Subtext:

  > `Draft with AI and grade against this scholarship’s rubric.`

* Left side:

  * Label: `Your draft`

  * Textarea / editor:

    * Placeholder: `Paste or generate your essay here...`
    * Word count footer.

  * Buttons:

    * Primary: `Draft with AI`
    * Secondary: `Start from my generic essay` (optional link from stored generic essay).

  * Privacy note (small):

    > `AI-safe: we only send scholarship context and your essay text, not your personal contact details.`

* Right side:

  * `Key criteria` list (rubric summary):

    * **Academics** – `Evidence of strong performance and fit.`
    * **Leadership**
    * **Community**
    * **Extracurriculars`
    * etc.

* Optional: a small `Ask Coach` chat toggle below the editor (not full-page tab) to avoid clutter.

---

#### 4.3.3 Step 3 – Grade & Compare

**Component:** `<GradeStep />`

**Goal:**
Let student see **how good their essay is** for this scholarship, and how much better a tailored essay is than a generic one.

**Data shape (conceptual):**

```ts
type EssayGrade = {
  overallScore: number; // 0–100
  perCriterion: { criterionId: string; score: number; feedback: string }[];
};

type GradeStepData = {
  currentDraft: string | null;
  genericEssay: string | null;
  tailoredEssay: string | null;
};
```

**UI:**

Sections:

1. **Grade current draft**

   * Button: `Grade with rubric`
   * Show AI result:

     * Overall readiness (`72%`).
     * Per-criterion scores (bars) + short feedback.

2. **Compare generic vs tailored**

   * Two editors/boxes:

     * `Generic essay (control)` – paste or reference saved generic essay.
     * `Tailored essay (from workspace)` – auto-populated from Step 2.

   * Button: `Grade both essays`

   * Show difference:

     * `Tailored essay is +18 points higher overall.`
     * Highlight where tailored beats generic by criterion.

3. **Targeted revision (RubricCoach)**

   * Select dropdown: `Criterion` (Academics, Leadership, etc.).
   * `Your current essay snippet` textarea.
   * Button: `Improve this section`
   * Result: side-by-side:

     * `Original snippet`
     * `AI suggestion`
     * Buttons: `Accept` / `Discard` (applies locally to editor in Step 2).

Labels:

* `AI readiness` on grade result.
* `RubricCoach` near targeted revision.

---

#### 4.3.4 Step 4 – Plan & Tasks (per-scholarship)

**Component:** `<PlanStep />`

**Goal:**
Bridge between **this scholarship** and the **global planner/dashboard**, with a clear mini-pipeline.

**Data shape (conceptual):**

```ts
type PerScholarshipTask = {
  id: string;
  label: string;            // "Draft essay", "Order transcript"
  status: "todo" | "doing" | "done";
};

type PlanStepData = {
  tasks: PerScholarshipTask[];
  dashboardHref: string;    // link to dashboard filtered to this scholarship
};
```

**UI:**

* Header: `4. Plan & track this application`

* Subtext:

  > `Generate a tailored plan and then track progress from your dashboard.`

* **Application pipeline mini-list** (read-only):

  * `Create plan on Dashboard`
  * `Draft essay with AI coach`
  * `Grade against rubric`
  * `Revise weak criteria`
  * `Check low extra work options`

* **Suggested tasks** (dynamic):

  * Title: `Suggested tasks`
  * List tasks with status indicators:

    * `• 1 essay to draft` (todo)
    * `• Order transcript` (todo/done)
    * etc.

* Actions:

  * Primary: `Create / update plan on Dashboard`
    → navigates to dashboard & highlights this scholarship.
  * Secondary: `View in Dashboard` (smaller link).

---

### 4.4 Optional – Ask Coach (integrated, not a full tab)

Rather than a full-page tab (which adds noise), `Ask Coach` can be:

* A **collapsible panel** under Step 2 or Step 3:

  * Title: `Ask Coach`
  * Subtext: `Chat about how to frame your story for this scholarship.`
  * Pre-seeded chips:

    * `What are they really looking for?`
    * `How should I talk about my GPA?`
    * `Does this story fit their values?`

This keeps the **core flow** (Strategy → Draft → Grade → Plan) intact while still showing off the chat.

---

## 5. AI / LLM / RAG Touchpoints (Scholarship Page)

Make sure the following are visible to judges **on this page**:

1. **Embeddings-based match**

   * In header: `Using your saved profile + embeddings to rank this scholarship.`

2. **AI-explained strategy**

   * Strategy step labeled `AI-explained`.
   * Copy: “Based on winner patterns and provider language…”

3. **Personality / core themes**

   * `Run personality profiler` uses LLM + curated winner stories to infer themes.

4. **Essay drafting**

   * `Draft with AI` using scholarship context + rubric.

5. **Rubric-based grading**

   * `Grade with rubric` uses LLM to score essay across criteria.

6. **RubricCoach revision**

   * Targeted revision of one criterion at a time.

7. **Planning glue**

   * `Plan & track this application` interacts with the **Smart Planner / Dashboard**, so judges see system-level integration.

---

## 6. Implementation Notes

* **Avoid duplication:**

  * Only one canonical “Application components & workload” block.
  * One canonical “Plan & tasks” step (no repeated Plan cards elsewhere).

* **Keep anchors in sync:**

  * `Profile Match` chip → scroll to About + Eligibility.
  * `Personality` → scroll to Strategy step.
  * `Draft` → scroll to Draft step.
  * `Grade` → scroll to Grade step.

* **Data loading:**

  * Use a single route loader to fetch:

    * Scholarship metadata (amount, deadline, etc.).
    * Eligibility & components.
    * Personality/strategy data.
    * Rubric and any existing essays for this student.
    * Per-scholarship tasks for Plan step.

* **Styling:**

  * Reuse existing card, badge, button, textarea/editor, tabs/stepper components (shadcn/ui + Tailwind).
  * Right column steps can use an existing `Tabs` or custom stepper component; just visually emphasize order.

---

## 7. Codex Prompt (to implement this spec)

Use this prompt with Codex in your repo:

```text
You are working in the GoGetScholarship web app (TanStack Start + React + TS).
Please refactor the scholarship detail page into a guided, AI-powered workspace
according to the following spec.

1) Find the scholarship detail route and components
   - Look for src/routes/scholarship/$scholarshipId.tsx (or similar) and any
     existing components for the current scholarship page. It currently includes:
       * Back to Matches, scholarship title/provider, amount, deadline,
         "Match score unavailable" and "Using your saved profile + embeddings..."
       * Sections like "About this scholarship", "Strategy", "Eligibility",
         "Application components", "Plan your application", "Essay workspace",
         "Compare essays", "Targeted revision (RubricCoach)", and
         "Application pipeline" / "Suggested tasks".
   - Summarize briefly how the page is currently structured and where each of
     these features lives.

2) Reorganize layout into:
   - A header with:
       * Back to Matches
       * Scholarship title + provider
       * Badges for amount, frequency, deadline, days-left
       * A match score/status pill and the text
         "Using your saved profile + embeddings to rank this scholarship."
       * Nav chips that scroll to sections:
         Profile Match | Personality | Draft | Grade

   - A two-column layout:
       * Left: "Scholarship Snapshot"
       * Right: "Application Workspace"

3) Left column: Scholarship Snapshot
   - Implement the following components (they can be inline or separate files):

     a) <ScholarshipAbout />
        - Shows "About this scholarship" text, an "Explain Fit" button, and
          links to the official page and sources.
        - "Explain Fit" should call the existing AI explanation endpoint (or a
          new route you create) that uses profile + embeddings to explain why
          this scholarship fits the student, and display the result in a
          small panel or dialog.

     b) <EligibilitySummary />
        - Consolidate existing eligibility info ("Academic: requirements listed",
          geographic regions, demographic flags, level of study, fields of study,
          citizenship requirements, min GPA) into a structured block with a
          short "How we checked this" note.

     c) <ApplicationComponents />
        - Show workload pill (Light/Medium/Heavy) and a summary like
          "1 essay · Transcript".
        - List individual components (personal statement essay, transcript, etc).
        - Include a "Plan this scholarship →" link that activates Step 4 in the
          right column (Plan & Tasks) via scrolling or state change.

4) Right column: Application Workspace (Stepper)
   - Create <ScholarshipWorkspace /> with a stepper-like UI:
       Step 1: Strategy & Personality
       Step 2: Draft essay
       Step 3: Grade & compare
       Step 4: Plan & tasks

   - Each step can be its own child component under src/components/scholarship/
     or src/components/scholarship/workspace/, for example:
       StrategyStep.tsx
       DraftStep.tsx
       GradeStep.tsx
       PlanStep.tsx

5) Step 1 – Strategy & Personality
   - Move/merge the existing "Strategy" block and any personality/core theme
     content into <StrategyStep />.
   - Include:
       * A short "Winning Strategy" paragraph.
       * A "Keywords to use" chip list.
       * A "Suggested tone" line (e.g., "Professional & authentic").
       * A "Core themes" list derived from winner patterns/personality.
       * An optional "Run personality profiler" button that calls the backend to
         regenerate/refresh themes and strategy, if such an endpoint exists.
   - Label this step as AI-powered (e.g., "AI-explained" badge/subtext).

6) Step 2 – Draft essay
   - Move the "Essay workspace" into <DraftStep />.
   - Keep:
       * A main textarea/editor for the draft.
       * Buttons: "Draft with AI" and optionally "Start from generic essay".
       * A small privacy note: "We only send scholarship context and your essay
         text, not your contact details."
       * A sidebar or section showing key rubric criteria (Academics, Leadership,
         Community, etc.).
   - Ensure this step uses the scholarship-specific rubric already defined on
     the backend.

7) Step 3 – Grade & compare
   - Move "Grade with rubric", "Compare essays", and "Targeted revision
     (RubricCoach)" into <GradeStep />.
   - Provide:
       * A button to grade the current draft using the rubric, showing an
         overall readiness score and per-criterion feedback.
       * A "Generic vs tailored" comparison area where the student can paste
         a generic essay and use their tailored essay from Step 2, then grade
         both and see where the tailored version wins by criterion.
       * A RubricCoach section where the student selects a criterion, pastes a
         snippet, and receives a suggested revision; allow "Accept" to replace
         the snippet in the main draft and "Discard" to ignore it.

8) Step 4 – Plan & tasks (per-scholarship)
   - Move/consolidate "Plan your application", "Application pipeline", and
     "Suggested tasks" into <PlanStep />.
   - Show:
       * A mini application pipeline (e.g., "Create plan on Dashboard",
         "Draft essay with AI coach", "Grade against rubric", "Revise weak
         criteria", "Check low extra work options").
       * A dynamic "Suggested tasks" list derived from this scholarship’s
         components and deadline (e.g., "1 essay to draft", "Order transcript").
       * A primary CTA: "Create / update plan on Dashboard" that takes the user
         to the Dashboard focused on this scholarship.

9) Optional Ask Coach integration
   - If there is an "Ask Coach" chat feature, integrate it as a collapsible
     panel under the Draft or Grade step rather than a full-page tab. Seed it
     with helpful question chips tied to this scholarship.

10) Anchors & chips
   - Wire the header chips to scroll or activate the correct step/section:
       * "Profile Match" → About + Eligibility.
       * "Personality" → Strategy & Personality step.
       * "Draft" → Draft essay step.
       * "Grade" → Grade & compare step.

11) Constraints and style
   - Keep existing backend logic and APIs; adapt/augment shapes as needed but
     avoid breaking existing endpoints.
   - Use the app’s existing design system (Tailwind + shadcn/ui) and card/table/
     badge/button components.
   - Keep the page responsive; on mobile, stack left/right sections and allow
     horizontal scroll for the stepper if needed.

First, briefly describe the current scholarship detail page layout and which
components map to each of the existing features. Then implement the refactor
above, reusing as much of the current code and styles as possible while
improving grouping and flow.
