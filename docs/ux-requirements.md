````markdown
# GoGetScholarship – UX Requirements

> **File:** `ux-requirements.md`  
> **Scope:** UX & UI behavior for v1 (hackathon-ready) GoGetScholarship web app.  
> **Audience:** PM, design, and engineering (React/TanStack/shadcn/Tailwind).

## 1. UX Overview

GoGetScholarship is an AI scholarship **coach**, not just a search site.

Key jobs:

1. Help students **discover relevant scholarships** without getting overwhelmed.
2. Show **transparent eligibility** (including demographic focus) so they don’t waste time.
3. Turn each scholarship into a **concrete plan** (tasks + dates).
4. Provide a **rubric-aware essay workspace** that:
   - makes criteria clear,
   - helps draft,
   - **self-grades** against a rubric,
   - and supports targeted revision.

Primary flow:

```text
Onboard & Profile
    ↓
See Matches
    ↓
Scholarship Detail + “Why this fits you”
    ↓
Plan Application
    ↓
Draft Essay (rubric-aware)
    ↓
Self-Grade & Improve
    ↓
Dashboard + “Low Extra Work” recs
````

## 2. Design Direction & Principles

### 2.1 Visual direction (baseline)

We’ll start from **Scholar Studio**:

* **Typography**

  * Heading font: editorial serif (e.g. Playfair Display / Fraunces).
  * Body/UI: neutral sans (e.g. Inter / Source Sans 3).
* **Theme**

  * Light-first, calm:

    * Background: soft off-white (`#FDF7EF`–ish).
    * Text: near-black ink (`#181220`).
    * Primary accent: deep blue (`#3155FF`).
    * Secondary accent: warm amber (`#F6A623`) for highlights.
* **Components**

  * Use shadcn primitives: `Card`, `Button`, `Tabs`, `Sheet`, `Dialog`, `Progress`.
  * Soft shadows, `rounded-2xl`, generous padding.

We can add **subtle “pro” cues** (tiny gradients, micro-interactions) on advanced features like rubric grading, but default feel is **calm & trustworthy**.

### 2.2 UX principles

* **Reduce cognitive load:** always show *one obvious next step*.
* **Transparent, not magical:** show eligibility, components, and why AI says something.
* **User in control:** AI never auto-submits; always suggest, show diffs, ask for confirmation.
* **Inclusive:** demographic filters/options are **optional** and clearly explained.
* **Accessible:**

  * Keyboard navigable.
  * Visible focus states.
  * Color choices with sufficient contrast.

---

## 3. Information Architecture & Navigation

### 3.1 Top-level navigation

* **Persistent header** (desktop):

  * Logo / app name (left).
  * Nav items:

    * `Matches`
    * `Dashboard`
  * User menu (right):

    * Profile
    * Sign out
* **Mobile:**

  * Either top nav with hamburger → sheet,
  * Or bottom nav with icons for `Matches`, `Dashboard`, `Profile`.

### 3.2 Page routes (UX perspective)

* `/` → Redirect to:

  * `/onboarding` if first time
  * `/matches` if profile complete
* `/onboarding`
* `/matches`
* `/scholarships/:id`
* `/dashboard`

Essay workspace can be:

* `/scholarships/:id/essay` *or*
* A tab within `/scholarships/:id` (preferred for simplicity).

---

## 4. Screen-by-Screen Requirements

### 4.1 Onboarding & Profile (`/onboarding`)

**User goal:** Tell the system enough to get **relevant, realistic matches**.

#### Layout

* Centered card / multi-step wizard.
* Steps:

  1. **Basics**

     * Country of study
     * Current level (HS, UG, Grad)
     * Intended/Current program/major
     * GPA (+ scale)
  2. **Background (optional)**

     * Demographics (gender, race/ethnicity, first-gen, LGBTQ+, disability, etc.)

       * Each has an “Optional – only used to find targeted scholarships” explainer.
  3. **About you (optional but recommended)**

     * Textarea: “Paste your activities / about me”.
     * Optional file upload (PDF/DOC) with helper text: “Résumé, activity list, etc.”

#### Interactions

* Next/Back buttons; Show progress (Step 1/3, 2/3, 3/3).
* “Skip for now” allowed on optional steps; show a small warning:

  * “You’ll still see matches, but they may be less tailored.”
* On final submit:

  * Call `POST /api/profile`.
  * Show inline progress indicator (“Saving profile…”).
  * On success → redirect to `/matches`.

#### States

* **Loading:** disabling buttons during submit.
* **Error:** show toast or inline error if profile save fails.
* **Validation:**

  * Required fields: country, level, maybe GPA (can allow “Prefer not to say”).
  * GPA numeric, scale numeric.

---

### 4.2 Matches List (`/matches`)

**User goal:** Quickly see **good-fit scholarships** that aren’t obviously impossible.

#### Layout

* **Header section:**

  * Title: “Your scholarship matches”.
  * Small subtext: “Based on your profile and interests.”
* **Filter bar (top or left sidebar):**

  * Country / region
  * Level of study
  * Fields of study (multiselect)
  * Workload slider or chips: `Light`, `Medium`, `Heavy`
  * Toggles:

    * “Show scholarships with priority for my demographics”
    * “Hide scholarships I’m clearly ineligible for”
* **Results list:**

  * Grid or list of `Card`s.

Each **scholarship card** shows:

* **Top:**

  * Name
  * Provider name
* **Body:**

  * Amount (range) + currency.
  * Deadline (date, with “X days left”).
  * Level / field pills.
  * **Demographic chips** if any:

    * `Women in STEM`
    * `Indigenous students`, etc.
  * **Workload chip**:

    * e.g. `1 essay · 2 refs · transcript`.
* **Bottom:**

  * Primary CTA: `View details`
  * Secondary: `Plan` (if an application exists) / `Track`.

#### Interactions

* Filters update results via `GET /api/matches`.
* Clicking card or “View details” → `/scholarships/:id`.
* “Track” sets up an `application` record and may show as “In progress”.

#### States

* **Empty state:** “We couldn’t find any matches for your filters. Try relaxing GPA or workload filters.”
* **Skeletons:** Show card skeletons while loading.
* **Errors:** Toast + option to retry.

---

### 4.3 Scholarship Detail (`/scholarships/:id`)

**User goal:** Decide if this scholarship is worth serious effort.

#### Layout

Two-column layout (desktop), stacked on mobile.

**Left / main content:**

* Title + provider
* Amount & count
* Deadline + frequency
* **Section: About this scholarship**

  * Short description.
* **Section: Eligibility**

  * Country/region
  * Level, major/field
  * GPA requirement
  * Financial need (if applicable)
  * **Demographic focus**:

    * If there are hard requirements:

      * “Only open to: [e.g., self-identified women]”
    * If there are preferences:

      * “Priority for: [e.g., Indigenous students, first-gen students]”
* A small note:

  * “Check the official page for full details.”

**Right / sidebar:**

* **“What they care about”**

  * Top themes: chips (“Leadership”, “Community impact”, etc.).
  * If rubric available, show criteria list with weights.
* **“Application components”**

  * Checklist:

    * Essay(s) + word limits.
    * Refs (count).
    * Transcript.
    * Interview.
    * Other media.
* **Actions**

  * Button: `Why this fits you`
  * Button: `Plan this scholarship`
  * Button: `Start essay`

#### Interactions

* “Why this fits you”:

  * Opens a `Dialog` or inline panel with bullets returned from `/api/scholarships/:id/explain-fit`.
* “Plan this scholarship”:

  * POST `/api/scholarships/:id/plan` → then navigate to planner view (same page tab or modal).
* “Start essay”:

  * Create `application` & `essay` if needed → navigate to essay workspace.

#### States

* Loading: skeleton for each section.
* Error: inline message + “Back to matches”.

---

### 4.4 Application Planner (tab/modal under `/scholarships/:id`)

**User goal:** Turn vague requirements into a **clear to-do list**.

#### Layout

* Title: “Application plan”.
* Subtitle: “We turned the requirements into tasks; adjust them as needed.”
* **Tasks list** (ordered):

  * For each task:

    * Checkbox
    * Label (“Draft main leadership essay (500 words)”)
    * Due date chip (“Due Nov 20”)
* Possibly a mini timeline or calendar stripe for visual clarity.

#### Interactions

* On open:

  * If plan doesn’t exist → POST `/api/scholarships/:id/plan`, then fetch.
* User can:

  * Mark tasks complete (update via PATCH).
  * Edit due date (small date picker).
* Tasks updates should be optimistic: check/uncheck immediately.

---

### 4.5 Essay Workspace (Rubric-Aware) (`/scholarships/:id/essay` or detail tab)

**User goal:** Write a strong essay aligned with what the scholarship actually wants.

#### Layout

**Top bar:**

* Scholarship name.
* Prompt title and word limit.
* Word count indicator on the right.

**Main split view:**

* **Left panel: Editor**

  * Prompt displayed at top.
  * Textarea / editor for essay content.
  * Buttons:

    * “Generate outline”
    * “Draft from bullets”
    * “Rewrite for clarity”
  * Save status indicator:

    * “Saved · 2 min ago” or “Saving…”

* **Right panel: Guidance**

  * **Rubric tab:**

    * List of criteria:

      * “Community impact (40%)”
      * “Leadership (30%)”
      * “Character (30%)”
  * **Themes tab:**

    * Chips for “Academics”, “Leadership”, “Research”, etc.
    * Small text: “Based on the scholarship’s description.”

#### Interactions

* “Generate outline”:

  * Opens a small modal with:

    * Option: generate from scratch or from bullet points.
    * On confirm, call `/api/scholarships/:id/essays` with mode `outline`.
    * Output can:

      * overwrite current content, **or**
      * insert into a separate “Outline” section (simpler: insert at cursor).

* “Draft from bullets”:

  * Show a textarea for bullets → send to backend.
  * Replace or append to editor with AI output.

* Autosave:

  * Debounced autosave (e.g. 2–3 seconds after typing) via PATCH.

---

### 4.6 Rubric Self-Grading & Revision (inside Essay Workspace)

**User goal:** See **how strong the essay is** vs criteria and improve weak parts.

#### Layout

Within the right panel or as a bottom drawer:

* Button: `Grade against rubric`.
* **After grading**, show:

  * **Per-criterion row:**

    * Name (“Community impact”)
    * Score (e.g. `3/5` with colored pill)
    * Short feedback (one line).
    * Button: `Improve this`.
  * Overall comment box with a few sentences from Claude.
  * Readiness indicator:

    * e.g. “Overall: Solid (could still be refined)”.

#### Interactions

* `Grade against rubric`:

  * Hit `/api/scholarships/:id/essays/:essayId/grade`.
  * Show spinner while waiting.
  * On success, fill rubric table.

* `Improve this` (per criterion):

  * Clicking opens a right-side `Sheet` or modal:

    * Top: criterion name + description.
    * Middle: side-by-side or diff view:

      * Left: original text.
      * Right: improved version from `/improve`.
    * Bottom: `Accept revision` / `Keep original`.
  * On accept:

    * Replace content in editor with revised text.
    * Optionally trigger a “quick re-grade” for that criterion.

#### States

* Before grading: show placeholder text (“Run a rubric check to see where you stand”).
* If rubric not available: disable or hide the grading feature and show explanation (“Rubric not configured for this scholarship yet.”).

---

### 4.7 Dashboard (`/dashboard`)

**User goal:** See overall progress & find next best action with **minimal thinking**.

#### Layout

* **Top summary:**

  * “You’re tracking 5 scholarships”
  * Chips:

    * `Ready (1)`
    * `In progress (2)`
    * `Not started (2)`
* **Main table/list:**

  * Columns:

    * Scholarship name
    * Deadline
    * Status (pill)
    * Readiness meter (progress bar or 3-level badge)
    * “Open” button (goes to detail or essay)
* **Side panel / bottom section: “Low extra work”**

  * Cards like:

    * “[Scholarship X]: Similar essay prompt, same or lower workload. Based on your essay for Scholarship Y.”

#### Interactions

* Dashboard data: `GET /api/dashboard`.
* Clicking a row opens the relevant primary action:

  * If no essay: go to detail page.
  * If essay exists: go to essay workspace for that scholarship.
* “Low extra work” cards:

  * Clicking takes user directly to detail page with context.

---

## 5. Cross-Cutting UX Requirements

### 5.1 Loading & Skeletons

* Use shadcn/Tailwind skeleton components for:

  * Matches list cards.
  * Scholarship detail sections.
  * Essay workspace: show placeholder blocks while fetching existing draft.

### 5.2 Errors & Toasters

* Global `Toast` system:

  * Success messages (green, short).
  * Errors (red) with optional “Retry” action.
* Example errors:

  * “Couldn’t load matches. Please try again.”
  * “We had trouble talking to the AI. Your draft is safe — please retry.”

### 5.3 Saving & Undo

* Essay editor:

  * Save icon + timestamp.
  * Silent autosave with visible indicator (“Saving…” → “Saved”).
  * Optional: simple undo via browser/editor; no complex version browser for v1.

### 5.4 Accessibility

* Keyboard navigable:

  * Tab order: filters → results → actions.
* ARIA:

  * Proper labels on dialog, modals, and diff views.
* Contrast:

  * Ensure text vs background meets WCAG AA.

### 5.5 Mobile Responsiveness

* Breakpoints:

  * `sm`: 1-column layouts.
  * `md+`: 2-column layouts (detail + sidebar).
* Essay workspace:

  * On mobile, toggle between “Editor” and “Rubric” tabs instead of side-by-side.

---

## 6. Core vs Stretch UX

### Core (must-have for hackathon demo)

* Onboarding that collects basic profile & optional “about me”.
* Matches list with filters, workload chips, demographic badges.
* Scholarship detail with:

  * clear eligibility,
  * application components,
  * “Why this fits you” dialog.
* Basic planner: visible tasks with checkboxes.
* Essay workspace:

  * prompt, editor, simple AI assist.
* Rubric check:

  * at least single-run grading & feedback display.
* Dashboard with statuses & one or two “low extra work” cards.

### Stretch (nice-to-have)

* Resume upload with live preview of extracted content.
* More nuanced filters (e.g., “time to complete” slider).
* Multi-iteration grading loop visualizations.
* Saved templates / snippets for essays.
* Commenting or inline suggestions in the editor.

---

## 7. Implementation Notes for Devs

* Use **shadcn** primitives wherever possible for consistency:

  * `Card`, `Button`, `Badge`, `Tabs`, `Dialog`, `Sheet`, `Progress`, `Skeleton`, `Toast`.
* Layout patterns:

  * `max-w-6xl` center-aligned for main content.
  * Use consistent vertical rhythm (`space-y-4/6/8`).
* All screens should gracefully handle:

  * “No data yet” (user hasn’t started anything),
  * “Partial data” (some scholarships don’t have rubric configured).

---

