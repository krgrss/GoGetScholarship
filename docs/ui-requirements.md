```markdown
# GoGetScholarship – UI Requirements

> **File:** `ui-requirements.md`  
> **Scope:** Concrete UI behavior, components, and states for the web app.  
> **Tech:** React + TanStack Start, shadcn/ui, Tailwind CSS.

---

## 1. Global UI Foundation

### 1.1 Layout & Grid

- App container:
  - `min-h-screen bg-[#FDF7EF] text-[#181220]`
  - Center main content using `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`.
- Layouts:
  - Single-column for small (`<md`).
  - 2-column layouts (content + sidebar) for detail and essay screens on `md+`.
- Header:
  - Sticky on scroll for desktop.
  - Contains logo, nav, user menu.
- Footer (optional for v1):
  - Small text-only: “GoGetScholarship – prototype”.

### 1.2 Colors & Tokens (guide, not strict)

- Background:
  - `bg-page`: `#FDF7EF`
  - `bg-surface`: `#FFFFFF`
- Text:
  - `text-main`: `#181220`
  - `text-muted`: `#6B6175`
- Accent:
  - `accent-primary`: `#3155FF`
  - `accent-secondary`: `#F6A623`
- Semantic:
  - `success`: `#2E7D32`
  - `warning`: `#FFB300`
  - `error`: `#D32F2F`

Use Tailwind utility classes or a Tailwind theme extension that maps to these.

### 1.3 Typography

- Heading font: editorial serif (e.g. Playfair Display / Fraunces).
- Body font: Inter or Source Sans 3.
- Sizes:
  - `h1`: 28–32px (`text-3xl md:text-4xl font-semibold`)
  - `h2`: 22–24px (`text-2xl font-semibold`)
  - `h3`: 18–20px (`text-xl font-semibold`)
  - Body: 14–16px (`text-sm md:text-base`)

All headings should use consistent margin bottom (`mb-3` or `mb-4`).

### 1.4 shadcn Components

Use shadcn for:

- `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`.
- `Card`, `Tabs`, `Dialog`, `Sheet`, `Badge`, `Progress`, `Skeleton`, `Toast`.
- Optional: `Popover`, `Calendar` (for date picking).

Buttons:

- Primary: solid accent blue.
- Secondary: outline or ghost.
- Destructive (rare): red.

---

## 2. Global Components & Patterns

### 2.1 App Shell & Header

**Component:** `<AppShell>`

- Top bar:
  - Left: Logo (simple wordmark “GoGetScholarship”).
  - Center (desktop): nav links:
    - `Matches`
    - `Dashboard`
  - Right: user avatar / initial + dropdown (`Profile`, `Sign out`).
- Mobile:
  - Brand on left, hamburger on right → opens `Sheet` with nav.

### 2.2 Buttons

- Variants:
  - `primary` (blue, solid, rounded-full or `rounded-lg`).
  - `secondary` (outline).
  - `ghost` (minimal).
  - `link` (text link style).
- Sizes:
  - Default, `sm`, `lg`.
- Loading:
  - Show spinner icon + disable button.
  - Keep label visible.

### 2.3 Chips / Badges

- Use `Badge` for:
  - Level (`Undergraduate`, `Graduate`).
  - Field tags (`STEM`, `Arts`, etc.).
  - Demographic focus (`Women in STEM`, `First-gen priority`).
  - Status (`Ready`, `In progress`, etc.).
- Color semantics:
  - Primary info: blue outline or filled.
  - Demographic: amber or subtle color-coded.
  - Status:
    - Ready: green.
    - In progress: blue.
    - Not started: gray.

### 2.4 Cards

- Base card:
  - `bg-white rounded-2xl shadow-sm border border-neutral-200/70`.
  - `p-4 sm:p-5`.
- Content:
  - Title (`h3`), optional subtitle, body, actions row at bottom.

### 2.5 Skeletons

- Use `Skeleton` for:
  - Scholarship card placeholder.
  - Detail page sections.
  - Editor area before essay loads.

### 2.6 Toasts

- Success: green left border, icon (`check`).
- Error: red left border, icon (`alert-triangle`).
- Auto-dismiss after 3–4 seconds, with pausing on hover.

---

## 3. Screen-Specific UI Requirements

### 3.1 Onboarding (`/onboarding`)

#### Layout

- Single central card (`max-w-xl`) with stepper at top:
  - Steps labels: `Basics`, `Background`, `About you`.
- Content sections:
  - `h1`: “Let’s get to know you”.
  - Step-specific fields.

#### Controls

- Controls by step:

  **Basics:**
  - `Select` for country.
  - `Select` for level of study.
  - `Input` text for major/program.
  - GPA:
    - `Input` for GPA numeric.
    - `Select` for scale (4.0, 4.3, 100, etc.).

  **Background (optional):**
  - `Checkbox` groups or `Tag` toggles for:
    - First-generation student,
    - Low-income background,
    - International student,
    - Disability,
    - LGBTQ+,
    - Race/ethnicity (multi-select).
  - Small text: “This is optional and only used to surface targeted opportunities.”

  **About you:**
  - `Textarea` (min 5 rows) with prompt text.
  - Optional file upload:
    - Use a dropzone-style box:
      - “Drop your résumé or activity list (PDF/DOC) or click to upload”.

#### Navigation

- Buttons at bottom:
  - `Back` (hidden on first step).
  - `Next` / `Continue`.
  - `Skip this step` (for optional screens).
- On final step:
  - `Save profile & see matches`.

#### States

- Disabled `Next` if required fields invalid on current step.
- Show loader in button when saving.

---

### 3.2 Matches List (`/matches`)

#### Layout

- Two-column on `lg+`:
  - Left sidebar (filters).
  - Right main area (results).
- `h1`: “Your scholarship matches”.
- Subtext: “Based on your profile and interests. Adjust filters to explore more.”

#### Filters (sidebar)

- `Select`:
  - Country/Region.
  - Level of study.
- `Multi-select`:
  - Fields of study (use tags or a searchable combo-box).
- `Workload`:
  - Toggle or chip group: `All`, `Light`, `Medium`, `Heavy`.
- Toggles:
  - `Checkbox`: “Hide scholarships I’m clearly ineligible for”.
  - `Checkbox`: “Highlight scholarships that prioritize my background”.

#### Scholarship Card UI

Each card (`<ScholarshipCard>`) shows:

- Top:
  - `h3` title.
  - Provider as `text-sm text-muted`.
- Middle rows:
  - **Amount:** e.g. “Up to CAD 80,000”.
  - **Deadline:** “Deadline: Oct 1, 2025 (45 days left)”.
  - **Tags row:**
    - Level, field tags as `Badge`.
    - Demographic chips (if any).
  - **Workload:** text or chip:
    - “Workload: 1 essay · 2 refs · transcript”.
- Bottom:
  - Left: subtle indicator if already tracking (“In progress” badge).
  - Right: `View details` (primary) and optional `Track` (secondary).

On hover (desktop):

- Card lifts slightly (`translate-y-[-2px] shadow-md`).
- Outline accent on border (`border-accent/40`).

#### States

- Loading: show 4–6 skeleton cards.
- Empty:
  - Simple message with icon:
    - “No scholarships match your current filters.”
    - Button: “Reset filters”.

---

### 3.3 Scholarship Detail (`/scholarships/:id`)

#### Layout

- 2-column (`md+`):

  - **Left:**
    - `h1` scholarship name.
    - Provider.
    - Amount + badge for frequency (e.g. “Renewable”).
    - Deadline chip.
    - “About this scholarship” section.
    - “Eligibility” section (bullet list).
    - Link: “View official page” (opens in new tab, external icon).

  - **Right:**
    - Card: “What they care about”
      - Themes chips.
      - Rubric criteria names + weight percentages.
    - Card: “Application components”
      - Checklist icons:
        - Essay icon (doc),
        - Ref icon (user),
        - Transcript icon (file-text),
        - Interview icon (mic).
    - Actions:
      - `Button` primary: “Start essay”.
      - `Button` secondary: “Plan this scholarship”.
      - `Button` ghost: “Why this fits you”.

#### “Why this fits you” UI

- On click:
  - Open `Dialog` titled “Why this fits you”.
  - Content:
    - Section: “Strengths” (2–3 bullet items).
    - Section: “Potential gaps or notes” (1–2 bullet items).
    - Small note: “Based on your profile and this scholarship’s criteria.”

---

### 3.4 Planner (inline in detail or sub-route)

#### Layout

- Card with title “Application plan”.
- Subtext: “These tasks are based on the requirements. Change dates as needed.”
- List items:
  - Checkbox + label + due date chip.
- Date editing:
  - Click due date → date picker in `Popover` or small inline editor.

---

### 3.5 Essay Workspace (Rubric-Aware)

#### Layout

- Top bar:
  - Scholarship name (left).
  - Word count (“312 / 500 words”) (right).
- Split view (desktop):

  - **Left panel:**
    - Prompt box:
      - `Card` with prompt text, word limit.
    - Editor:
      - `Textarea` or editor component, `min-h-[260px]`.
    - Action row:
      - `Button`: Generate outline.
      - `Button`: Draft from bullets.
      - `Button`: Rewrite for clarity.
      - Save indicator: small subtle text (“Saved · 2 min ago”).

  - **Right panel (Tabs):**
    - Tabs: `Rubric`, `Themes`.
    - Rubric tab:
      - List of criteria with weight.
      - Button at bottom: `Grade against rubric`.
    - Themes tab:
      - Chips for “Academics”, “Leadership”, “Research”.
      - Small explanation text.

#### Interactions

- Generate outline:
  - Opens `Dialog` asking:
    - “Use details from my profile?” (toggle).
    - If confirmed: show spinner inside button / dialog.
- Draft from bullets:
  - Inline `Textarea` for bullets above editor.
  - On generate, fill or append content.

---

### 3.6 Rubric Check & Revision UI

#### Rubric Grading

After grading:

- `Rubric` tab updates with:

  - For each criterion:
    - Row with:
      - Name (left).
      - Score chip (middle) e.g. “3/5”.
      - `Button sm`: “Improve this”.
      - Feedback line below small text.
  - Overall comment:
    - `Card` with label “Overall feedback”.

Readiness indicator:

- Simple badge or progress:
  - `needs_work` → red or orange.
  - `solid` → blue.
  - `ready` → green.

#### Revision Diff

On “Improve this”:

- Use a right-side `Sheet` (`<Sheet>` component):

  - Header:
    - Criterion name.
    - Short description or rubric snippet.
  - Body:
    - Two-column diff:
      - Left: “Current version”.
      - Right: “Suggested revision”.
      - Use simple diff highlighting (background highlight for changed text).
  - Footer:
    - `Button primary`: “Accept revision”.
    - `Button ghost`: “Keep original”.

After accept:

- Replace editor content.
- Optional toast: “Revision applied”.

---

### 3.7 Dashboard (`/dashboard`)

#### Layout

- `h1`: “Your applications”.
- Top stats:
  - 3 small cards:
    - Total tracked.
    - Ready.
    - In progress.
- Main table/list:

  Columns:

  - Scholarship name + provider.
  - Deadline.
  - Status badge.
  - Readiness meter (`<Progress>`).
  - `Button`: “Open”.

- “Low extra work” section:

  - Title: “Low extra work suggestions”.
  - 2–3 horizontally scrollable cards:
    - Display:
      - Scholarship name.
      - Note: “Similar prompt to [X]; same or lighter workload.”

#### Interactions

- Clicking “Open”:
  - Route to essay workspace if essay exists,
  - Else to detail page.

---

## 4. Interaction Details & Microinteractions

### 4.1 Hover & Focus

- Cards:
  - Slight lift: `transition-transform shadow`, `hover:-translate-y-0.5 hover:shadow-md`.
- Buttons:
  - Primary: darken background slightly on hover.
  - Use focus ring: `outline-none focus-visible:ring-2 focus-visible:ring-accent-primary`.

### 4.2 Transitions

- Keep transitions subtle:
  - `transition-all duration-150` on cards and buttons.
- Dialogs/Sheets:
  - Fade + slight slide in/out.
- Avoid heavy animations; respect `prefers-reduced-motion`.

---

## 5. Responsive Behavior

### `<md` (Mobile)

- Onboarding: single column, full width.
- Matches:
  - Filters collapse into `Sheet` triggered by “Filters” button.
  - Cards full width.
- Scholarship detail:
  - Stack: eligibility → components → actions.
  - “Why this fits you” still `Dialog`.
- Essay workspace:
  - Tabs for `Editor` and `Guidance`:
    - Show one at a time.
  - Rubric results appear below editor content with a collapse toggle.
- Dashboard:
  - List-view instead of table; each scholarship is a card.

### `md+` (Tablet / Desktop)

- Use sidebars where defined.
- Essay workspace uses side-by-side layout.

---

## 6. Error, Empty, and Edge States

### 6.1 Profile Missing

- If user hits `/matches` without profile:
  - Redirect to `/onboarding`.
  - Show toast: “Complete your profile to see personalized matches.”

### 6.2 No Rubric Available

- In essay workspace:
  - Rubric tab displays:
    - Neutral info box: “Rubric not configured yet. You can still draft and edit your essay here.”
  - `Grade against rubric` button disabled with tooltip.

### 6.3 AI Errors

- If `explain-fit`, `grade`, or `draft` fails:
  - Show toast:
    - “We couldn’t get help from the AI right now. Your work is safe – try again in a moment.”
  - Keep current text untouched.

---

## 7. Component Naming (Suggestion)

For consistency, suggested component names:

- `AppShell`, `MainLayout`
- `OnboardingWizard`, `OnboardingStepBasics`, `OnboardingStepBackground`, `OnboardingStepAbout`
- `MatchesPage`, `MatchesFilters`, `ScholarshipCard`
- `ScholarshipDetailPage`, `ScholarshipSidebar`, `WhyFitDialog`
- `ApplicationPlanner`, `TaskList`, `TaskItem`
- `EssayWorkspace`, `EssayEditor`, `GuidancePanel`, `RubricTab`, `ThemesTab`
- `RubricResults`, `CriterionRow`, `RevisionSheet`
- `DashboardPage`, `ApplicationRow`, `LowEffortSuggestions`

These don’t have to be followed exactly, but keeping similar naming helps.

---

## 8. Core vs Stretch UI

**Core:**

- Onboarding wizard with 3 steps.
- Matches list with filter panel + decent card layout.
- Scholarship detail with sidebar and actions.
- Basic planner list.
- Essay workspace with tabs (Rubric/Themes).
- Rubric check UI (scores, feedback, single revision sheet).
- Dashboard with status and readiness.

**Stretch:**

- Draggable tasks in planner.
- Per-criterion inline comments in the editor.
- Saved essay templates/snippets UI.
- Dark mode toggle.

---
```
