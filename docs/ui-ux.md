# GoGetScholarship UI/UX Spec (v2)
## Scholarship Detail Page + Onboarding Wizard  
### With extra surfaces to **show off AI / RAG / backend capabilities**

This is an updated, more detailed spec that:

- Keeps everything from the previous version (layout, flows).
- Adds **explicit UI surfaces** that:
  - Expose the **pipeline** (ingest → embed → match → personality → draft → grade).
  - Make RAG + LangGraph-style orchestration **visible** but not overwhelming.
  - Tie directly into the **short-term plan** and **hackathon to-dos** (`plan.md`, `to-dos.md`).

Guiding UX principles:

- **Hick’s Law** – keep visible choices small; hide advanced controls behind taps/clicks.
- **Fitts’s Law** – big, easy primary buttons at consistent positions.
- **Law of Proximity** – facts vs AI insights clearly separated.
- **Progressive Disclosure** – basic users see only what they need; judges can dig deeper.
- **Aesthetic–Usability** – clean, confident UI increases trust in AI.
- **Nielsen heuristics** – visibility of system status, feedback, recognition.

---

## 1. Scholarship Detail Page (`/scholarship/$id`)

### 1.1 Layout & “AI Pipeline Strip”

**Goal:** Make it obvious that this page is powered by a **full AI pipeline**, not a static detail view.

#### Base layout (same as v1)

- Container: `max-w-6xl mx-auto py-8 px-4`
- Grid:  
  `grid md:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-6`
- Right column sticky: `md:sticky md:top-20`

**Columns:**

- Left: factual info
- Right: AI coaching & actions

#### NEW: “AI pipeline strip” under the header

Right under the title/info pills, add a **horizontal pipeline strip**:

> `Profile ✅  →  Match ✅  →  Personality ✅  →  Draft ✴  →  Grade ✴`

- Each step is a **small pill** with icon + label.
- States:
  - ✅ (green): step completed for this user/scholarship
  - ✴ (blue): step available (click to activate)
  - ⚠️ (amber): AI error for this step

**Interactions (for judges):**

- Hover/tooltip on each pill:
  - `Profile` → “Loaded from /api/profile via studentId”
  - `Match` → “Ranked via /api/match + /api/rerank with embeddings”
  - `Personality` → “Personality profile cached from /api/personality”
  - `Draft` → “Essay workspace connected to /api/draft”
  - `Grade` → “Rubric grading from /api/grade-essay`

- Clicking “Personality” scrolls to “What they care about”.
- Clicking “Draft” scrolls to Essay workspace.
- Clicking “Grade” scrolls to rubric self-grading panel.

> **UX:** High signal for judges; students see a friendly strip that explains “what’s happening under the hood” without reading docs.

---

### 1.2 Header – Info Pills (same, but more explicit)

Under the title + provider:

- `CAD 3,000–5,000 • Annual`
- `Deadline: Mar 1, 2025` / `No deadline listed`
- `Workload: 1 essay • 1 ref • 1 transcript`
- `Match 82 • High fit`

NEW microcopy under the pill row:

> `Using your saved profile + embeddings to rank this scholarship.`

(Softly advertises RAG/embeddings on every scholarship.)

---

### 1.3 Left Column – Factual Content (with AI transparency hooks)

#### 1.3.1 About Section (as before, plus “Sources used” drawer)

**Title:** `About this scholarship`

Below the summary, add a **“Sources used”** inline link:

- Clicking opens a small **bottom drawer** on the card:

  - `Official website` (if URL present)
  - `Curated description` (internal data)
  - `Winner stories` (if any; just counts, e.g., “3 public winner stories analyzed”)

Each item has a short label:

- “Used for: description only”
- “Used for: personality + themes”
- “Used for: examples (no text copied)”

> **This is your visible RAG transparency**: judges can see that you’ve ingested & classified data, not just scraped blindly.

---

#### 1.3.2 Eligibility & Focus – “You vs requirements” (v1, but add chips & explanation link)

Keep the comparison view:

> **You meet 4 of 5 core requirements.**

NEW: add a tiny `How we checked this` link at top-right of the card:

- Opens tooltip or drawer:

  - “Compared scholarship eligibility fields against your profile from `/api/profile`.”
  - “We never guess; only compare against fields you filled.”

Each sub-section (Academic / Geographic / Demographic) now also has:

- A **summary chip** above its rows:

  - Academic: `Strong match`
  - Geographic: `Exact match`
  - Demographic: `Optional / Not required`

> **For judges**, this shows that your matching logic has structured reasoning, not just fuzzy “sounds similar”.

---

#### 1.3.3 Past Winners & Patterns (v1, plus “Patterns mined” view)

Keep:

- 1–3 small “winner cards” with story blurbs.

Add a **tabbed micro-view** inside the panel:

- Tabs: `Examples` | `Patterns`
- Default: `Examples`
- `Patterns` tab shows:

  - 3–4 **pattern chips** with mini bars, e.g.:

    - “Leadership + initiative” – █████ 5/6 winners
    - “Overcoming hardship” – ████ 4/6 winners
    - “STEM project impact” – ███ 3/6 winners

- Small footnote:  
  > “Patterns extracted by AI from public winner stories.”

This shows off the **pattern-mining / LangGraph summarization** as a user-facing feature.

---

### 1.4 Right Sidebar – AI Coaching & Actions (more explicit)

#### 1.4.1 “What They Care About” (v1, plus tone & writing style)

Existing:

- weighted criteria list
- core theme chips

Add two extra rows at the bottom:

1. **Tone guide** (from personality profile):

   - `Tone: Warm · Reflective · Evidence-based`

2. **Writing focus:**

   - `Emphasize: concrete impact, quantifying results, personal growth`

These come from `/api/personality` for the scholarship and will be **re-used in the essay draft prompts**, so you can say in demo:

> “Notice how this same tone and writing focus show up in the generated essay.”

---

#### 1.4.2 “Why This Fits You” – Extra debug for judges

Keep v1 card and modal.

Add a **“See the JSON” toggle** *only inside the modal*, behind a small `For judges` link:

- When clicked, show a **read-only JSON viewer** of the explanation graph output on the right side:
  - Collapsed by default.
  - Sticks to ~30–40% width.

This proves to judges:

- You have a structured ExplainFit output (strengths, gaps, confidence, fields used).
- UI mapping from JSON → bullets is clean and robust.

> Law of Progressive Disclosure: normal students never have to open this.

---

#### 1.4.3 Application Components & Workload – tie into planner and “Low extra work”

Same as v1, plus:

- Each component has a small icon showing its **reuse level**:

  - `Reuses 80% of your generic STEM essay` (based on similarity to existing essays).
  - `New` if no obvious reuse.

- Tooltip on `Workload: Medium`:

  > “Estimated total time based on similar applications and your existing drafts.”

This makes the **“Low extra work”** logic visible on a per-scholarship basis.

---

#### 1.4.4 Plan & Draft Card – connect to Dashboard & Matches

Same buttons as v1:

- `Plan this scholarship` (primary)
- `Start essay workspace` (secondary)
- `(optional) View winner examples`

Add a small **timeline list** below the buttons:

1. `Create plan on Dashboard`
2. `Draft essay with AI coach`
3. `Grade against rubric`
4. `Revise weak criteria`
5. `Check Low extra work options`

Each item gets a checkmark once completed for this scholarship. That shows:

- Your **planner**, **RubricCoach**, and **Low extra work** suggestions are all part of the same pipeline, not isolated features.

---

### 1.5 Essay Workspace Section (on the same page, scrollable)

Below the main two-column layout (or as part of the right column expanded), add an **inline workspace**:

#### 1.5.1 Prompt & Instructions

- Show the **exact prompt** pulled from the scholarship (from components).
- Highlight the key criteria as inline chips:

  - `Leadership`
  - `Impact`
  - `Financial need`

These chips are clickable filters in the rubric panel.

#### 1.5.2 Editor Panel

- Rubric-aware text area with:

  - Word count
  - Small indicator: `AI-safe: We don't send your name/email to the model.`

#### 1.5.3 AI actions row (showing off pipeline)

Buttons (left → right):

1. `Generate tailored draft`  
   - Calls `/api/draft`, using:
     - Scholarship personality
     - Student summary
     - Prompt & rubrics
   - On success, **badge** appears above draft:

     > `Draft generated using: your profile, this scholarship's themes, and rubric criteria.`

2. `Grade against rubric`  
   - Calls `/api/grade-essay`.
   - Shows a **rubric table** below:

     - Criteria rows with scores (1–5), color-coded.
     - A **“Rubric delta”** chip if they previously graded a generic essay.

3. `Revise weakest criterion`  
   - Lets user pick weakest row (or auto-select lowest).
   - Calls a RubricCoach endpoint to return a revised paragraph.
   - Show diff (old vs revised) with accept/reject buttons.

> This is the **RubricCoach Revise Loop** you wanted in to-dos, surfaced in a very visible UX.

---

### 1.6 Showcase: Compare Essays (Optional “demo mode” panel)

If time allows, under the workspace add a collapsible panel:

**Title:** `Compare generic vs tailored essay`

- Two columns: Generic | Tailored
- Each shows:
  - Essay text (scrollable)
  - Rubric scores & a small bar showing total score.

Underneath, a summary:

> `Tailored essay improved your rubric score from 14 → 19 (+5), especially on "Alignment with values" and "Specific examples".`

This directly visualizes:

- **Evaluation metrics** (“Improves essays”) from `evaluation-metrics.md`.
- That your system **does measurable work**, not just “sounds good”.

---

### 1.7 Micro-UX States (Scholarship Detail)

- **AI busy state:** when any AI call runs, show:
  - Local spinner on button.
  - Optional status line at top of right sidebar:
    - `Talking to our AI coach…`
- **AI error state:** friendly inline message in the affected card:
  - `We couldn’t get help from the AI right now. Your work is safe – you can try again later.`
- **Judge switch:** optionally a global “Show advanced debug” toggle (top-right of page) that reveals:
  - JSON viewer sections
  - Extra pipeline info text

---

## 2. Onboarding Wizard (`/onboarding`)

Goal: **Feed the pipeline** with rich, structured + free-text profile data and **visually show** how it’s used.

### 2.1 Shared Wizard Layout (same as v1, but with “Live impact” strip)

- Card layout & stepper unchanged:
  - `Basics  •  Background  •  About you  •  Finish`
- Add a small **“Live impact” strip** at top-right of the card:

  > `Estimated matches unlocked: 0` (Step 1)  
  > `… 12` (after basics)  
  > `… 18` (after background)  
  > `… 22` (after about you)

Simple heuristic:

- On each step, after user fills/changes fields:
  - Call a light `/api/match-preview` with partial profile, or
  - Locally show: `+X potential matches` (hard-coded for demo profiles).

This shows judges:

- Each answer **actually influences** the downstream matching.

---

### 2.2 Step 1 – Basics: Where Are You Studying?

Same structure, plus:

- Under helper text, add small “What this affects” line:

  > `We’ll use this to filter out countries you can’t apply in, and prioritize location-based awards.`

This ties step → pipeline in user’s mind.

---

### 2.3 Step 2 – Basics: Academic Details

Same as v1, with extra copy:

- Under GPA:

  > `Some scholarships have minimum GPA cutoffs; we’ll quietly remove those you can’t apply to.`

Again, tying field → eligibility filtering.

---

### 2.4 Step 3 – Background (with Gender & Identity)

Use the detailed Step 3 spec we wrote (family & income, gender, identity), plus:

Under the section header:

> `Optional: used only to match you with identity-based scholarships (e.g. women in STEM, LGBTQ+ awards). It never lowers your match score – it only helps.`

This explicitly demonstrates **demographic transparency** (a key judge story).

---

### 2.5 Step 4 – About You & Your Story (Now with live AI preview)

**Title:** `About you & your story`

Under the textarea, add two AI-heavy UI elements.

#### 2.5.1 “Start from bullet points” (as before, but more explicit)

- Button: `Start from bullet points`
- Microcopy:

  > `We’ll turn a few bullet points into a short profile summary for you.`

After they generate the summary:

- Show a small banner over the textarea:

  > `Generated by AI – you can edit anything before saving.`

This shows off **AI-assisted onboarding**, not just AI later.

#### 2.5.2 Live profile themes preview

Right side of the card (desktop) or under textarea (mobile):

**Card: “How our AI sees you”**

- Title: `How our AI sees you`
- Content:

  - 3–5 chips with weights:

    - `Leadership (High)`
    - `STEM projects (Medium)`
    - `Community service (High)`
    - `Financial need story (Low)`

  - One-sentence summary:

    > `We’ll look for scholarships that value leadership and STEM projects, and we’ll coach your essays to highlight those.`

On each change to textarea (with debounce), call a local function or `/api/profile-preview` to update themes. This shows:

- Your **profile extractor** is working.
- Judges can see **exactly what signal** you send downstream to matching + drafting.

---

### 2.6 Finish / Confirmation Screen – Make the pipeline explicit

After saving profile:

Card content:

- Title: `Profile saved`
- Body:

  - `We’ve found 22 scholarships that look like a strong fit for you.`
  - **Pipeline explanation line:**

    > `Next: we’ll use your profile to rank scholarships, analyze their personality, and coach your essays with rubrics.`

- Primary button: `View my matches`
- Secondary: `Edit profile again` (optional)

This is where you can say, in demo:

> “Notice how after finishing onboarding, we immediately have your embeddings, summary, and structured fields – that’s what powers the rest of the app.”

---

### 2.7 UX & Error States (Onboarding)

- **Profile save (critical bug)**:
  - Ensure `Save & see my matches` calls `/api/profile` (no fake delay).
  - On failure:
    - Inline error at top.
    - Toast: `We couldn’t save your profile. Please check your connection and try again.`
  - Do **not** navigate to Matches if save failed.

- **AI helper failure** on Step 4:
  - Keep the user’s text/bullets intact.
  - Show a small message under the button:
    - `AI helper is temporarily unavailable; you can continue writing manually.`

---

### 2.8 Optional “For judges: show raw profile” toggle

On the confirmation screen or Matches page, add a tiny link:

> `For judges: view raw profile JSON`

- Opens a modal with:
  - `student_profile` fields
  - `student_summary`
  - `student_embedding` dimension count (but not the vector itself)

This directly shows:

- You’ve implemented the **documented profile schema**.
- The system is ready for more advanced LangGraph orchestration later.

---

## 3. Quick Demo Script (how to talk through these screens)

Use this as a talk track when judges are looking at these two areas:

1. **Onboarding Step 4:**
   - “As you type your story, we’re extracting themes in real time (‘How our AI sees you’). These themes + your structured fields are what we feed into `/api/match` and `/api/draft`.”
2. **Finish screen:**
   - “Now that your profile is saved, we assign you a studentId and store embeddings so all downstream APIs know who you are.”
3. **Scholarship Detail header:**
   - “This pipeline strip shows exactly which parts of our LangGraph-style flow have run: profile, matching, personality, drafting, grading.”
4. **Right sidebar on scholarship page:**
   - “Here, we’ve analyzed what this scholarship cares about, and we can explain why it fits you – both in natural language and raw JSON for you as judges.”
5. **Essay workspace:**
   - “We don’t just generate an essay – we grade it against a rubric, show where it’s weak, and let you run a targeted revise loop. Compare generic vs tailored essays and see the rubric delta.”

That’s how the UI **visibly proves** the capabilities you’ve built.

---
