Repository Analysis
Tech Stack & Style: The app is built on TanStack Start (React + TypeScript) with Tailwind CSS and
Shadcn/UI for styling . All layouts use utility classes (e.g.
min-h-screen bg-background text-foreground ) and custom theme tokens (like bg-card ,
ring-border ) for a cohesive look. This means our base design is consistent and lightweight.
Brand Tone & Palette: The existing tone is calm and scholarly. It uses an off-white background
( #FDF7EF ) and near-black text ( #181220 ), with deep blue ( #3155FF ) as the primary accent and
warm amber ( #F6A623 ) as a secondary highlight . Headings use an editorial serif (the font-
display class) and body text a neutral sans-serif . This conveys a trustworthy, studious feel.
UI Patterns: The code follows the UI spec in many cases: multi-step onboarding with a step
indicator; filter sidebar + scholarship cards; split-pane essay view. Components like cards
( rounded-2xl bg-card p-4 shadow-sm ) and buttons ( rounded-full bg-primary ) are used
consistently . Many Shadcn primitives (Card, Button, Tabs, Dialog, Badge, Skeleton, Toast) are
prescribed and some (e.g. cards, badges) are custom-implemented with the theme classes.
Strengths: Key flows have clear layouts. The onboarding wizard is centered and step-driven .
The matches page has a two-column layout (filters + results) at larger breakpoints . Scholarship
cards cleanly display name, sponsor, amount, tags and deadlines . The homepage/dashboard
summarizes “Recommended/In-Progress/Applied” lists in well-separated columns. Altogether, the
app already feels calm, focused, and well-structured.
Weaknesses: However, many intended features are not yet built. The “Why this fits you” dialog,
Application Planner, Rubric self-grade, and enhanced essay editor aren’t implemented. Some UI
elements lack polish: for example, there is no global <AppShell> header/nav as suggested, and
focus styles are inconsistent (many inputs use generic focus without a clear ring) . Minor
inconsistencies in styling exist (e.g. some badges use bg-secondary , others use bordered chips).
Route naming is also inconsistent (code uses /scholarship/$id whereas docs expect /
scholarships/:id ). These gaps suggest opportunities for refactoring and completing missing
states.
MCP/Component Usage: The current code uses Shadcn UI’s themes (color classes like bg-
background , text-primary-foreground ) but often hand-rolls layouts instead of employing
high-level components. For instance, card and filter panel layouts are done with basic <div> s
using Tailwind classes rather than leveraging a provided Card or Sheet component. Overall, the
foundation is solid (Tailwind + Shadcn) , but some components (tabs, dialogs, advanced form
controls) are only partially used, leaving visual patterns to be unified.
Competitive and Pattern Research
Scholarship Platforms: Going Merry, Bold.org, and similar sites use filterable card grids. We
should replicate a left-side filter panel (country, level, fields, toggles) and a main list of
ScholarshipCard components . Cards highlight scholarship name, sponsor, amount,
deadline, and tags (level, field, demographics) – much like job listings on Indeed or LinkedIn (with
badges for attributes) . It’s effective to surface eligibility info (e.g. “Undergraduate”, “Women in
•
1
•
2
2
•
3 4
5
• 6
7
8
•
5
•
1 5
•
8
8
1
STEM”) as colored badges or chips, and use hover lifts/accents to show interactivity . A “Reset
filters” action (as in the empty-state design) is also standard.
Wizards & Onboarding: For multi-step forms, Duolingo’s approachable wizard offers cues: a
progress indicator or stepper at top with labels, and “Next/Back” buttons. We’ll use a horizontal
stepper ( <Tabs> or custom step bar ) showing “Basics – Background – About You,” with the
current step highlighted. Buttons should be prominent (solid primary) and disabled until required
fields are valid. This pattern reduces cognitive load by focusing on one section at a time . (Shadcn
has example Stepper/Progress components; MUI’s Stepper is another model.)
Editor / Writing Assistance: For the essay drafting workspace, models like Grammarly or Notion
inspire a split-screen editor. We'll implement a left-side rich editor (or styled <textarea> ) and a
right-side panel with tabs for “Rubric” and “Themes” . When providing AI suggestions (outline,
rewrite), we might use modals or slide-over sheets (MUI’s Dialog/Drawer or Shadcn’s <Dialog> /
<Sheet> ). For revision flows, a side-by-side diff UI (current vs suggested text) is ideal, similar to an
inline comment or merge diff; React Bits has animated panel components that could enhance this.
Component Library Patterns: We’ll heavily lean on the Shadcn primitives as recommended . For
example, use <Card> for scholarship listings and dashboard stats (with rounded-2xl shadow-
sm styling ), <Button> variants for primary/secondary actions, <Tabs> for rubric/themes,
<Dialog> or <Sheet> for “Why this fits” and revision panels. MUI’s components provide similar
patterns: e.g. MUI’s <Autocomplete> could serve the “Fields of study” selector, and <DataGrid>
for the dashboard table if needed. However, a custom table/list is simpler for v1. Overall, adopt
proven UX patterns (filters + list, cards, wizard, editor with side info) to meet user goals efficiently.
Aesthetic Directions (Art Direction)
We recommend three potential styles, with the first as the primary candidate:
“Scholar Studio” (Baseline – Calm & Trustworthy): This is the current direction. Tone is calm,
professional, and encouraging. Pair an editorial serif (e.g. Playfair Display) for headings with a neutral
sans-serif (Inter/Source Sans) for body . The semantic color palette is light and warm: Page
background #FDF7EF, surface (cards) #FFFFFF, text #181220 (almost black) . Use Primary
Accent = deep blue #3155FF and Secondary = amber #F6A623 for buttons, links, and highlights .
Motion should be subtle: gentle fades and slides on dialogs/hover , no flashy animations,
respecting reduced-motion preferences . This direction feels reliable and calm, emphasizing
clarity.
“Bright Progress” (Warm & Energetic): A livelier alternative. Tone is upbeat and motivational. Font
pair could flip: a clean sans-serif headline (e.g. Poppins) with a friendly serif (or the same sans) for
body, creating a modern vibe. Colors would be brighter: crisp white or very light gray background,
Primary = vibrant teal or green (trust/building focus), Secondary = bright orange or coral. This
injects energy suitable for young students. Motion would include small “pops” or accent color pulses
on success (e.g. a green checkmark animation) and smooth expansions for sidebar filters. Use
gradients/illustrative icons sparingly for a fresh look. However, it’s riskier as it departs from the
existing calm brand.
“Modern Minimal” (Clean & Focused): A sleek, monochrome style with a single strong accent. Tone
is efficient, no-nonsense. Use a sans-serif for all text (e.g. Montserrat), with sparing use of serif for
emphasis if needed. Primary = navy or charcoal blue, Secondary = a single highlight color (lime or
9
•
6
10
•
11
• 5
3
1.
2
2
2
12
12
2.
3.
2
cyan). The UI would minimize shadows and use more whitespace. Motion is equally restrained:
micro-transitions (100–150ms) on hovers , with all focus states clearly defined (thicker rings). This
appeals to tech-savvy users, but may feel colder.
Chosen Direction – “Scholar Studio”: We recommend sticking with the existing calm theme. It matches the
mission (“coach”-like, trustworthy), and is already mostly implemented . It uses accessible, high-
contrast colors and an academic aesthetic, which works well for an educational tool. The blue/amber palette
suggests both credibility (blue) and warmth/optimism (amber). Its motion guidelines (subtle transitions and
visible focus rings) are well-described in our docs , and we should continue them to refine the feel.
(The other directions can inform future theming or dark mode variations but the baseline meets our needs.)
Deliverable 1 – UX Principles
Clarity Over Cleverness: Always present one clear next action. The onboarding wizard and match list
should emphasize the obvious step (e.g. a highlighted “Continue” or “View Details” button) .
Avoid overwhelming screens – break flows into digestible parts (the multi-step profile form is a good
example).
Implications: Wizard headers explicitly say “Step X of Y” ; matches page shows count of results;
highlight primary CTA (e.g. “Start essay”) on each screen.
Transparent Guidance: Show why things happen. Display eligibility criteria and match rationale. For
instance, eligibility sections (country, GPA, demographics) should be visible on detail pages , and
a “Why this fits you” dialog should explain fit scores. This demystifies the AI: users see facts (criteria,
weights) not just a black-box result.
Implications: Include an “Eligibility” panel on the detail screen (as per docs ). Use clear labels (e.g.
“Priority for: Women in STEM” vs “Only open to: …”) so students understand filters. Provide
contextual help text for toggles/checkboxes (e.g. “Optional – used only for targeted matches”).
User in Control: AI suggestions must be optional and reviewable. The student’s actions drive the
flow (never auto-submit). For example, “Generate draft” should present an essay for review (not auto-
apply it), and “Accept revision” merges changes only after user confirmation .
Implications: Buttons like “Accept Revision” or “Generate Outline” open modals/dialogs where the
user chooses, rather than auto-changing text. Show diffs side-by-side for rubric improvements .
Always allow “Keep original” on edits.
Inclusivity and Transparency of Data: Treat sensitive inputs (demographics) carefully.
Demographic filters are optional and clearly explained (with “why” text). UX text should use
respectful language and privacy-conscious defaults.
Implications: Label optional sections (“This is optional…”) . Do not hide or downplay eligibility info;
instead show “Check official page for full details” to cover omissions .
Accessibility: Ensure keyboard navigation, focus visibility, and contrast. Every interactive element
(buttons, links, tabs) must be reachable via Tab with a clear focus ring . Text ratios should meet
WCAG standards (our dark-on-light scheme already has high contrast ).
Implications: All buttons use Tailwind’s focus-visible ring classes (as in code:
focus-visible:ring-2 ring-accent ) . Ensure form fields have aria-labels if needed.
Design components (Cards, Tabs) should have role/label where applicable.
(Additional principles might include “Supportive Tone” – use encouraging copy; “Resilience” – handle errors
graciously – these guide copywriting and error states below.)
12
2 1
13 12
1.
10 6
2. 14
3.
15
4. 15
5.
16 17
6.
18
7.
8. 19
20
9.
21
2
10.
21
3
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
Spacing & Layout: Use a spacing scale (Tailwind’s default: 4px * 1,2,3…). For components:
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
