
Deliverable 2 – Design System & Tokens
Color Tokens (Tailwind theme): We define semantic color names that map to Tailwind and Shadcn
conventions:
- page-bg : #FDF7EF (off-white background)
- surface : #FFFFFF (card/panel background)
- text-main : #181220 (primary text)
- text-muted : #6B6175 (secondary text)
- primary : #3155FF (brand blue accent)
- primary-foreground : #FFFFFF (text on primary buttons)
- secondary : #F6A623 (amber accent)
- secondary-foreground : #181220
- Semantic: success: #2E7D32 (green), warning: #FFB300 (amber), error: #D32F2F (red) .
Typography:
- Fonts: Define fontDisplay : Playfair Display or Fraunces (serif) for headings, and fontSans : Inter
(sans-serif) for body .
- Sizes: Use a modular scale. E.g. h1 ~2.5rem (40px) , h2 ~2rem , h3 ~1.25rem . Body text at
1rem (16px) with text-sm on smaller screens. Ensure consistent line-height and margin-bottom
on headings (e.g. mb-3 ).
Spacing & Layout: Use a spacing scale (Tailwind’s default: 4px * 1,2,3...). For components:
- Default container padding: px-4 sm:px-6 lg:px-8 .
- Gaps between sections: gap-6 or gap-8 .
- Consistent padding inside cards/forms (e.g. p-4 to p-6 ).
Radii & Shadows:
- Border radius tokens: e.g. rounded-md for small buttons/inputs, rounded-lg for larger elements,
rounded-2xl for cards/surfaces .
- Shadows: default shadow-sm ( shadow-sm ) on cards, shadow-md on hover . Focus ring uses
ring-2 ring-offset-2 .
Motion: Define timing tokens (e.g. motion-duration:150ms , ease-out ) for subtle animations. All
interactive transitions should use these. For example, cards use transition-all duration-150 on
hover . Dialogs/Sheets fade + slide in (e.g. ease-in-out , 200ms ). Honor prefers-reduced-
motion .
Tailwind Config Example: In tailwind.config.js , extend theme colors and fonts:
// tailwind.config.js
module.exports = {
theme: {
extend: {
colors: {
'page': '#FDF7EF',
2
22
2
22
2
2
23
2 24
25
3
26
27
4
'card': '#FFFFFF',
'primary': '#3155FF',
'accent': '#3155FF',
'accent-foreground': '#FFFFFF',
'secondary': '#F6A623',
'secondary-foreground': '#181220',
'muted': '#6B6175',
'border': '#E0E0E0',
'success': '#2E7D32',
'warning': '#FFB300',
'error': '#D32F2F',
},
fontFamily: {
display: ['Playfair Display', 'serif'],
sans: ['Inter', 'sans-serif'],
},
borderRadius: {
lg: '1rem',
xl: '1.5rem',
},
spacing: {
'9': '2.25rem',
'11': '2.75rem',
},
// (Extend shadows, transition timing as needed)
},
},
}
This aligns Tailwind’s theme with the tokens above, enabling usage like bg-page , text-primary ,
font-display , etc. Shadcn’s useTheme() can also reference these aliases.
Deliverable 3 – Component Inventory & MCP Mapping
Layout & Navigation
<AppShell> / Header: Custom component wrapping each page. It contains the logo (wordmark
GoGetScholarship), desktop nav links ( Matches , Dashboard ), and a user menu. On mobile, hide
links behind a hamburger triggering a <Sheet> (side drawer). States: Sticky header on scroll,
mobile menu slide-in.
// Example: Header component
<header className="sticky top-0 z-50 bg-page p-4 shadow-sm">
<div className="mx-auto flex items-center justify-between max-w-6xl">
<Link to="/" className="font-display text-xl">GoGetScholarship</Link>
<nav className="hidden md:flex space-x-4">
•
5
<Link to="/matches" className="text-sm font-medium text-
foreground">Matches</Link>
<Link to="/dashboard" className="text-sm font-medium text-
foreground">Dashboard</Link>
</nav>
<div className="md:hidden">
{/* Hamburger icon triggers mobile menu sheet */}
</div>
<UserMenu /> {/* Avatar + dropdown */}
</div>
</header>
Footer: A simple text footer ( GoGetScholarship – prototype ) if needed (per UI guide) with
muted styling.
Data Display
ScholarshipCard: For lists (matches, dashboard rows) – use Shadcn <Card> or a div with
rounded-xl bg-card shadow-sm . Contains: Title ( h3.font-display ), sponsor (small muted
text), amount (badge style), deadline (with icon), tags row of badges (level, fields) and demographic
chips (amber accent) . Example snippet:
<div className="group rounded-xl bg-card p-4 shadow-sm ring-1 ring-border
transition hover:-translate-y-0.5 hover:ring-primary/50">
<h2 className="font-display text-base">{scholarship.name}</h2>
<p className="text-xs text-muted">{scholarship.provider}</p>
<div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
{scholarship.levelTags.map(tag => (
<Badge key={tag} variant="outline">{tag}</Badge>
))}
{scholarship.fieldTags.map(tag => (
<Badge key={tag} variant="filled">{tag}</Badge>
))}
{scholarship.demographicTags.map(tag => (
<Badge key={tag} variant="secondary">{tag}</Badge>
))}
</div>
<div className="mt-2 flex justify-between items-center text-xs text-
muted">
<span>Workload: {scholarship.workload}</span>
<Button size="sm" variant="primary">View details</Button>
</div>
</div>
Here <Badge> and <Button> are Shadcn components; the layout matches the UI spec .
•
•
8 28
8
6
Statistics / Dashboard Cards: Small stat cards for totals (tracked, ready, in-progress) use rounded-
lg bg-card p-4 shadow and numeric display. These can use Shadcn <Card> or <Statistic>
pattern.
Table/List: For the dashboard main list, a simple <table> or flex list with rows of applications.
Could use MUI <DataGrid> for quick implementation, but a custom list (divs) is fine given
complexity. Ensure header row is sticky if long.
Forms & Inputs
Inputs/Selects/Textareas: Use Shadcn <Input> , <Select> , <Textarea> , <Checkbox> ,
<RadioGroup> . Style: rounded-full or -lg, subtle border. Example:
<label className="text-xs font-medium text-muted">Field of Study</label>
<Select className="w-full" options={fieldOptions} placeholder="Search
fields..." />
Checkbox/Toggle: For boolean filters. Use <Checkbox> or styled <input type="checkbox">
with label; ensure label clickable.
Button Variants:
primary : solid accent (bg-primary, text-white, rounded-full ) .
secondary : outline ( border-primary text-primary ).
ghost/link : minimal text style (blue underline for links).
Show a spinner icon on loading states.
Feedback & Utility
Toasts: Use Shadcn <Toast> for success/error messages. E.g. green header with check icon or red
with alert icon, auto-dismiss after 3s . Copy should be friendly (see States below).
Skeletons: Shadcn <Skeleton> component for loading placeholders . For example, skeleton
cards on /matches and grey blocks for detail sections before data loads.
Dialog/Sheet: Use <Dialog> for modal overlays (“Why this fits you”), and <Sheet> (side drawer)
for mobile menus or the revision panel (rubric improvements) . E.g.:
<Dialog open={openExplain} onOpenChange={setOpenExplain}>
<DialogContent>
<DialogTitle>Why this fits you</DialogTitle>
<ul className="mt-2 list-disc list-inside text-sm">
<li>Strength: Your GPA meets the scholarship’s requirement</li>
<li>Note: Needs stronger leadership examples.</li>
</ul>
</DialogContent>
</Dialog>
Chips/Badges: Shadcn <Badge> for the small tag-like info. Use variant="outline" or color
props to match meaning (blue for general, amber for demographics, green for “Ready”). For
•
•
•
5
•
•
• 29
•
•
•
30
• 31
•
16
•
7
example, an “In progress” status badge could be
<Badge variant="secondary">In Progress</Badge> .
Progress & Loaders: Shadcn <Progress> for readiness meter (dashboard) and spinners inside
buttons or dialogs.
Editor & AI Assist
Essay Editor: A full-width <Textarea> or rich text editor (like TipTap or Editor.js) for the essay
content. Show a prompt header above it. Save status indicator (e.g. “Saved • 2 min ago”) can be a tiny
badge or text element. Example:
<div className="flex flex-col">
<label className="text-sm font-semibold">Prompt (500 words max)</label>
<Textarea className="min-h-[260px]" placeholder="Start writing..."
value={essay} onChange={...} />
<div className="mt-2 flex items-center justify-between text-[11px] text-
muted">
<button type="button">Generate outline</button>
<span>Saved · 1 min ago</span>
</div>
</div>
AI Assist Actions: Buttons like “Generate outline”, “Draft from bullets”, “Rewrite” trigger API calls. If a
feature requires extra input (e.g. bullets), show a small inline form or modal before calling the API.
Rubric/Revision UI: After grading, the “Rubric” tab is a table of criteria (e.g. “Leadership – 3/5”) .
Each row has an “Improve” button opening a right-side sheet: a diff view (two columns of text). We
can create a <RevisionSheet> component with two <pre> blocks side-by-side. Example stub:
<div className="flex gap-2 text-[11px] leading-snug">
<pre className="w-1/2 bg-muted/10 p-2 rounded">Original paragraph
text...</pre>
<pre className="w-1/2 bg-muted/10 p-2 rounded bg-accent/10">Suggested
revised text...</pre>
</div>
<div className="mt-2 flex justify-end gap-2">
<Button variant="primary">Accept revision</Button>
<Button variant="ghost">Keep original</Button>
</div>
AI Loading/Error States: Use inline spinners (button <Spinner> ) and disallow interaction while
waiting.
32
•
•
•
• 33
•
8
Deliverable 4 – Layout & Responsive Patterns
Onboarding Wizard ( /onboarding )
Desktop: A single centered card ( max-w-xl mx-auto ) with a horizontal stepper at the top
showing “Basics – Background – About You” . Each step’s fields are inside the card with ample
padding. The card uses rounded-2xl bg-card shadow-sm . Primary CTA (“Continue”/“Save &
See Matches”) is at the bottom in a button row.
Mobile (<md): Full-width stack. The stepper can wrap or convert to a vertical list. Buttons remain
fixed at bottom if needed. (UI note: mobile layout is single-column by default.)
Matches List ( /matches )
Desktop ( lg+ ): Two-column layout. Left sidebar ( w-[260px] bg-card p-4 shadow-sm ) holds
filter controls . Right main area ( flex-1 ) has the title and a grid of scholarship cards .
Mobile (<lg): Collapse filters into a toggled <Sheet> panel (triggered by a “Filters” button) .
Scholarship cards span full width ( mx-auto max-w-md ).
Scholarship Detail + Sidebar ( /scholarship/:id )
Desktop ( md+ ): Two-column layout . Left column (≈60%) is the main content: scholarship title,
provider, amount, deadline, eligibility (e.g. country, level) and full description . Right column
(≈40%) is a sticky sidebar with “What they care about” (themes & weights) and “Application
components” checklists . Action buttons (“Start essay”, “Plan”, “Why fits”) float at bottom or fixed
in the sidebar.
Mobile: Stack all sections vertically. Title → provider → summary → eligibility → components →
actions. “Why this fits” still appears in a dialog overlay. The draft generation section becomes full-
width under the detail, with the student summary form and resulting draft below.
Essay Drafting Split View ( /scholarship/:id/essay )
Desktop ( md+ ): Fixed top bar (scholarship name, prompt, word limit, word count indicator). Below,
a split view: left panel (2/3 width) for the essay editor (prompt at top, then <Textarea> and action
buttons), right panel (1/3 width) with two tabs . The “Rubric” tab lists criteria with scores and
“Improve” buttons ; the “Themes” tab shows theme chips. The side panel is sticky so it remains
visible during scroll.
Tablet: Similar split or stacked if space is tight; ensure word count and edit buttons are always
visible.
Mobile: Use a tabbed approach . Show either Editor or Guidance (Rubric/Themes) at one time.
The rubric results (if graded) appear below the editor, collapsible. Buttons like “Grade rubric” and
“Improve this” are full-width.
Dashboard Summary ( /dashboard or homepage)
Desktop: Page title “Your applications” at top. A row of stat cards (Total Tracked, Ready, In Progress)
beneath it . Below, a table or list of tracked scholarships with columns: Scholarship (name +
sponsor), Deadline, Status badge, Readiness meter, and an “Open” button .
•
6
34
•
•
35 36
• 37
• 38
39
40
•
•
11
41
•
• 42
•
43
44
9
Lower Section: “Low extra work suggestions” as a horizontally scrollable card list ; on desktop
show 3 cards in view with arrow navigation.
Mobile: Collapse stat cards into a vertical stack. Show tracked scholarships as a vertical list of cards
instead of a table . Suggestion cards stack or allow swipe.
Breakpoints: We use Tailwind’s mobile-first breakpoints: up to sm = stacked layouts, md (≥768px) for
two-column detail & essay split, lg (≥1024px) for filters sidebar. Headings/tabs scale up at sm / md as
needed . Sticky elements: main header stays on scroll, the essay sidebar is sticky top-20 on
desktop, and the “Next best action” card on the home page is fixed width on large screens.
Deliverable 5 – States (Empty, Loading, Error)
Profile Input (Onboarding):
Loading: Disable inputs and show a spinner inside the “Save” button when submitting. Use subtle
overlay or skeleton for the form card if profiling data is being fetched.
Error: Inline error text near the field or at top (“Please fill in at least your country and level.” as in the
code ). Use a red text color ( text-destructive ). A toast (“Failed to save profile. Please try
again.”) can appear on network failures.
Empty (skipped): On optional steps, show a note (“You can skip this step. Your profile is still usable
without it.”) as in the UI guide .
Matches List:
Loading: Show 4–6 skeleton cards in place of results (e.g. <Skeleton> for each card’s title, text,
and tags). Disable filters while loading.
Empty (no matches): Display a centered message with an icon: “No scholarships match your current
filters.” and a “Reset filters” button . This mirrors the UI spec. Tone is explanatory, not blaming:
e.g. “Oops, no results for that combination. Try changing the filters.”
Error: If the match API fails, show a full-width alert box above the list: “We couldn’t load your matches
right now. Please refresh or try again.” Include a retry button that refetches (using a <Toast> or
inline banner).
Scholarship Detail:
Loading: Show skeleton blocks for each section (title bar, eligibility list, “What they care” card) .
Empty: If a scholarship has no personality/rubric data yet, show an info box: “Rubric not configured
for this scholarship yet.” and disable “Grade essay” . (Copy example: “You can still draft your
essay, but no rubric is available yet.”)
Error: Inline alert ( bg-error/10 text-error ) with message from server (e.g. “Failed to load
scholarship details.”) and a “Back to matches” link. For AI operations: on draft or explain-fit failure,
show a toast: “We couldn’t get help from the AI right now. Your work is safe – try again in a
moment.” . This reassures the user.
Essay Workspace:
• 45
•
46
47 37
•
•
•
48
•
49
•
• 31
•
50
•
•
• 31
•
51
•
52
•
10
Loading: While generating a draft or outline, disable the form and show a spinner in the “Generate
draft” button. For autosave, show “Saving...” status.
Empty Draft: Initially (no draft yet), show placeholder text in the draft panel: “Your draft will appear
here once generated. You can copy it into your editor.” (As in the current UI example .) Use a
muted font.
Error: If draft API fails, display a small red text under the button: e.g. “Sorry, the AI failed to write a
draft. Please try again.” Keep the user’s input intact.
Global Errors: For any persistent issue, use a toast or modal summarizing the problem (“Network
error, try refreshing”) rather than leaving blank areas.
All error/empty states should use the brand voice: helpful, not accusatory. Use icons (alert-triangle for
errors, neutral folder/search icon for empty) and maintain the same card/grid layout.
Deliverable 6 – Accessibility & Motion Guidelines
Keyboard Navigation: Ensure all interactive elements are keyboard-accessible. Use
tabindex="0" on custom elements and proper HTML form controls. The tab order should follow
the visual order (e.g. form inputs in sequence, filters then content). Test that dropdowns/sheets can
open via keyboard (Enter/Space) and close with Esc.
Focus States: Every focusable component must have a visible focus ring. Tailwind’s focus-
visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none has been
used (see code) . Check that the ring contrast is clear against backgrounds. For example, primary
buttons get an accent-blue ring; card links get an underline or outline.
Contrast: Use WCAG AA contrast or better. Our text colors (#181220 on #FDF7EF ~ 16:1) are very
high contrast. Ensure any accent/disabled text (e.g. #6B6175 on white) is ≥4.5:1. Buttons and
badges should meet contrast rules (e.g. white text on #3155FF is good). Use tools to verify all key
text pairs.
Reduced Motion: For motion guidelines: keep animations subtle (150–200ms) and provide no-
critical animations only. As in our spec , cards and buttons use transition-all
duration-150 . Dialogs/Sheets fade/slide on open (avoid long/easing loops). Always respect
prefers-reduced-motion : disable or simplify animations if the user has that setting on.
ARIA & Labels: Use ARIA labels where needed (e.g. icon buttons like <CalendarDays> should have
aria-label="Deadline" ). All form fields have <label> elements. For dynamic content (like
toasts), use role="status" or alert with appropriate aria-live .
Motion Severity: No fast or large movements. Hover lifts ( hover:-translate-y-0.5 ) are
minimal. Avoid layout shifts (reserve space for spinners/loading to prevent jank). Test with reduced
motion on to ensure usability.
•
•
53
•
•
•
•
21
•
•
27
•
•
11
Deliverable 7 – Implementation Roadmap
We propose a two-phase rollout following the Core vs Stretch classification . Below are tasks with
rough difficulty (1=easy, 5=hard) and UX impact (1=low, 5=high):
Phase 1 (Core Builds):
Onboarding Wizard (V1): Difficulty 2, Impact 5. Complete /onboarding route implementation with
all steps, validation, and API save. (Files: src/routes/onboarding.tsx .)
Matches Page & Filters: Difficulty 3, Impact 5. Build filter sidebar (country, level, fields, toggles) and
scholarship card grid. Wire up API calls or mock data. (Files: src/routes/matches.tsx , plus a
<ScholarshipCard> component.)
Scholarship Detail View: Difficulty 4, Impact 5. Implement /scholarship/:id details layout (two-
column) with about and eligibility sections . Include “Application components” checklist and
action buttons. (Files: src/routes/scholarship/$id.tsx .)
Essay Workspace (Drafting): Difficulty 4, Impact 5. Under detail page (or a sub-route/tab), add the
essay editor split-view with prompt, textarea, and AI controls . Implement draft generation form
and display area (with explanation text). (May split into EssayWorkspace.tsx or similar.)
Basic Planner (Task List): Difficulty 3, Impact 4. Inline in the detail page (or modal), list tasks derived
from requirements. Use checkboxes and date pickers. (Files: possibly a new ApplicationPlan.tsx
and updates to $id.tsx .)
Dashboard Page: Difficulty 3, Impact 4. Route /dashboard showing stats cards and list of tracked
apps. Implement the “Low extra work” suggestions row (horizontally scrollable). (Files: src/routes/
dashboard.tsx or reuse index.tsx .)
Global Layout: Difficulty 2, Impact 5. Create an AppShell component with header/nav that wraps
all pages. Ensure mobile menu (Sheet) and user profile menu are functional. (Files: src/
AppShell.tsx , modify root route layout.)
Phase 2 (Polish & Stretch):
“Why This Fits” Dialog: Difficulty 3, Impact 4. In detail page, add a Dialog (triggered by a button)
showing AI-explained fit bullet points . Call /api/scholarships/:id/explain-fit .
(Update: ScholarshipPage component.)
Rubric Grading UI: Difficulty 4, Impact 5. Implement the “Grade against rubric” flow: call /api/
essays/:id/grade , populate the rubric tab with per-criterion scores and feedback . Then
add the revision sheet UI (2-column diff) for each criterion. (Files: new components under
EssayWorkspace.)
Planner Enhancements: Difficulty 3, Impact 3. Enable editing of due dates (popover date-picker) and
optimistic checkbox updating. Possibly use a drag-and-drop library for reordering (stretch). (Files:
ApplicationPlan.tsx , integrating a <Calendar> if needed.)
Accessibility & Focus Tuning: Difficulty 2, Impact 4. Audit keyboard flows and color contrast. Add
missing aria- attributes and adjust CSS as needed (focus rings, alt texts). (Files: everywhere
components are interactive.)
Error/Empty State Polish: Difficulty 2, Impact 3. Ensure all states have proper copy and visuals (as
outlined above). Add Toast notifications for errors , and skeleton placeholders.
54 55
•
•