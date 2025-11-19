
## 1. Onboarding Wizard → “Calm scholarship Duolingo”

**Inspo combo**

* Going Merry’s simple profile steps (sign up → profile → matches). ([Going Merry][1])
* Duolingo’s stepper / progress indicators (for the “I’m close to finishing” feeling).

**Patterns to copy**

* **3-step wizard** with clear titles: `Basics → Background (optional) → About you`.
* Progress line at top: e.g. circles with labels + a thin progress bar.
* Each step feels *short*: 4–6 inputs max, with “Skip for now” on optional steps.
* Microcopy under demographics: “Optional – only used to find targeted opportunities.”

**How to adapt in your UI**

* Use a central `Card` (`max-w-xl mx-auto`) like you defined in `ui-requirements.md`.
* Top: `Steps` component (or just flex with numbered badges).
* Bottom: `Back / Next / Skip` row using shadcn `<Button>`.
* On final step: big primary button “Save profile & see matches”.

---

## 2. Matches List → “Going Merry meets job board”

**Inspo**

* Going Merry “Matched Scholarships” page (filters + list, clear status labels like **Match / Not eligible / Need more info**). ([Going Merry][1])
* Any modern job board (Wellfound, LinkedIn Jobs) for card density & hover states.

**Patterns to copy**

* **Two-column layout**:

  * Left: filter sidebar (country, level, fields, workload toggle).
  * Right: list of scholarship cards.
* Each card shows:

  * Title + provider.
  * Amount + deadline (“Oct 1 • 45 days left”).
  * Row of **Badges**: level, field, *demographic chip* (“Women in STEM”), **workload chip** (“1 essay · 2 refs”).
  * Subtle status pill like “In progress” if user already tracking.
* At the top: small sentence “Based on your profile. Adjust filters to explore more.”

**How to adapt**

* Component: `<ScholarshipCard>` using `Card` + `Badge`.
* Add hover lift: `hover:-translate-y-0.5 hover:shadow-md transition`.
* Skeleton loading: 4–6 card skeletons (same shape, grey blocks).
* Tie to your matching logic (pgvector + hard filters) but visually treat it like a job board.

---

## 3. Scholarship Detail → “Common App / Going Merry detail”

**Inspo**

* Going Merry scholarship detail + “Start application” flows. ([Going Merry][1])
* Common App college detail pages for clean sections.

**Patterns to copy**

* 2-column layout on `md+`:

  * **Left:**

    * Title + provider.
    * Amount + renewable badge.
    * Deadline chip.
    * Sections “About this scholarship” and **“Eligibility”** (bullet list).
    * Inside Eligibility: clearly separate

      * academic (level, major, GPA),
      * geographic (country/citizenship),
      * **demographic focus** (hard vs priority).
  * **Right (sticky sidebar):**

    * Card “What they care about” → show themes + rubric criteria names + weights.
    * Card “Application components” → checklist icons (essay, refs, transcript,…).
    * Buttons:

      * `Start essay` (primary),
      * `Plan this scholarship` (secondary),
      * `Why this fits you` (ghost).

**How to adapt**

* Use `grid md:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-6`.
* Make sidebar sticky with `md:sticky md:top-20`.
* “Why this fits you” → shadcn `Dialog` with 2 sections:

  * **Strengths** bullets,
  * **Gaps / notes** bullets (from `ExplainFitGraph`).

---

## 4. Essay Workspace → “Notion/Grammarly-style editor”

**Inspo**

* Classic Grammarly / Superhuman (ex-Grammarly) editor: central doc, right-hand suggestions panel. ([The Verge][2])
* Notion AI’s inline “Ask AI” and structured side panel.

**Patterns to copy**

* Top bar:

  * Scholarship name (left),
  * word count “312 / 500” (right, muted).
* Split layout:

  * **Left**:

    * Prompt card at top (prompt text + word limit).
    * Large textarea / rich-text editor.
    * Row of AI buttons:

      * `Generate outline`,
      * `Draft from bullets`,
      * `Rewrite for clarity`.
  * **Right** (Tabs: `Rubric`, `Themes`):

    * Rubric list with names + % weight, plus “Grade against rubric” button at bottom.
    * Themes chips on second tab.

**How to adapt**

* Use your existing color system: prompt card with slight warm background.
* Use shadcn `Tabs` for Rubric/Themes.
* Put a tiny “Saved 2 min ago” indicator under the editor (autosave state from TanStack).

---

## 5. Rubric Self-Grading & Revision → “Duolingo progress + Git diff”

**Inspo**

* Duolingo’s progress bars & level colors for the **readiness** indicator. ([Going Merry][3])
* GitHub diff / Google Docs “suggesting mode” for the **revision diff**.

**Patterns to copy**

* After “Grade against rubric”:

  * List each criterion in a card/table:

    * Left: criterion name (“Community impact”).
    * Middle: colored pill “3 / 5”.
    * Right: `Improve this` button.
    * Below: short feedback line.
  * Top-right of card: **Readiness badge** (`Needs work / Solid / Ready`) using colors.
* On “Improve this”:

  * Open a right-side `Sheet`:

    * Show criterion name + brief rubric text.
    * Two columns: “Current version” vs “Suggested revision” with highlighted changes.
    * Buttons: `Accept revision` (primary) / `Keep original` (ghost).

**How to adapt**

* Use `Sheet` from shadcn for side panel.
* Use a simple diff lib or just highlight changed paragraphs with background.
* After accept, update editor content + show success toast “Revision applied”.

---

## 6. Dashboard → “Project board + scholarship twist”

**Inspo**

* Going Merry “Your Scholarships” tracking + filters. ([Going Merry][1])
* Linear / Jira-style project overview for status + progress.

**Patterns to copy**

* Top row: 3 small KPI cards:

  * “Tracked scholarships”, “Ready”, “In progress”.
* Main table/list:

  * Scholarship name + provider (link).
  * Deadline (with “X days left”).
  * Status badge (Not started / In progress / Ready / Submitted).
  * Readiness bar (`<Progress>`).
  * `Open` button.
* Right or bottom section: **“Low extra work suggestions”**:

  * 2–3 horizontal cards:

    * Title, amount, deadline,
    * Badge “Similar leadership essay”,
    * “Start plan” button.

**How to adapt**

* Use shadcn `Card` for KPI row and suggestions.
* Use a simple responsive `table` or list with stacked layout on mobile.
* Pull readiness from latest `essay_reviews` (as in your architecture docs).

---

## 7. What to actually build first (UI-wise)

Given your hackathon time:

1. **Nail Matches card + filters**
   That’s what judges see first; copy Going-Merry-esque layout but with your “workload” and demographic chips.

2. **Scholarship detail + sidebar**
   Make eligibility + “What they care about” crystal clear and pretty.

3. **Essay workspace + Rubric tab**
   Even just textarea + rubric list + “Grade” button will already feel amazing.


