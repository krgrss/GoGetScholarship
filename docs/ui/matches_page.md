````md
# GoGetScholarship – Matches Page Spec

_Last updated: 2025-11-22_

## 1. Purpose & Vision

The **Matches** page is the primary **discovery surface** of GoGetScholarship.

Primary jobs:

1. Help students **discover scholarships they’re actually likely to win**, not just any scholarships.
2. Let them **quickly triage** each opportunity into:
   - **Save** → becomes an active opportunity (Dashboard + Planner).
   - **Skip** → ignored and used to improve ranking.
3. Provide power users with **list** and **browse-all** views, with strong filters.

The page must clearly showcase:

- **Embeddings + profile-based matching** (`semantically ranked by fit`).
- **Smart swipe experience** (`Find My Match` feels like Tinder, not just a big card).
- A real **Save → Dashboard → Planner** pipeline.

---

## 2. Route, Modes & Layout

### 2.1 Route

- Route: `src/routes/matches.tsx` (or `src/routes/matches/index.tsx`).
- Optional query param: `mode = swipe | list | browse`
  - Default: `swipe`.

### 2.2 Modes

The Matches page has **three modes**:

1. **Swipe mode** – “Find My Match”
   - Card-based, one-at-a-time decisions (`Save` / `Skip`).
   - Feels like Tinder for scholarships.
2. **List mode** – “See my matches”
   - Tabular/card list of **saved / top matches** for comparison.
3. **Browse mode** – “Browse all scholarships”
   - Larger **catalog view** with full filters.

Modes can be implemented as tabs / segmented control or button group, but they must behave like **mutually exclusive views**, not three unrelated buttons.

### 2.3 Top Layout (Desktop)

```text
┌───────────────────────────────────────────────────────────────┐
│ GoGetScholarship STUDIO   Matches | Dashboard | Custom | Profile
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ [badge] Uses your saved profile and embeddings                │
│ [badge] Semantically ranked by fit                           │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ Mode switch:  Swipe (Find My Match) | List | Browse          │
│ Filters button (mobile)  | Sort dropdown                     │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ [Filters sidebar]          [Main content based on mode]      │
└───────────────────────────────────────────────────────────────┘
````

### 2.4 Filters Sidebar (shared across modes)

Left column (desktop):

* Country / Region
* Level of Study
* Fields of Study (search)
* Workload (All / Light / Medium / Heavy)
* Checkboxes:

  * `Priority matches only`
  * `Hide ineligible` (default checked)
* Buttons:

  * `Reset filters`

On mobile:

* Collapsed into a “Filters” button which opens a sheet/drawer.

---

## 3. Global UX & Copy Principles

* **Mode clarity:** students should always know where they are: `Swipe`, `List`, or `Browse`.
* **One main decision per screen in Swipe:** Save vs Skip.
* **Explain what Save does:** “Saved scholarships appear in your Dashboard and Planner.”
* **AI transparency:**

  * Top: `Uses your saved profile and embeddings` and `Semantically ranked by fit`.
  * On cards: short `Why this fits you` explanation.
* **Non-destructive Skip:** skipping doesn’t permanently delete; it’s a preference signal.
* **Keyboard accessibility:** (optional but nice) ← / → for Skip / Save.

---

## 4. Data Model & Backend Concepts

### 4.1 Scholarship Match

This is what powers the **Swipe** and **List** views.

```ts
export type ScholarshipMatch = {
  scholarshipId: string;
  name: string;
  providerName: string;

  amountMin: number;
  amountMax: number | null;
  currency: string;
  frequency: "one_time" | "annual" | "multi_year" | null;

  deadline: string | null;        // ISO
  daysUntilDeadline: number | null;

  countryTags: string[];          // ["CA", "US"]
  workloadLevel: "light" | "medium" | "heavy";
  workloadSummary: string;        // "1 essay · Transcript"
  eligibilityStatus: "eligible" | "borderline" | "ineligible";

  matchScore: number | null;      // 0–100
  matchTier: "excellent" | "good" | "okay" | "unknown";

  whyMatch: string;               // one-liner explanation
  winnerExamplesAvailable: boolean;

  // For future advanced UI:
  hasPlannerTasks: boolean;
  isSaved: boolean;               // derived from StudentScholarship join
};
```

### 4.2 StudentScholarship (Save relationship)

Join table linking student ↔ scholarship.

```ts
export type StudentScholarshipStatus =
  | "saved"       // user saved it, not yet working
  | "planning"    // plan created in Dashboard
  | "drafting"    // essay in progress
  | "submitted"   // application submitted
  | "dismissed";  // user explicitly skipped / hid it

export type StudentScholarship = {
  id: string;
  studentId: string;
  scholarshipId: string;
  status: StudentScholarshipStatus;
  source: "swipe" | "list" | "browse" | "custom";
  createdAt: string;
  updatedAt: string;
};
```

### 4.3 SwipeDecision log (optional but recommended)

Even if we set `status = "dismissed"`, it’s useful to also log raw events.

```ts
export type SwipeDecision = {
  id: string;
  studentId: string;
  scholarshipId: string;
  action: "save" | "skip";
  source: "swipe";
  createdAt: string;
};
```

Used for analytics and potentially re-ranking.

---

## 5. Swipe Mode (“Find My Match”)

### 5.1 UI Layout

Center pane on desktop:

```text
┌───────────────────────────────────────────────┐
│ Mode: Swipe (Find My Match)                  │
│ Sort by: [Best match ▼]                      │
└───────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│ [ Scholarship Card – top of deck ]           │
└───────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│    [ Skip ]           [ Save ]               │
└───────────────────────────────────────────────┘

┌───────────────────────────────────────────────┐
│ 3 of 27 matches today · Your choices improve │
│ future recommendations.                      │
└───────────────────────────────────────────────┘
```

### 5.2 Scholarship Card Content

**Component:** `<SwipeMatchCard />`

Card content (based on screenshot + enhancements):

* Header area:

  * Amount: `~$50,000` (use range if needed).
  * Optional frequency: `Multi-year scholarship` if applicable.
  * Deadline banner:

    * `Deadline approaching` / `Deadline: May 15 · 22 days left`.

* Chips:

  * Eligibility: `Eligible` / `Borderline` / `Ineligible` (if shown).
  * Workload: `Medium workload`.
  * Region: `CA` / `US` etc.
  * Optional: `Winner examples available`.

* Main body:

  * Scholarship name.

  * Provider name.

  * Workload summary:

    * `Requires: 1 essay · Transcript`.

  * **Match line:**

    ```text
    Match: 88 (Excellent) – Highlights your robotics and community work.
    ```

    * `whyMatch` string should be **student-specific** (based on profile + embeddings).

* Footer (top of action section):

  * Small text: `Saved scholarships appear in your Dashboard and Planner.`

* Action buttons (large):

  * Left: `Skip` (ghost / outline with X icon).
  * Right: `Save` (primary green with heart icon).

### 5.3 Interactions

On **Save**:

1. POST to `POST /api/matches/decision`:

   ```json
   {
     "scholarshipId": "xxx",
     "action": "save"
   }
   ```

2. Backend behavior:

   * Upsert `StudentScholarship`:

     * if none → create with `status = "saved"`, `source = "swipe"`.
     * if exists with `status = "dismissed"` → update to `saved`.

   * Log `SwipeDecision` with `action = "save"`.

3. UI behavior:

   * Button changes to `Saved ✓` briefly.
   * Optional toast: `Saved to your Dashboard.`
   * After 300–600ms, card animates off (to right) and the next card appears.

On **Skip**:

1. POST to `POST /api/matches/decision`:

   ```json
   {
     "scholarshipId": "xxx",
     "action": "skip"
   }
   ```

2. Backend behavior:

   * Update or create `StudentScholarship` row as `status = "dismissed"` (or keep in a separate log if you do not want to mutate join).
   * Log `SwipeDecision` with `action = "skip"`.

3. UI behavior:

   * Optional subtle animation left.
   * Show next card.

Keyboard shortcuts (optional but recommended):

* `ArrowLeft` → Skip.
* `ArrowRight` → Save.
* `Space` or `ArrowUp` → open quick detail / full scholarship.

### 5.4 Progress Indicator & Daily Cap

Below card:

* Text: `3 of 27 matches today`.

* Implementation:

  * `index + 1` of `totalMatches`.
  * Optionally enforce a daily cap, e.g. 50.

* Subtext: `Your choices help re-rank future matches.`

### 5.5 Edge Cases / Empty States

* No matches after filters:

  * Show message:
    `No matches under these filters yet. Try widening your filters or browse all scholarships.`

  * Button: `Browse all scholarships`.

* All cards swiped:

  * Display:

    ```text
    You’ve reviewed all your top matches for today.
    [See saved matches]  [Browse all scholarships]
    ```

---

## 6. List Mode (“See my matches”)

### 6.1 Purpose

List mode is for **reviewing & managing** scholarships the student actually cares about, primarily:

* Saved (`status = "saved"`)
* Planning / Drafting / Submitted

It is also your way to show **“AI-ranked list”** to judges.

### 6.2 Layout

* Mode tab: `List` selected.
* Filters sidebar still available.
* Main content: table or card grid.

Example table:

Columns:

1. Scholarship (name + provider)
2. Match (score + chip)
3. Value (amount / range)
4. Workload
5. Status (Saved / Planning / Drafting / Submitted)
6. Deadline (date + days left)
7. Action

### 6.3 Data Source

`GET /api/student-scholarships?mode=list` returning:

```ts
type StudentMatchRow = {
  scholarshipId: string;
  studentScholarshipStatus: StudentScholarshipStatus;
  scholarship: ScholarshipMatch; // reusing shape
};
```

### 6.4 Actions per row

* `Open workspace` – goes to Scholarship detail page.
* `Open in Dashboard` – goes to Dashboard filtered to this scholarship.
* `Unsave` – sets status to `dismissed` or deletes join.

---

## 7. Browse Mode (“Browse all scholarships”)

### 7.1 Purpose

For students who want to **search the full corpus** beyond AI matches.

### 7.2 Layout

* Mode: `Browse`.
* Same filters.
* Grid or list of scholarship cards:

  * Smaller version of Swipe card; includes Save button.
  * Sorted by `Best match` by default, but can change to `Highest value`, `Earliest deadline`, etc.

### 7.3 Save from Browse

* Clicking Save uses the same join table logic as Swipe:

  * `StudentScholarship.status = "saved"`, `source = "browse"`.

Message:

* `Saved to your Dashboard and matches list.`

---

## 8. AI / LLM / RAG Surfaces (Matches Page)

Make sure AI is clearly visible:

1. **Top badges (already there)**

   * `Uses your saved profile and embeddings`
   * `Semantically ranked by fit`

2. **Match line on card**

   * `Match: 88 (Excellent)` + `whyMatch` explanation.

3. **Priority matches only filter**

   * Explains: `Shows scholarships with match score above X or high profile alignment.`

4. **Winner examples badge (if available)**

   * Chip: `Winner insights available`
   * Tooltip: `We’ve studied past winners for this scholarship type to inform strategy on the detail page.`

These hints tie Matches to the **winner stories** + **Scholarship page** features.

---

## 9. API Endpoints (Conceptual)

### 9.1 Fetch matches for Swipe / List

```ts
GET /api/matches?mode=swipe|list&filters...
```

Response for `mode=swipe`:

```ts
type SwipeMatchesResponse = {
  totalMatches: number;
  matches: ScholarshipMatch[]; // in ranked order
};
```

Response for `mode=list` can reuse `StudentMatchRow` if you choose, or you can separate.

### 9.2 Log decision (save/skip)

```ts
POST /api/matches/decision

body: {
  scholarshipId: string;
  action: "save" | "skip";
}
```

Server:

* Validates student from session.
* Updates `StudentScholarship` + `SwipeDecision`.

### 9.3 Browse scholarships

```ts
GET /api/scholarships/browse?filters...
```

Returns raw `ScholarshipMatch` without student-specific status fields (or with them merged in if convenient).

---

## 10. Implementation Notes

* **Don’t break existing filters;** rewire them to affect all views consistently.
* **Make `Find My Match` the hero:**

  * Default mode.
  * Blue primary styling.
* **Ensure Save is consistent:**

  * Swipe Save, List Save, and Browse Save must all write to the same join table to feed Dashboard.

---

## 11. Codex Prompt (to implement Matches according to this spec)

Use this prompt with Codex in the GoGetScholarship repo:

```text
You are working in the GoGetScholarship web app (TanStack Start + React + TS).
Please refactor the Matches page so that "Find My Match" behaves like a Tinder-
style swipe experience, and wire a real Save mechanism into the Dashboard and
Planner, following MATCHES.md.

1) Find the existing Matches route and components
   - Locate src/routes/matches.tsx (or similar) and any components used for the
     current Matches page, including:
       * Filters sidebar,
       * The large scholarship card,
       * Buttons: "See my matches", "Find My Match", "Browse all scholarships".
   - Briefly summarize how it's currently structured and which buttons actually
     have behavior.

2) Introduce explicit modes for:
   - Swipe mode: "Find My Match" (default).
   - List mode: "See my matches".
   - Browse mode: "Browse all scholarships".
   Implement these as a tab/segmented control or mutually-exclusive button
   states whose selection changes the main content view.

3) Swipe mode ("Find My Match")
   - Implement a deck of ScholarshipMatch cards, one visible at a time.
   - Each card should show:
       * Amount and "Deadline approaching" (or "Deadline: [date] · X days left").
       * Eligibility tag, workload tag, region tag, winner-insights tag if
         available.
       * Scholarship name and provider.
       * Workload summary ("Requires: 1 essay · Transcript").
       * Match score pill and one-line "Why this fits you" explanation based on
         the existing match data.
       * A note: "Saved scholarships appear in your Dashboard and Planner."
   - Add two primary buttons under the card:
       * "Skip" (outline/ghost) – logs a skip and advances to the next card.
       * "Save" (solid green) – saves the scholarship for the student and
         advances to the next card.
   - Display a progress indicator like "3 of 27 matches" below the actions.
   - Wire keyboard shortcuts (optional but ideal): left/right arrows for
     skip/save.

   - Backend:
       * When the page loads in swipe mode, call GET /api/matches?mode=swipe
         (or adapt to the existing endpoint) to fetch a ranked list of matches.
       * On Skip/Save, POST to /api/matches/decision with scholarshipId and
         action ("save" or "skip"), then move to the next match.

   - SQL/data:
       * Implement or reuse a StudentScholarship join table linking student to
         scholarship with a status field ("saved", "planning", "drafting",
         "submitted", "dismissed").
       * Saving from Swipe should upsert StudentScholarship with
         status="saved", source="swipe".
       * Skipping should either set status="dismissed" or log a separate
         SwipeDecision row; keep it non-destructive for future changes.

4) List mode ("See my matches")
   - Implement a list/table view that shows scholarships where the student has
     StudentScholarship.status in ("saved", "planning", "drafting", "submitted").
   - Display columns such as:
       * Scholarship (name + provider),
       * Match score,
       * Value (amount),
       * Workload,
       * Status (Saved/Planning/Drafting/Submitted),
       * Deadline (date + days left),
       * Main action ("Open workspace", "Open in Dashboard").
   - Filters should still apply in this mode.
   - Saving/unsaving from this view should update StudentScholarship using the
     same mechanism as Swipe.

5) Browse mode ("Browse all scholarships")
   - Implement a catalog-style list/grid of ScholarshipMatch cards, showing far
     more scholarships than just the ranked matches.
   - Reuse the card component (smaller variant) with a Save button.
   - Filters and sort controls should work here as well.
   - Saving from Browse uses the same StudentScholarship logic with
     source="browse".

6) Integration with Dashboard
   - Ensure that:
       * StudentScholarship rows created via Swipe/List/Browse are visible to
         the Dashboard's "Applications pipeline" and Smart Planner.
       * The Save button text or tooltip on the Matches card clarifies that
         saving sends the scholarship to Dashboard/Planner for further planning.

7) AI/LLM copy and badges
   - Keep the existing badges "Uses your saved profile and embeddings" and
     "Semantically ranked by fit" at the top.
   - On each card, surface the existing "why this fits you" explanation if
     available.
   - If the scholarship has winner-story data, show a "Winner insights
     available" chip and ensure the scholarship detail page uses that as per
     WINNER_STORIES.md.

8) Styling & responsiveness
   - Use existing design system components (Tailwind + shadcn/ui).
   - On mobile, collapse the filters into a drawer and stack the card and
     actions vertically.
   - Ensure mode switching is clear on both desktop and mobile.

Start by identifying and briefly describing current Matches components and any
existing save/hide logic. Then implement the three modes with the Swipe
experience as described, wiring Save into the StudentScholarship join table and
ensuring Dashboard visibility.
```

```
::contentReference[oaicite:0]{index=0}
```
