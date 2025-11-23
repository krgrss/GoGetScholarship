````md
# GoGetScholarship – Custom Scholarship Lab (`custom.md`)

_Last updated: 2025-11-22_

## 1. Purpose & Vision

The **Custom Scholarship Lab** is our internal / power-user playground.

Primary jobs:

1. Let us **bring any scholarship text** (PDF, webpage, pasted blob) and run it
   through the same **personality + rubric + drafting + grading** pipeline we
   use in production.
2. Provide fast **A/B testing** and **story reframing** tools for essays using a
   configurable rubric.
3. Act as a **demo surface** for judges (“here’s our AI pipeline in one page”)
   without cluttering the main student UX.

This page is *not* for everyday students; it’s an advanced studio for:

- founders,
- scholarship admins,
- power users,
- hackathon demo.

---

## 2. Route & Access

### 2.1 Route

- Route: `src/routes/custom.tsx` (or `src/routes/custom/index.tsx`).

### 2.2 Admin key (required for heavy AI)

Most actions on this page hit high-cost endpoints:

- `/api/personality`
- `/api/draft`
- `/api/grade-essay`
- `/api/revise`

We gate them behind an **Admin key** stored client-side.

**Data:**

```ts
type AdminKeyState = {
  key: string | null;
  isValid: boolean;
  lastCheckedAt: string | null;
};
````

**Behavior:**

* Key entry stored in `localStorage` or secure cookie.
* On first use of any AI action, validate key via
  `POST /api/custom/validate-key`.
* If invalid, show error + disable lab actions.
* Visual state indicator in header (e.g. `● Admin key OK` / `● Missing key`).

---

## 3. High-Level Layout

Desktop layout:

```text
┌───────────────────────────────────────────────────────────────┐
│ GoGetScholarship STUDIO   Matches | Dashboard | Custom | ...  │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ [Custom Scholarship Lab]  – short description                 │
│ [Admin Key panel]                                            │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ Bring your own scholarship  |  Rubric Editor                 │
│ (input text + generation)   |  (edit criteria & weights)     │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ Compare essays (grade A/B side by side with rubric)           │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ Story Reframer (two angles from core stories + rubric score) │
└───────────────────────────────────────────────────────────────┘
```

Each block is a `Card` with a clear title, description, and “Run AI” button.

---

## 4. Components & Sections

### 4.1 Header & Lab Intro

**Component:** `<CustomHeader />`

Shows:

* Title: `Custom Scholarship Lab`

* Subtitle:

  > `Bring your own scholarship, generate personality + rubric, draft essays,
  > and compare different versions side by side.`

* Chips:

  * `Uses production AI pipeline`
  * `Admin key required for AI calls`

---

### 4.2 Admin Key Panel

**Component:** `<AdminKeyPanel />`

**UI:**

* Label: `Admin key`

* Input (password type): `••••••••`

* Small copy:

  > `Required for /api/personality, /api/draft, /api/grade-essay, /api/revise.`

* Buttons:

  * `Save key` – validates and persists.
  * `Clear` – removes from storage.

* Status indicator:

  * `● Key valid (last checked 2 min ago)` or
  * `● Key missing/invalid · AI actions disabled`.

All other cards show a dimmed overlay / disabled buttons if `isValid === false`.

---

### 4.3 Bring Your Own Scholarship

**Component:** `<CustomScholarshipInput />`

**Goal:** Convert arbitrary scholarship text into **personality + rubric + draft**.

#### 4.3.1 Left side – Input

Fields:

* `Scholarship name (optional)`
* `Scholarship text` (multiline, large textarea)

  * Placeholder: `Paste description or URL text here…`

Buttons:

* `Generate personality + rubric` (primary)
* `Draft essay` (secondary, disabled until personality + rubric exist)
* `Save as test scholarship` (optional; writes to DB for reuse).

#### 4.3.2 Right side – Results

Two stacked cards:

1. **Personality Preview**

   * Title: `Scholarship personality`

   * Shows e.g.:

     * `What it cares about` – bullets.
     * `Tone` – e.g. `Formal but student-friendly`.
     * `Ideal candidate snapshot` – short paragraph.

   * Button: `Copy to clipboard`.

2. **Rubric Preview (read-only + link to editor)**

   * Title: `Rubric (generated)`

   * Shows 3–6 criteria:

     * `Academics`
     * `Leadership`
     * `Impact`
     * `Reflection`
     * etc.

   * Each with a weight & description.

   * Buttons:

     * `Use in rubric editor` – pushes the generated rubric into the **Rubric Editor** below.

---

### 4.4 Rubric Editor (editable)

**Component:** `<CustomRubricEditor />`

**Goal:** Let us **edit the rubric** used by Drafting, Compare, and Story Reframer.

#### 4.4.1 Data model

```ts
type RubricCriterion = {
  id: string;
  name: string;           // "Addresses what the sponsor cares about"
  description: string;
  weight: number;         // 0–5 or 0–100
};

type CustomRubric = {
  id: string;
  label: string;          // "Burger King CA test rubric"
  criteria: RubricCriterion[];
};
```

#### 4.4.2 UI

Card content:

* Title: `Rubric (editable)`

* Intro:

  > `Tweak the rubric used for drafting and grading across this page.`

* Table or list of criteria:

  * Name (editable input).
  * Description (textarea).
  * Weight slider or numeric input.

* Buttons:

  * `Add criterion`
  * `Reset to generated`
  * `Save rubric` (persists in local storage / DB)
  * Optional: `Export as JSON`

This rubric becomes the **single source of truth** for:

* Draft powering (tone/structure prompts).
* Compare Essays grading.
* Story Reframer grading.

---

### 4.5 Compare Essays (A/B grading)

**Component:** `<CompareEssaysLab />`

**Goal:** Paste two essays, grade both with the current rubric, and get side-by-side readiness.

#### 4.5.1 Inputs

Two text areas:

* `Essay A` (left)
* `Essay B` (right)

Hints:

* Placeholder text explains typical use:

  > `Paste two drafts (e.g. old vs new, or generic vs tailored) to compare
  > readiness using the rubric above.`

#### 4.5.2 Actions

* Button: `Grade & compare`

  * Disabled if Admin key invalid or rubric empty.

#### 4.5.3 Outputs

After scoring:

* **Top bar:** Overall results:

  * `Essay A: 68 / 100`
  * `Essay B: 81 / 100`
  * `Winner: Essay B (+13)`

* **Per-criterion table:**

  | Criterion            | Essay A | Essay B | Comment                                  |
  | -------------------- | ------: | ------: | ---------------------------------------- |
  | Addresses sponsor    |  60/100 |  85/100 | B highlights sponsor’s values explicitly |
  | Clear & organized    |  70/100 |  78/100 | Both okay; B has clearer paragraphs      |
  | Specific impact      |  55/100 |  80/100 | B quantifies impact                      |
  | Personal & authentic |  85/100 |  82/100 | A slightly more reflective               |

* Buttons:

  * `Use Essay B as base` → pushes Essay B into a new Essay workspace / generic essay record.
  * `View advanced analysis` → optional; opens Essay workspace page with preloaded text.

**Backend endpoint:**

`POST /api/custom/compare-essays`

```ts
type CompareEssaysRequest = {
  adminKey: string;
  rubric: CustomRubric;
  essayA: string;
  essayB: string;
};
```

---

### 4.6 Story Reframer (two angles)

**Component:** `<StoryReframerLab />`

**Goal:** Enter 1–2 core stories, generate two different angles, and grade them with the rubric.

#### 4.6.1 Inputs

Fields:

* `Stories (1–2)` (textarea with guidance):

  > `Briefly describe 1–2 key stories (projects, challenges, roles).`

* `Angle A`:

  > `e.g. "Leadership & community impact"`

* `Angle B`:

  > `e.g. "Resilience & growth after failure"`

* Optional dropdown: `Target scholarship tone` (Formal / Warm / Technical / etc.)

#### 4.6.2 Action

* Primary button: `Generate & grade`

#### 4.6.3 Outputs

* Two result cards:

  1. **Angle A Draft**

     * Essay preview (expandable).
     * Rubric scores per criterion.
     * Overall readiness.

  2. **Angle B Draft**

     * Same details.

* Summary row at top:

  * `Angle A: 74 / 100`
  * `Angle B: 88 / 100 (recommended)`

* Actions:

  * `Open Angle A in Essay workspace`
  * `Open Angle B in Essay workspace`

**Backend endpoint:**

`POST /api/custom/story-reframer`

```ts
type StoryReframerRequest = {
  adminKey: string;
  rubric: CustomRubric;
  stories: string;
  angleA: string;
  angleB: string;
};
```

---

## 5. AI / LLM / RAG Flows

### 5.1 Personality + Rubric generation

`POST /api/personality`

**Input:**

```ts
{
  adminKey: string;
  scholarshipText: string;
}
```

**Output:**

* personality summary
* raw rubric structure

Rubric is converted into `CustomRubric` and pushed into Rubric Editor.

### 5.2 Drafting

`POST /api/draft`

**Input:**

```ts
{
  adminKey: string;
  scholarshipText?: string;
  prompt: string;          // actual essay prompt if available
  rubric: CustomRubric;
  stories?: string;        // optional student stories
}
```

**Output:**

* essay text
* notes on how it uses rubric criteria

Used by:

* `Draft essay` button in BYO Scholarship.
* Story Reframer.

### 5.3 Grading

`POST /api/grade-essay`

**Input:**

```ts
{
  adminKey: string;
  rubric: CustomRubric;
  essay: string;
}
```

**Output:**

* `EssayScore` structure.

Used by:

* Compare Essays.
* Story Reframer.
* (shared with main Essay workspace).

### 5.4 Revising

`POST /api/revise`

**Input:**

```ts
{
  adminKey: string;
  rubric: CustomRubric;
  essay: string;
  targetCriterionId?: string;
  mode?: "improve" | "shorten" | "make_more_personal";
}
```

**Output:**

* revised essay text
* explanation.

For this lab, revising is optional; core flows are personality, rubric, grading, reframing.

---

## 6. UX & Copy Notes

* This page is clearly labeled as a **Lab**:

  * Emphasize “advanced / experimental”.
  * Avoid overwhelming regular students; hide it behind nav or user role if needed.

* Copy tone:

  * Straightforward and technical, geared toward advanced users.
  * E.g., “Run our full AI pipeline on a new scholarship you paste here.”

* All powerful actions guarded by:

  * Disabled state when Admin key invalid.
  * Helpful error messages (“Admin key required. Add it at the top of this page.”).

---

## 7. Implementation Notes

* Use existing design system: Tailwind + shadcn/ui.
* Compose the page from small, independent cards so we can easily hide/show features.
* Where possible, reuse:

  * Rubric types from main system.
  * Grading logic from Essay workspace / Dashboard.
  * Existing AI routes (wrap them rather than duplicating).

---

## 8. Codex Prompt (to implement `custom.md`)

Use this prompt in the repo:

```text
You are working in the GoGetScholarship web app (TanStack Start + React + TS).
Please refactor and flesh out the "Custom" page into a full "Custom Scholarship
Lab" according to CUSTOM.md.

1) Find the current Custom page
   - Locate the route and components for the existing Custom page. You should
     see "Custom Scholarship Lab", an Admin key field, a "Bring your own
     scholarship" section, a rubric note, "Compare essays", and "Story
     Reframer" text.
   - Briefly summarize how the current page is structured and which buttons
     actually call APIs (if any) in comments.

2) Implement the Admin Key panel
   - Create <AdminKeyPanel /> that:
       * Lets the user enter an admin key.
       * Stores it in localStorage.
       * Shows whether the key is valid using a small indicator.
       * Blocks AI buttons on this page when the key is missing/invalid.
   - Add a simple /api/custom/validate-key endpoint or reuse existing logic.

3) Bring Your Own Scholarship
   - Implement <CustomScholarshipInput /> with fields:
       * "Scholarship name (optional)"
       * "Scholarship text" (large textarea).
     And buttons:
       * "Generate personality + rubric" (primary).
       * "Draft essay" (secondary, enabled once personality/rubric exist).
   - When "Generate personality + rubric" is clicked:
       * Call POST /api/personality (or the existing personality endpoint) with
         adminKey + scholarshipText.
       * Display personality summary and generated rubric on the right side.
       * Provide a button "Use in rubric editor" which loads this rubric into
         the Rubric Editor component.

4) Rubric Editor
   - Implement <CustomRubricEditor /> that:
       * Shows the current rubric used by this lab (criteria name, description,
         weight).
       * Allows adding/removing/editing criteria.
       * Has buttons: "Save rubric", "Reset to generated".
   - Ensure this rubric object is passed down to:
       * Compare Essays,
       * Story Reframer,
       * Draft actions when needed.

5) Compare Essays (A/B)
   - Implement <CompareEssaysLab /> with two textareas labeled "Essay A" and
     "Essay B" and a "Grade & compare" button.
   - On click and with a valid admin key:
       * Call POST /api/custom/compare-essays (or reuse /api/grade-essay
         twice) with the current rubric and both essays.
       * Display:
           - Overall scores for A and B.
           - A per-criterion comparison table (A vs B) with a short comment.
       * Highlight which essay is stronger overall.
   - Provide a button "Use Essay B as base" or similar that can open the
     Essay workspace for that draft (stubbed is fine for now).

6) Story Reframer
   - Implement <StoryReframerLab /> with fields:
       * "Stories (1–2)" textarea,
       * "Angle A" input,
       * "Angle B" input.
       * Button "Generate & grade".
   - On click:
       * Call POST /api/custom/story-reframer (or equivalent pipeline that
         drafts two essays and grades them with the current rubric).
       * Show both drafts, their rubric scores, and highlight which angle
         performs better.
       * Provide buttons to open either result in the Essay workspace route.

7) Wiring and state
   - Keep the lab page composed of independent cards laid out in a simple grid,
     with Admin Key and BYO Scholarship + Rubric on the top row and Compare/
     Reframer below.
   - Use TanStack Query or similar to manage API calls and loading/error
     states. Show success toast or inline messages for each AI action.
   - Ensure all AI calls are gated behind a valid admin key, with helpful
     error states when missing.

8) Styling & responsiveness
   - Use the existing Tailwind + shadcn Card, Input, Textarea, Button,
     Tabs components.
   - On smaller screens, stack the cards vertically with sensible spacing.

Start by documenting the current Custom page structure, then implement the
Admin key gating, Bring-Your-Own-Scholarship flow, Rubric editor, Compare
Essays, and Story Reframer per the spec.
