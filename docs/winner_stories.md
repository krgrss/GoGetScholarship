````md
# GoGetScholarship – Winner Stories Spec

_Last updated: 2025-11-22_

## 1. Purpose & Vision

**Winner stories** are one of the strongest differentiators of GoGetScholarship.

We don’t want them to be just “background training data” – they should be a **visible**, **actionable**, and **measurable** part of the product.

Primary jobs of winner stories:

1. Help students **see what success looks like** in a safe, non-copyable way.
2. Let AI give **grounded strategy and feedback**: “this is what winners do differently.”
3. Show judges we’re not just doing generic GPT essays – we’re **RAG-ing on curated winner examples & prompts**.

---

## 2. Data Model & Storage

We’ll treat winner stories as a **first-class RAG corpus**.

### 2.1 Core schema

Logical model (DB or JSON):

```ts
type WinnerStory = {
  id: string;
  scholarshipId: string | null; // null for generic / category-level stories
  scholarshipSlug: string | null;

  sourceType: "official_profile" | "public_blog" | "student_submission" | "other";
  sourceUrl: string | null;
  year: number | null;

  promptText: string;        // Original scholarship essay prompt
  essayText: string;         // The winner's essay (raw, stored securely)
  anonymizedText: string;    // De-identified version (no names, no specific schools)
  language: string;          // "en", etc.

  // High-level metadata
  themes: string[];          // ["innovation", "community", "resilience"]
  structure: string[];       // ["hook", "challenge", "action", "impact", "reflection"]
  toneDescriptors: string[]; // ["humble", "confident", "reflective"]

  // Rubric + scoring (if available)
  rubricId: string | null;
  rubricScores: {
    [criterionId: string]: number; // 0–100
  } | null;

  // Embeddings & RAG hooks
  promptEmbedding: number[]; // vector for prompt
  essayEmbedding: number[];  // vector for essay/text
  combinedEmbedding: number[]; // prompt+essay representation

  // Privacy & safety
  isParaphrasedForUI: boolean;
  canShowOutline: boolean;
  canShowTextSnippets: boolean; // short snippets only, heavily paraphrased
};
````

### 2.2 Indexing & RAG

* Store embeddings in your vector DB (`pgvector`, etc.).
* Index keys:

  * by `scholarshipId`,
  * by prompt similarity (promptEmbedding),
  * by theme & structure tags.

Typical retrieval queries:

1. **By scholarship type:**
   “Find winner stories for scholarships with similar prompts and themes (innovation + STEM).”

2. **By rubric criterion:**
   “Show snippets where winners nail ‘Reflection’.”

3. **By student essay:**
   “Find winners whose essays are structurally similar vs different from this student’s essay.”

---

## 3. UX Surfaces – Where Winner Stories Show Up

We use winner stories in **three main journeys**:

1. **Understanding what works** (Strategy & Personality).
2. **Drafting & structuring an essay** (Inspiration).
3. **Grading & improving against winner patterns** (Comparison & feedback).

### 3.1 Scholarship Page – Step 1: Strategy & Personality

**Component:** part of `<StrategyStep />` on the scholarship detail page.

#### 3.1.1 “What past winners tend to do”

Block under the main “Winning Strategy” paragraph.

**Title:** `What past winners tend to do`
**Content (LLM-generated from WinnerStory corpus):**

* 2–4 bullets:

  Examples:

  * “They open with a concrete story about a specific project, not a generic statement of values.”
  * “They connect impact to a community (school, neighborhood, club) rather than just personal benefit.”
  * “They spend at least a paragraph reflecting on what they learned and how they’ll apply it.”

* Optional short **paraphrased example** (max 1–2 sentences):

  ```text
  Example pattern:
  “One winner described designing a low-cost robotics workshop for younger students, 
  then explained how it changed their view of leadership and mentorship.”
  ```

* Safety footer:

  ```text
  Learned from past winners.
  Do not copy; use this as inspiration for your own story.
  ```

**Backend behavior:**

* For this scholarship or its category:

  1. Retrieve `k` relevant WinnerStory records by prompt + theme.
  2. Summarize patterns into bullet points via LLM.
  3. Generate one synthetic, anonymized example pattern.

---

### 3.2 Scholarship Page – Step 2: Draft Essay (“Inspiration mode”)

**Component:** `<DraftStep />`

We add a distinct **Inspiration section** powered by winner stories.

#### 3.2.1 Winner-based outline

UI element:

* Button: `See how winners usually structure their answer`

* On click: show:

  * Heading: `A typical winning structure`
  * Numbered outline:

    ```text
    1. Hook: a specific moment that illustrates the main theme.
    2. Context & challenge: what was the situation / problem?
    3. Actions: what exactly did you do?
    4. Impact: what changed because of your actions?
    5. Reflection: what you learned + how you’ll apply it.
    ```

* Footer note:

  ```text
  This outline is synthesized from past winners’ essays for similar scholarships.
  Don’t copy; map your own story into this shape.
  ```

**Backend behavior:**

* Given scholarship + WinnerStory set:

  * LLM outputs an abstract outline that reflects **common structures** (not a copy of any essay).

#### 3.2.2 Winner-style hooks (optional)

Below outline:

* Title: `Sample hooks winners might use`

* Show 2–3 short, heavily paraphrased hook **templates**, e.g.:

  * “The night our community center lost funding, I realized how fragile our programs really were.”
  * “When the robot failed during our final demo, I felt my months of work collapsing in front of the judges.”

* Explicit label: **NOT real essays**, just “examples of the type of opening story” winners use.

---

### 3.3 Scholarship Page – Step 3: Grade & Compare (“Compare to winners”)

**Component:** `<GradeStep />`

#### 3.3.1 Winner pattern comparison panel

After rubric-based grading, we show a **winner pattern comparison** block.

**Title:** `How you compare to typical winners`

**Per rubric criterion (UI):**

Example layout:

```text
Innovation      ●●●●○  (You)   |  ●●●●● (Winners)
Comment:        You have a clear project described, but limited detail on impact.

Leadership      ●●○○○  (You)   |  ●●●●○ (Winners)
Comment:        Winners often highlight how they mobilize others; your essay focuses
                mostly on individual effort.

Reflection      ●○○○○  (You)   |  ●●●●○ (Winners)
Comment:        Winners usually include 2–3 sentences on what they learned and how
                they'll apply it; you currently have none.
```

**Backend behavior:**

* For this scholarship’s rubric and theme:

  1. Retrieve a small cluster of WinnerStory essays.
  2. Compute or approximate average scores per criterion (from `rubricScores` or via LLM).
  3. Ask LLM to compare student’s graded draft vs these aggregated winners.
  4. Surface:

     * Winner “average” for each criterion (0–5 / 0–100).
     * Short targeted comment.

---

### 3.4 Scholarship Page – Optional “Winner-powered Coach mode”

Instead of a generic “Ask Coach”:

* The coach prompt always includes:
  “You have access to anonymized winner stories for similar scholarships; answer based on their patterns, but never quote them verbatim.”

UI:

* Under Draft or Grade steps:

  * Title: `Ask a coach (trained on past winners)`
  * Chips:

    * `Is my story similar to past winners?`
    * `What would winners add about impact?`
    * `How do winners talk about setbacks?`

This keeps winner stories **anchored in the coach persona**.

---

### 3.5 Matches Page – Subtle badges

On the **Matches / Browse scholarships** cards:

* If a scholarship has enough winner stories:

  * Add a subtle badge: `Winner examples available`
  * Hover/tooltip:

    > “We’ve studied past winners for this scholarship type to help you learn how to stand out.”

* Clicking card leads to Scholarship detail’s Strategy section.

---

### 3.6 Dashboard – Weekly Insight using winners

In `WeeklyInsight` on the Dashboard:

* Example bullets:

  * `Your drafts match winners on Innovation, but are consistently weaker on Reflection. Try adding a short “what I learned” paragraph to each essay.`
  * `Past winners for similar scholarships usually apply to 3–5 related programs reusing a core story. You have 1; consider adapting your robotics story for these 2 more scholarships.`

Backend: LLM gets:

* Student’s essays + grades,
* WinnerStories summary,
* Then outputs “where you differ from winners” and “where to leverage reuse.”

---

## 4. Safety, Ethics & UX Guardrails

Winner stories are **sensitive**; we must avoid turning them into a copy-paste library.

### 4.1 Data handling

* Store raw essays in a **restricted table/bucket**, not exposed to client.
* Only **anonymized** / **paraphrased** content leaves the backend.
* LLM prompts must explicitly instruct:

  * “Do NOT quote or mimic long phrases from any one essay.”
  * “Generate synthetic patterns, outlines, and templates based on aggregated examples.”

### 4.2 UX guardrails

* Always label winner-derived blocks:

  * `Learned from past winners. Do not copy; use as inspiration only.`
  * `Outline is synthesized from multiple winners, not a template to copy word-for-word.`

* Avoid showing full, contiguous paragraphs that resemble any real essay.

* Keep any “example text” short (1–3 sentences) and generic.

---

## 5. API Endpoints (Conceptual)

We can layer winner stories into existing services or create dedicated endpoints.

### 5.1 `GET /api/winner-stories/patterns`

**Purpose:** Get high-level patterns for a scholarship or category.

**Request:**

```ts
GET /api/winner-stories/patterns?scholarshipId=...&rubricId=...
```

**Response (conceptual):**

```ts
type WinnerPatternsResponse = {
  themes: string[];            // ["innovation", "community", ...]
  structureOutline: string[];  // ["Hook", "Challenge", "Action", "Impact", "Reflection"]
  strategyBullets: string[];   // for "What past winners tend to do"
  sampleHookTemplates: string[];
};
```

Used by:

* Strategy step (`What past winners do`).
* Draft step (inspiration outline + hooks).

---

### 5.2 `POST /api/winner-stories/compare`

**Purpose:** Compare a student essay against winner patterns on rubric criteria.

**Request body (conceptual):**

```ts
type CompareRequest = {
  scholarshipId: string | null;
  rubricId: string;
  essayText: string;
};
```

**Response:**

```ts
type CompareResponse = {
  perCriterion: {
    criterionId: string;
    studentScore: number;
    winnerAverageScore: number;
    comment: string; // "You focus on X, winners often also add Y"
  }[];
};
```

Used by:

* Grade step’s `How you compare to winners` panel.

---

### 5.3 `GET /api/winner-stories/inspiration`

**Purpose:** Provide outline + hooks for Draft step.

**Request:**

```ts
GET /api/winner-stories/inspiration?scholarshipId=...&promptType=main_essay
```

**Response:**

```ts
type InspirationResponse = {
  outline: string[];      // numbered sections
  hookTemplates: string[]; // short, paraphrased examples
};
```

---

## 6. Implementation Phases (Hackathon-Friendly)

### Phase 1 – MVP (show judges the concept)

* Seed a **tiny** set of WinnerStory examples (even 3–5 is enough).

* Implement:

  1. `What past winners tend to do` block (bullet list) in Strategy.
  2. `Typical winning structure` outline + 1–2 hook templates in Draft.
  3. Very simple `How you compare to winners` panel in Grade using LLM-only (no full DB/metrics yet).

* Hardcode or mock API responses if needed, but **visually** show the feature.

### Phase 2 – RAG integration

* Ingest more winner stories into vector DB.
* Wire endpoints to real retrieval + summarization.
* Add “Winner examples available” badge on Matches cards.

### Phase 3 – Advanced comparison & insights

* Add cluster-based similarity metrics.
* Use winner patterns in WeeklyInsight and Dashboard suggestions.
* Maybe build a counselor-only “Winner Stories Lab” view (not needed for hackathon).

---

## 7. Codex Prompt (to integrate Winner Stories)

Use this when you want Codex to wire winner stories into the app:

```text
You are working in the GoGetScholarship web app (TanStack Start + React + TS),
with a backend that includes a "winner stories" corpus for scholarship essays.

Your goal is to expose winner stories as a visible, AI-powered feature across
the scholarship detail page and, where reasonable, the dashboard, following
the spec in WINNER_STORIES.md.

Start with the scholarship detail page:

1) Find the existing scholarship detail route and components
   (src/routes/scholarship/$scholarshipId.tsx and related components).
   Identify:
     - Where "Strategy", "Essay workspace", and "Grade / RubricCoach" live.
     - Any existing calls to winner-related APIs (if any).

2) Implement the "What past winners tend to do" block inside the Strategy step:
   - Call a new or existing endpoint like GET /api/winner-stories/patterns
     (you may create this route and stub it for now).
   - Render:
       * 2–4 bullet points summarizing winner patterns.
       * An optional short paraphrased example pattern.
       * A footer line: "Learned from past winners. Do not copy; use this as
         inspiration only."
   - Label the block as AI-powered but student-friendly.

3) Implement "Typical winning structure" in the Draft step:
   - Add a button "See how winners usually structure their answer".
   - On click, call GET /api/winner-stories/inspiration?scholarshipId=...
     to fetch:
       * An outline array (section labels).
       * A few short hook templates.
   - Display the outline and hooks in a side panel or collapsible box next to
     the draft editor, with clear "do not copy" messaging.

4) Implement "How you compare to winners" in the Grade step:
   - After rubric grading, add a panel that compares the student's scores to
     aggregated winner scores per rubric criterion.
   - Call POST /api/winner-stories/compare with scholarshipId, rubricId, and
     the current essay text to obtain per-criterion:
       * studentScore
       * winnerAverageScore
       * a short comment describing how the student's essay differs from winners.
   - Render this as:
       * pairs of bars or numeric labels (You vs Winners),
       * a short comment per criterion.

5) Optionally, annotate the coach/chat feature (if present) so that prompts
   mention it can draw on anonymized winner patterns but must not quote or
   mimic them. Ensure that we never show long verbatim winner text to the
   user; we only show paraphrased patterns and short templates.

6) Keep safety and UX guardrails:
   - Always show a disclaimer for winner-derived examples: "Do not copy; use
     as inspiration."
   - Avoid surfacing long contiguous blocks that resemble a full winner essay.
   - Use the existing styling (Tailwind + shadcn/ui), and integrate this UI
     smoothly into current components.

First, report which files you are going to touch and how winner stories are or
aren't currently referenced. Then implement the three UX surfaces:
Strategy patterns, Draft inspiration, and Grade comparison.
```

```
::contentReference[oaicite:0]{index=0}
```
