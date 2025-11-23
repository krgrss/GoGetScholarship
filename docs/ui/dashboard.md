## 1. Purpose & Vision

The **Dashboard** is the student’s **mission control**, not an admin analytics page.

Primary job:

> Tell the student **what to work on today** to win the **most money** with the **least extra work**, while clearly showcasing our **AI / LLM / RAG / Smart Planner** capabilities to judges.

The Dashboard should:

1. Answer “What’s urgent **today / this week**?”
2. Surface the **Smart Planner timeline** (AI-task breakdown).
3. Show the **applications pipeline** with AI readiness scores.
4. Highlight **low extra work / reuse opportunities** using RAG.
5. Give a short **LLM-generated weekly insight**.

---

## 2. High-Level Layout

Route: `src/routes/dashboard.tsx` (or `src/routes/dashboard/index.tsx`)

### 2.1 Layout Overview

```text
┌───────────────────────────────────────────────────────────────┐
│ Nav (Matches | Dashboard | Custom | Profile + Avatar)        │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ [ Today’s Game Plan ]      [ Cycle Summary ]                  │
│  (2/3 width on desktop)    (1/3 width on desktop)             │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ Smart Planner Timeline (full width)                           │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ [ Applications Pipeline    ]   [ Reuse Suggestions ]          │
│  (2/3 width on desktop)       [ Weekly Insight     ]          │
│                                (stacked in 1/3 col)           │
└───────────────────────────────────────────────────────────────┘
````

### 2.2 Component File Structure

```text
src/components/dashboard/
  TodayPlan.tsx
  CycleSummary.tsx
  SmartPlannerTimeline.tsx
  ApplicationsPipeline.tsx
  ReuseSuggestions.tsx
  WeeklyInsight.tsx
```

Main route composition (conceptual):

```tsx
// src/routes/dashboard.tsx (or similar)
export default function DashboardPage() {
  return (
    <main className="space-y-6">
      <DashboardHeader /> {/* existing title + description, updated copy */}

      <section className="grid gap-4 lg:grid-cols-3">
        <TodayPlan className="lg:col-span-2" />
        <CycleSummary />
      </section>

      <SmartPlannerTimeline />

      <section className="grid gap-4 lg:grid-cols-3">
        <ApplicationsPipeline className="lg:col-span-2" />
        <div className="space-y-4">
          <ReuseSuggestions />
          <WeeklyInsight />
        </div>
      </section>
    </main>
  );
}
```

---

## 3. Global UX & Copy Principles

* **Audience:** stressed HS/undergrad students + hackathon judges.
* **Voice:** student-friendly; avoid heavy jargon like “embeddings/pipelines” in main UI. Use them only in tooltips or dev/lab pages.
* **Primary CTA per screen:** one obvious main action (e.g. “Continue draft”, “Open planner”). Others are secondary links.
* **Sequential & guided:** when there is a logical order, show steps (`Step 1 → Step 2 → Step 3`), not three parallel “modes”.
* **AI labeling:** lightly but clearly annotate AI-powered features:

  * `AI-ranked`, `Smart Planner`, `AI readiness`, `RAG suggestions`, `Coach insight`.

---

## 4. Components & Data Contracts

### 4.1 `<TodayPlan />` – “Today’s Game Plan” (AI-ranked tasks)

**Goal:**
Show the **top 2–3 tasks** the student should focus on **today**, ranked by the Smart Planner (LLM + scheduling).

**Location:**
Top-left of dashboard, 2/3 width on desktop.

**Data shape (conceptual)**

```ts
export type TodayTask = {
  id: string;
  scholarshipId: string;
  scholarshipName: string;
  dueDate: string;          // ISO string
  dueInDays: number;        // derived; can be computed server-side or client-side
  taskLabel: string;        // "Finish Loran short answer #2"
  durationMinutes: number;  // 15, 30, 45...
  aiRank: number;           // 1 = highest priority
  plannerHref: string;      // link to planner or scholarship detail
};
```

**Expected backend:**
Existing planner / dashboard API should provide a `todayTasks: TodayTask[]` list, already sorted by AI. Codex should **reuse** that API or add a light wrapper.

**UI behavior:**

* Card title: `Today’s Game Plan`

* Subtitle:
  `Prioritized by AI based on deadlines, value, and effort.`

* Render up to 3 tasks:

  For each task:

  * Scholarship name (link to detail/planner).
  * Deadline pill: `Due in 2 days` / `Due today`.
  * Task label: `Finish Loran short answer #2`.
  * Meta: `~30 min` (duration).
  * Small badge: `AI-ranked` or `Smart Planner`.
  * Primary button: `Open in Planner` (→ `plannerHref`).

* **Empty state** (no tasks):

  > “No urgent tasks today. You can still review your planner or explore new matches.”

---

### 4.2 `<CycleSummary />` – Light stats, not vanity KPIs

**Goal:**
Give a **quick sense of status** without dominating the page.

**Location:**
Top-right of dashboard, 1/3 width on desktop.

**Data shape (conceptual)**

```ts
export type CycleSummaryData = {
  activeApplications: number;
  activeDueThisWeek: number;
  deadlinesNext30Days: number;
  highValueDeadlinesNext30Days: number;
  potentialValueActive: number; // in student's currency
  draftsInProgress: number;
  draftsNearlyReady: number;
};
```

**UI behavior:**

* Card title: `Cycle Overview`

* Inside, show 3–4 mini-stat rows:

  Example:

  * **Active applications**
    `3 active · 2 due this week`
  * **Deadlines (next 30 days)**
    `4 total · 2 high-value`
  * **Potential value (active)**
    `$42,000 · if all submitted`
  * **Drafts in progress**
    `5 drafts · 3 nearly ready`

* These are **small**, textual, not huge number tiles. The hero is `Today’s Game Plan`, not these stats.

---

### 4.3 `<SmartPlannerTimeline />` – Smart planner strip

**Goal:**
Show that we **break scholarships into tasks** and **schedule** them over weeks, using AI and the existing planner logic.

**Location:**
Full-width section beneath hero row.

**Data shape (conceptual)**

```ts
export type PlannerTaskCategory = "essay" | "documents" | "shortAnswer";

export type PlannerWeek = {
  weekLabel: string; // "This week", "Next week", "Week of Jan 27"
  startDate: string; // ISO
  endDate: string;   // ISO
  tasks: {
    id: string;
    scholarshipId: string;
    scholarshipName: string;
    taskLabel: string;        // "Polish leadership story"
    durationMinutes: number;  // 30
    category: PlannerTaskCategory;
    plannerHref: string;      // link to open this task in full planner
  }[];
};
```

**UI behavior:**

* Card title: `Smart Planner Timeline`

* Subtitle:

  > `AI breaks each scholarship into tasks and spreads them across your weeks.`

* Render 2–3 weeks horizontally (scrollable on mobile):

  For each `PlannerWeek`:

  * Week header: `This week`, `Next week`, or `Week of Jan 27`.
  * Underneath, up to 3–4 pill-like items:

    * `Loran: polish leadership story (30m)` with `Essay` badge.
    * `Burger King: collect transcript (10m)` with `Documents` badge.

* Category legend at bottom:

  * `● Essay work` `● Documents` `● Short answers`

* Top-right link: `View full planner →`
  → navigates to dedicated Planner page (which already exists).

---

### 4.4 `<ApplicationsPipeline />` – Applications pipeline with AI readiness

**Goal:**
Replace generic “Your Applications” table with a **pipeline view** that:

* Shows each scholarship’s **stage**,
* Shows AI-based **readiness** score,
* Surfaces **urgency** (deadlines),
* Provides a **clear next action per row**.

**Location:**
Bottom-left (2/3 width on desktop).

**Data shape (conceptual)**

```ts
export type ApplicationStage =
  | "not_started"
  | "planning"
  | "drafting"
  | "revising"
  | "submitted";

export type ApplicationRow = {
  id: string;
  scholarshipId: string;
  scholarshipName: string;
  isHighValue: boolean;
  stage: ApplicationStage;
  readinessPercent: number | null; // 0–100, null if not applicable
  dueDate: string;                 // ISO
  dueInDays: number;
  primaryActionLabel: string;      // "Start planning", "Continue draft", "Review & submit"
  primaryActionHref: string;
};
```

**UI behavior:**

* Title: `Your Applications Pipeline`

* Subtitle:

  > `Track where each scholarship is in your process.`

* Table columns:

  1. **Scholarship**

     * Name.
     * Optional badge: `High value` if `isHighValue === true`.

  2. **Stage**

     * Colored chip: `Not started`, `Planning`, `Drafting`, `Revising`, `Submitted`.

  3. **Readiness**

     * `72%` (int) if `readinessPercent` present.

     * Tooltip:

       > “Estimated by AI against this scholarship’s rubric.”

     * If null: `—` or `Not assessed yet`.

  4. **Due**

     * `Due in X days` with color coding:

       * `<= 2`: red.
       * `<= 7`: amber.
       * `> 7`: neutral.

  5. **Action**

     * Button or link from `primaryActionLabel` & `primaryActionHref`:

       * `Start planning`
       * `Continue draft`
       * `Review & submit`
       * etc.

* Default sort order:

  * Non-submitted applications,
  * Sort by urgency `dueInDays` ascending,
  * Then by stage (work-in-progress before not-started).

---

### 4.5 `<ReuseSuggestions />` – RAG / embeddings “low extra work” card

**Goal:**
Show off that we use **embeddings + RAG** to find scholarships where the student can **reuse existing essays** with minimal work.

**Location:**
Right column (1/3 width), above `<WeeklyInsight />`.

**Data shape (conceptual)**

```ts
export type ReuseSuggestion = {
  id: string;
  scholarshipId: string;
  scholarshipName: string;
  baseEssayId: string;
  baseEssayName: string;        // "Robotics project essay"
  extraWorkEstimateMinutes: number; // e.g. 15
  plannerHref: string;
};
```

**UI behavior:**

* Title: `Low Extra Work Opportunities`

* Subtitle:

  > `We found scholarships that match essays you’ve already drafted.`

* For each suggestion:

  * Scholarship name (link to detail or planner).
  * Line: `Reuses: Robotics project essay`.
  * Effort tag: `~15 min tweaks`.
  * CTA: `Open suggestion` → `plannerHref`.

* **Empty state:**

  If no suggestions:

  > “Once you’ve drafted a couple of essays, we’ll show scholarships where you can reuse them with minimal tweaks.”

  Option: hide card entirely in truly empty state.

---

### 4.6 `<WeeklyInsight />` – LLM coach summary

**Goal:**
Provide a **short, human-sounding summary** of the student’s current situation using LLM: drafts, deadlines, planner, and potential value.

**Location:**
Right column, below `<ReuseSuggestions />`.

**Data shape (conceptual)**

```ts
export type WeeklyInsight = {
  title: string;     // "Focus on reuse this week"
  bullets: string[]; // 2–3 short bullet points
};
```

**UI behavior:**

* Title: `Coach’s Weekly Insight`

* Render:

  * A short subtitle or intro (optional).
  * 2–3 bullets, e.g.:

    * `You have 3 drafts between 60–80% readiness. Polishing them could unlock about $25,000 in potential value.`
    * `Your strongest stories are about innovation. Prioritize scholarships that reward projects and creativity.`
    * `You have one essay due in less than 3 days; finishing it first will reduce your stress the most.`

* **Empty state:**

  * If backend returns nothing or an error, hide card rather than show an empty box.

---

## 5. AI / LLM / RAG Touchpoints (for Judges)

The Dashboard should **visibly** demonstrate multiple AI capabilities, without overwhelming the student:

1. **AI-ranked tasks (TodayPlan)**

   * Subtitle: `Prioritized by AI based on deadlines, value, and effort.`
   * Badge on each task: `AI-ranked` / `Smart Planner`.

2. **Smart Planner Timeline**

   * Subtitle: `We parse requirements and break them into tasks, then schedule them across your weeks.`
   * Data is produced by planner service (LLM + rules).

3. **Readiness % (ApplicationsPipeline)**

   * Tooltip:

     > “Estimated by AI against this scholarship’s rubric (structure, content, and fit).”

4. **Reuse Suggestions (RAG)**

   * Subtitle:

     > “We compare your essays with our scholarship corpus using embeddings to find low-effort reuse opportunities.”

5. **Weekly Insight (LLM summary)**

   * Subtitle (optional):

     > “AI looks across your drafts, deadlines, and planner to highlight where a bit more effort gives the biggest return.”

These five spots are enough to show **Smart Planner + RAG + LLM summarization** all in one screen.

---

## 6. Implementation Notes

* **Do not** break existing backend routes; instead:

  * Reuse current dashboard/planner APIs where possible.
  * Add new fields to existing responses carefully (backwards-compatible).
* **Styling:**

  * Use the existing design system: Tailwind + shadcn/ui.
  * Reuse existing Card, Table, Badge, Button components.
* **Responsiveness:**

  * On mobile:

    * Stack sections vertically.
    * Horizontal scroll for SmartPlannerTimeline weeks.
    * Pipeline table may simplify or collapse columns.

---

## 7. Codex Prompt (for use in this repo)

Use this as a prompt to Codex to implement/refactor the Dashboard according to this spec:

```text
You are working in the GoGetScholarship web app (TanStack Start + React + TS).
Please refactor the dashboard route into a "mission control" view that showcases
our Smart Planner, LLM readiness scoring, and RAG-based reuse suggestions.

Find the current dashboard route and components (e.g. src/routes/dashboard.tsx
and any dashboard-related components). Keep existing data wiring where possible
but reorganize the UI into the following structure:

1) Hero row (Today’s Game Plan + Cycle Summary)
   - Create <TodayPlan /> in src/components/dashboard/TodayPlan.tsx.
     It should:
       - Fetch today’s AI-ranked tasks from the existing dashboard/planner API.
       - Show 2–3 tasks with:
           * scholarship name + "Due in X days" pill,
           * a short task label ("Finish Loran short answer #2"),
           * an "AI-ranked" or "Smart Planner" badge,
           * a CTA like "Open in Planner" that links to the relevant planner/scholarship.
       - Have an empty state message when there are no tasks.

   - Create <CycleSummary /> in src/components/dashboard/CycleSummary.tsx.
     It should:
       - Replace the current generic KPI cards.
       - Show sharper stats, e.g.:
           * Active applications (with count + how many due this week),
           * Deadlines in next 30 days (with count and high-value count),
           * Potential value of active applications,
           * Drafts in progress (with how many are nearly ready).
       - Keep the layout compact; this is secondary to TodayPlan.

   - In the dashboard page, render these in a grid:
       - TodayPlan spanning 2 columns on desktop,
       - CycleSummary in the third column.

2) Smart Planner Timeline (full-width strip)
   - Create <SmartPlannerTimeline /> in src/components/dashboard/SmartPlannerTimeline.tsx.
     It should:
       - Fetch planner data from the existing planner backend (reuse whatever
         API the dedicated planner page uses).
       - Render 2–3 upcoming weeks ("This week", "Next week", then date labels).
       - Under each week, show up to ~3 pill tasks:
           * "Loran: polish leadership story (30m)" with a category badge
             (Essay / Documents / Short answers).
       - Include a legend for task categories.
       - Provide a "View full planner →" link that navigates to the existing
         planner page for deeper interaction.

3) Applications Pipeline (main table)
   - Create <ApplicationsPipeline /> in src/components/dashboard/ApplicationsPipeline.tsx.
     It should:
       - Replace or refactor the existing "Your Applications" table.
       - Treat each scholarship as a row in a pipeline with columns:
           * Scholarship name (with a high-value badge if appropriate),
           * Stage (Not started / Planning / Drafting / Revising / Submitted)
             as colored chips,
           * Readiness percentage, coming from our existing LLM/rubric scoring
             field if available (show a tooltip explaining it's AI-based),
           * Due date as "Due in X days" with urgency colors,
           * Primary action (button/link) such as "Start planning",
             "Continue draft", or "Review & submit".
       - Default sorting should prioritize urgent deadlines and active stages.

4) Reuse Suggestions (RAG / embeddings)
   - Create <ReuseSuggestions /> in src/components/dashboard/ReuseSuggestions.tsx.
     It should:
       - Fetch RAG-based "low extra work" suggestions from the existing backend
         (Codex: look for APIs that map essays to similar scholarships using
         embeddings and reuse them).
       - Show a small list (1–3) of rows with:
           * Scholarship name,
           * A line like "Reuses: [essay name]",
           * An effort estimate badge ("~15 min tweaks"),
           * CTA "Open suggestion" linking to planner or scholarship detail.
       - When there are no suggestions, either hide the card or show a friendly
         explanation:
           "Once you’ve drafted a couple of essays, we’ll show scholarships
           where you can reuse them with minimal tweaks."

5) Weekly Insight (LLM synthesis)
   - Create <WeeklyInsight /> in src/components/dashboard/WeeklyInsight.tsx.
     It should:
       - Call a dashboard insight API that uses an LLM to summarize the student’s
         current state (planner, drafts, deadlines, and potential value).
       - Display a short title and 2–3 bullet points such as:
           * "You have 3 drafts between 60–80% readiness..."
           * "Your strongest stories are about innovation..."
       - Hide the card if the API returns no insight.

6) Composition & layout
   - In the main dashboard page (src/routes/dashboard.tsx or similar), compose:
       - Hero row: TodayPlan (2/3 width) + CycleSummary (1/3 width).
       - SmartPlannerTimeline as a full-width section below.
       - Bottom row: ApplicationsPipeline (2/3) and a right column with
         ReuseSuggestions on top and WeeklyInsight below.
   - Preserve existing header/navigation.
   - Ensure the page remains responsive on small screens (stack sections and use
     vertical spacing).

7) AI/LLM/RAG affordances
   - Add light, student-friendly microcopy where AI is used:
       * TodayPlan subtitle: "Prioritized by AI based on deadlines, value, and effort."
       * Readiness tooltip: "Estimated by AI against this scholarship’s rubric."
       * SmartPlannerTimeline subtitle: "We parse requirements and break them into tasks, then schedule them across your weeks."
       * ReuseSuggestions subtitle: "We compare your essays with our scholarship corpus using embeddings to find low-effort reuse opportunities."
   - Keep wording simple for students; avoid heavy jargon, but it should still
     be clear to hackathon judges that this is AI-powered.

8) General constraints
   - Do not remove or break existing backend logic; adapt to the current API
     shapes and extend them if needed.
   - Keep the visual style consistent with the rest of the app (Tailwind +
     shadcn/ui). Reuse existing card and table components where possible.
   - Make minimal, focused changes to routing and types, but feel free to
     create new small components under src/components/dashboard/.

First, identify the existing dashboard route/component, summarize its current
data flow in a couple of sentences, and then implement the refactor described
above.