# GoGetScholarship – Essay Workspace Page Spec

_Last updated: 2025-11-22_

## 1. Purpose & Vision

The **Essay Workspace** is where the student actually *writes*.

Primary job:

> Turn a blank prompt into a **strong, scholarship-ready essay** with
> **rich editing**, **rubric-aware AI coaching**, and tight integration
> with the **Dashboard, Planner, and Winner Stories**.

This page should feel like:

- Google Docs + Notion **editor**
- + Grammarly-level **language help**
- + Scholarship-specific **rubric & winner-pattern coach**

Not just “big boring textarea + Analyze button”.

---

## 2. Route & Resource Model

### 2.1 Route

A dedicated essay workspace route:

- `src/routes/essay/$essayId.tsx`

Optional query parameters:

- `?scholarshipId=...` (for context)
- `?from=dashboard|scholarship|matches` (for back navigation).

### 2.2 Core Entities

```ts
type Essay = {
  id: string;
  studentId: string;
  scholarshipId: string | null;   // null for generic/personal statement
  title: string;                  // "Loran main essay", "Generic leadership essay"
  prompt: string;
  maxWords: number | null;        // e.g. 650
  contentHtml: string;            // TipTap/HTML representation
  contentPlain: string;           // for word count & AI
  status: "draft" | "revising" | "ready" | "submitted";
  rubricId: string | null;
  lastScoredAt: string | null;
};

type EssayScore = {
  essayId: string;
  overallScore: number;           // 0–100
  overallLabel: "A" | "B" | "C" | "D";
  perCriterion: {
    criterionId: string;
    score: number;                // 0–100
    label: string;                // "Needs work" / "Strong"
    feedback: string;             // short paragraph
  }[];
};

type EssayVersion = {
  id: string;
  essayId: string;
  label: string;                  // "Auto-save", "Before AI rewrite", ...
  createdAt: string;
  contentHtml: string;
};

type EssayIdea = {
  id: string;
  type: "hook" | "challenge" | "impact" | "reflection";
  text: string;
  createdAt: string;
};
````

---

## 3. Layout Overview

### 3.1 High-level layout (desktop)

```text
┌───────────────────────────────────────────────────────────────┐
│ Back to [Scholarship/Dashboard]   [Essay title]   [Status]   │
│ Prompt summary · Word count · Last scored / Auto-saved       │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ LEFT: Prompt + Rich Editor        | RIGHT: AI Assistant      │
│  - Prompt card                    |  - Tabs: Rubric | Ideas  │
│  - Editor toolbar + document      |          | History | Coach│
│  - Status bar (word count, etc.)  |  - per-tab content       │
└───────────────────────────────────────────────────────────────┘
```

On mobile:

* Staple the prompt card above the editor.
* Sidebar collapses into a bottom sheet or a toggleable right pane.

---

## 4. Page Header

**Component:** `<EssayHeader />`

Shows:

* Breadcrumb / back:

  * `← Back to scholarship` (if `scholarshipId` present)
  * else `← Back to Dashboard`

* Essay title (editable inline):

  * `Personal statement for Loran Scholars Foundation`

* Status chip:

  * `Draft`, `Revising`, `Ready`, `Submitted`.

* Meta row:

  * `Prompt: “Describe a time... ”` (truncated with “View full prompt” link).
  * `Word count: 372 / 650`
  * `Last auto-save: 2 min ago`
  * If scored: `AI readiness: 78 / 100 (last scored 10 min ago)`

Actions (top-right buttons):

* `Save` (if you keep explicit saves).
* `Analyze with AI` (triggers scoring + Rubric tab update).
* `Export` (copy to clipboard / download .docx – optional).

---

## 5. Left Column – Prompt Card + Rich Editor

### 5.1 Prompt Card

**Component:** `<PromptCard />`

Contents:

* Title: `Prompt`
* Body: full scholarship prompt text.
* Optional: bullet list of sub-questions if we parse prompt.
* Buttons:

  * `Highlight key verbs` → AI underlines words like “describe”, “explain”, “reflect”.
  * `Explain this prompt` → short AI explanation in plain English.

### 5.2 Rich Text Editor

**Component:** `<EssayEditor />` using TipTap (or Lexical)

#### 5.2.1 Features

* **Formatting:**

  * Bold, italic, underline.
  * Bullets, numbered lists.
  * Headings (H2/H3).
  * Blockquote.
  * Callout block (for “Key story” or “Reflection”).
* **Structure:**

  * Horizontal separators (for paragraph grouping).
* **Keyboard:**

  * Cmd/Ctrl+Z/Y (undo/redo).
* **Word count:**

  * Live count, including max limit indicator.

#### 5.2.2 Toolbar Layout

Top of editor card:

* Left:

  * `B`, `I`, `U`
  * `•` list, `1.` list
  * `“ ”` quote
  * `H2`, `H3`

* Center:

  * `Draft 1 · Auto-saved`

* Right:

  * `✨ Improve clarity` (full essay)
  * `✨ Suggest next sentence`
  * `✨ Re-organize structure`

Each “✨” opens a small dialog with:

* Explanation of what will happen.
* Option to accept suggestion partially.

#### 5.2.3 Inline AI (selection-based)

Use TipTap BubbleMenu:

* When selection length ≥ N chars:

  * Bubble menu actions:

    * `Rewrite clearer`
    * `More personal`
    * `More concise`
    * `Fix grammar only`

* On click:

  * Call AI transform endpoint with `selection` + `mode`.
  * Display mini diff:

    * Left: original.
    * Right: suggested.
    * Buttons: `Replace` / `Cancel`.

#### 5.2.4 Status bar

Bottom of editor card:

* Left:

  * `372 / 650 words` (red when > limit).
* Center:

  * `Reading level: ~Grade 9` (optional).
* Right:

  * `AI readiness: 78%` (only if scored).

---

## 6. Right Column – AI Assistant Sidebar

**Component:** `<EssayAssistantSidebar />`

Tabs:

1. `Rubric`
2. `Ideas`
3. `History`
4. `Coach`

### 6.1 Tab: Rubric

**Goal:** score and coach the essay *against the scholarship’s rubric*.

#### 6.1.1 Header

* Overall badge: `Overall readiness: 78 / 100 (B+)`.
* Tiny note: `Estimated by AI using this scholarship’s rubric and winner patterns.`

#### 6.1.2 Per-criterion cards

For each rubric criterion:

```ts
type RubricCriterionUI = {
  id: string;
  name: string;       // "Fit to prompt"
  description: string;
  score: number;      // 0–100
  label: string;      // "Strong" / "Needs work"
  strengths: string[]; // 1–2 bullets
  improvements: string[]; // 2–3 bullets
};
```

Card layout:

* Title: `Fit to prompt` + chip `3 / 5` or `60/100`.
* `Strengths` bullets.
* `To improve` bullets.

Buttons:

* `✨ Improve this area`

  * AI suggests edits to the relevant paragraphs.
  * Highlight the targeted paragraphs in editor.
* `Focus in editor`

  * Scrolls editor to the paragraph(s) associated with this criterion.

Optional: integrate winner-story comparison if available:

* Line: `Compared to past winners: weaker on Reflection, strong on Impact.`

### 6.2 Tab: Ideas

**Goal:** help when student is stuck.

Sections:

1. **Story prompts**

   * `Talk about a time you...`
   * `Think of a moment when...`

2. **Hook suggestions**

   * 3–5 short hook lines tailored to their profile + scholarship theme.
   * Buttons: `Insert as first sentence` / `Copy`.

3. **Gap detection**

   AI checks essay vs rubric & prompt and proposes high-level suggestions, e.g.:

   * `You mention your project, but not the outcome – add 1–2 sentences on what changed.`
   * `You haven’t reflected on what you learned; add a short reflection paragraph.`

### 6.3 Tab: History

**Goal:** allow safe experimentation with AI without fear of “ruining” the draft.

Shows a list of saved versions:

```ts
type HistoryItem = {
  id: string;
  label: string;         // "Auto-save", "Before AI rewrite", ...
  createdAt: string;
};
```

UI:

* List items with timestamp and label.
* Clicking opens a side-by-side diff view:

  * Left: current version.
  * Right: selected version.
  * Actions: `Restore this version`, `Copy to clipboard`.

Auto-version rules:

* On manual `Analyze with AI`.
* On major AI transform (e.g., structure rewrite).
* Every N minutes if content changed (“Auto-save”).

### 6.4 Tab: Coach (Chat)

**Goal:** conversational help, but tightly scoped to essay.

Chat box with:

* System text: `Ask how to improve this essay for [Scholarship Name].`
* Pre-filled chips:

  * `Is my story actually answering the prompt?`
  * `How can I show more impact?`
  * `Help me strengthen the conclusion.`
  * `Highlight parts that sound generic.`

Constraints:

* Coach always:

  * Reads current essay, prompt, rubric summary (but *never* raw winner essays).
  * Uses winner pattern summaries where available.
  * Responds with suggestions, not full essays.

---

## 7. AI Flows & Endpoints

### 7.1 Analyze with AI (rubric scoring)

**Endpoint:** `POST /api/essay/analyze`

**Request:**

```ts
type AnalyzeRequest = {
  essayId: string;
  scholarshipId: string | null;
  rubricId: string | null;
  contentPlain: string;
};
```

**Response:**

```ts
type AnalyzeResponse = {
  overallScore: number;
  overallLabel: string;
  perCriterion: {
    criterionId: string;
    score: number;
    label: string;
    strengths: string[];
    improvements: string[];
  }[];
};
```

Used by:

* `Analyze with AI` button in header.
* Updates Rubric tab + status bar.

### 7.2 AI transforms (inline + toolbar)

**Endpoint:** `POST /api/essay/transform`

**Request:**

```ts
type TransformMode =
  | "rewrite_clearer"
  | "more_personal"
  | "more_concise"
  | "grammar_only"
  | "suggest_next_sentence"
  | "reorganize_structure";

type TransformRequest = {
  essayId: string;
  mode: TransformMode;
  contentPlain: string;
  selection?: {
    start: number;
    end: number;
    text: string;
  }; // optional for full-essay transforms
};
```

**Response:**

```ts
type TransformResponse = {
  replacementText?: string;   // for selection
  fullContentHtml?: string;   // for structure rewrites
  explanation?: string;       // "What changed & why"
};
```

### 7.3 Ideas & hooks

**Endpoint:** `POST /api/essay/ideas`

**Request:**

```ts
type IdeasRequest = {
  essayId: string;
  scholarshipId: string | null;
  prompt: string;
  existingContent: string;
};
```

**Response:**

```ts
type IdeasResponse = {
  hooks: string[];
  storyPrompts: string[];
  gaps: string[]; // missing elements vs prompt/rubric
};
```

### 7.4 History / versions

* `POST /api/essay/autosave` – store `EssayVersion` periodically.
* `GET /api/essay/versions?essayId=...` – list.
* `GET /api/essay/versions/$versionId` – fetch specific version.

---

## 8. Integration With Other Surfaces

### 8.1 Scholarship Detail Page

From a scholarship detail’s Draft step:

* “Open in full essay workspace” button opens:

  * `/essay/$essayId?scholarshipId=...&from=scholarship`

* The Essay page uses scholarship context for:

  * prompt
  * rubric
  * winner-based pattern hints (if available).

### 8.2 Dashboard & Planner

Dashboard pipeline + Smart Planner:

* Treat each essay as a task:

  * `Essay draft started` (>= 100 words)
  * `Essay graded` (Analyze run at least once)
  * `Essay readiness >= X` → mark as “ready” for submission.

* Essay’s `status` updates feed into Dashboard:

  * `Drafting` / `Revising` / `Ready`.

### 8.3 Winner Stories

Use winner stories as **input signals**, never as text to copy:

* Rubric scoring prompt includes summary of winner patterns.
* Ideas tab may say: `Winners often…` bullets.
* Coach responses may reference winner patterns in natural language.

Keep all text **paraphrased**.

---

## 9. Implementation Notes

### 9.1 Library choices

* Editor: `@tiptap/react` + StarterKit
* UI: Tailwind + shadcn components (`Card`, `Tabs`, `Button`, `ScrollArea`).
* Data: TanStack Query for loading/saving; optimistic updates for transforms.

### 9.2 Component structure

```text
src/routes/essay/$essayId.tsx
  - EssayPage
    - EssayHeader
    - PromptCard
    - EssayEditor
    - EssayAssistantSidebar
      - RubricTab
      - IdeasTab
      - HistoryTab
      - CoachTab
```

Keep each tab as its own component for clarity.

---

## 10. Codex Prompt (to implement `essay_page`)

Use this in your repo with Codex:

```text
You are working in the GoGetScholarship web app (TanStack Start + React + TS).
Please refactor the essay workspace into a rich-text, AI-powered editor
according to ESSAY_PAGE.md.

1) Find the current essay workspace
   - Locate the route and components that render the current "Essay Drafter" /
     essay workspace (you’ll see a big textarea, right-hand rubric cards, and
     an "Analyze with AI" button).
   - Briefly summarize its current layout and data flow in comments.

2) Replace the textarea with a rich text editor component <EssayEditor />
   - Use a library like TipTap (if already installed) or a minimal rich-text
     editor that supports:
       * Bold, italic, underline,
       * Bulleted/numbered lists,
       * Headings,
       * Blockquotes,
       * Undo/redo.
   - Add a toolbar with:
       * Formatting controls.
       * AI actions: "Improve clarity", "Suggest next sentence",
         "Reorganize structure".
   - Implement an inline bubble menu that appears when text is selected with
     AI actions:
       * "Rewrite clearer",
       * "More personal",
       * "More concise",
       * "Fix grammar only".
   - For selection-based actions, call a new or existing endpoint such as
     POST /api/essay/transform with { essayId, mode, selection } and show a
     mini diff dialog to accept or cancel the replacement.

3) Implement a side bar <EssayAssistantSidebar /> with tabs:
   - Tabs: "Rubric", "Ideas", "History", "Coach".
   - Rubric tab:
       * Shows overall readiness score (if available) and per-criterion cards
         with strengths and improvements.
       * Provide a button "Improve this area" on each card which calls the
         transform endpoint focused on the paragraphs relevant to that
         criterion and scrolls/highlights them in the editor.
   - Ideas tab:
       * Shows AI-generated hooks, story prompts, and "gaps" based on the
         current essay vs prompt/rubric.
   - History tab:
       * Lists saved versions (auto-saves and pre-transform snapshots).
         Provide a way to view and restore older versions via diff.
   - Coach tab:
       * A small chat interface scoped to THIS essay and scholarship.
         It should use the prompt, rubric summary, and current essay content,
         but never expose raw winner essays; it can reference winner patterns
         in comments.

4) Wire "Analyze with AI" to rubric scoring
   - Replace any placeholder "Analyze" behavior to call
     POST /api/essay/analyze with essayId, scholarshipId, rubricId, and the
     current content.
   - Update overall score and per-criterion cards in the Rubric tab.
   - Show "AI readiness: X / 100" in the header and/or status bar.

5) Autosave and versions
   - Implement autosave to POST /api/essay/autosave on a debounce when the
     content changes.
   - Before running major transforms (full-essay rewrites, structure changes),
     create a new EssayVersion record so History can show a "Before AI rewrite"
     version.

6) Word count and constraints
   - Show a live word count (and max, if provided) in the editor status bar
     and header.
   - Highlight the count in red when over the limit.

7) Integration with scholarship and dashboard
   - Ensure the essay page receives scholarshipId, prompt, and rubricId from
     the backend.
   - After significant improvements (e.g., readiness score over a threshold),
     update the Essay.status to "revising" or "ready" and make sure the
     Dashboard pipeline can reflect this.

8) Styling and responsiveness
   - Use existing Tailwind + shadcn/ui components (Card, Tabs, Button,
     ScrollArea).
   - On desktop, keep a two-column layout with left (prompt + editor) and
     right (assistant sidebar).
   - On mobile, stack the prompt and editor, and collapse the assistant into
     a panel toggle.

Start by identifying the current essay workspace components and their data
flow, then gradually refactor to the new layout, preserving existing API calls
where possible and adding new ones for transforms/analysis/autosave as needed.