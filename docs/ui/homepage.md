````md
# GoGetScholarship – Home / Studio Overview (`home_page.md`)

_Last updated: 2025-11-22_

## 1. Purpose & Role

**Route:** `/` (root) or `/studio` depending on routing.

This page is the **entry hub** for the whole product.

It must:

1. **Sell the product in one glance**  
   “Stop searching. Start winning. → This app finds scholarships for me and
   helps me write essays.”

2. **Give one clear next step**  
   - New/incomplete users → “Create your profile”.
   - Returning users → “View your matches”.

3. **Explain the core flow**  
   `Profile → Matches → Scholarship Detail → Draft & Grade`.

4. **(Optional but ideal)** For returning users, show a small snapshot of:
   - Profile completion,
   - Saved matches,
   - Essays in progress.

This page is mostly UX/IA, not a heavy data view. The real work happens on
Onboarding, Matches, Scholarship detail, and Essay pages.

---

## 2. State & Variants

### 2.1 User flags

The page needs only a few pieces of state:

```ts
type HomePageState = {
  isLoggedIn: boolean;
  hasCompletedOnboarding: boolean; // based on StudentProfile completeness
  stats?: {
    savedScholarships: number;
    newMatchesSinceLastVisit: number;
    essaysInProgress: number;
    essaysReady: number;
  };
};
````

How you compute `hasCompletedOnboarding` is up to the backend; simplest is
“StudentProfile exists and has required fields”.

### 2.2 CTA logic

* If `!hasCompletedOnboarding`:

  * Hero **primary CTA:** `Start with your profile`

    * Route: `/onboarding` (step 1).
  * Hero **secondary CTA:** `View matches (demo)` or `Browse matches`

    * Route: `/matches` (but it can be less emphasized).

* If `hasCompletedOnboarding`:

  * Hero **primary CTA:** `View your matches`

    * Route: `/matches`.
  * Hero **secondary CTA:** `Edit profile`

    * Route: `/onboarding` or `/profile`.

All other CTAs on the page should **support** this decision, not fight it.

---

## 3. Layout Overview

Desktop skeleton:

```text
[Top nav: Logo | Matches | Dashboard | Custom | Profile (avatar)]

---------------------------------------------------------
Hero section
---------------------------------------------------------

[Studio pill]  Scholarship Application Studio

Stop searching. Start winning.
Subcopy: GoGetScholarship finds high-fit scholarships...
[Primary CTA] [Secondary CTA]

Small "Under the hood" strip (embeddings / rubric / AI essay coach)


---------------------------------------------------------
Core flow strip
---------------------------------------------------------
Follow the core flow: Profile → Matches → Scholarship → Draft & Grade.
(Each label is clickable)


---------------------------------------------------------
How it works cards (4)
---------------------------------------------------------
[1. Profile]  [2. Matches]  [3. Detail]  [4. Draft & Grade]
(Each card is clickable and routes to the right page)


---------------------------------------------------------
(Conditional) Progress tiles for returning users
---------------------------------------------------------
(Profile progress) (Matches snapshot) (Essay progress)
```

On mobile, the same in single-column form.

---

## 4. Hero Section

### 4.1 Content

* Small pill at top:

  * `Scholarship Application Studio`

* H1:

  * `Stop searching. Start winning.`

* Subcopy:

  * `GoGetScholarship finds high-fit opportunities, explains exactly what they want, and helps you draft winning essays in minutes.`

### 4.2 CTAs

Use dynamic text based on `hasCompletedOnboarding`.

```ts
const primaryLabel = hasCompletedOnboarding
  ? "View your matches"
  : "Start with your profile";

const primaryHref = hasCompletedOnboarding ? "/matches" : "/onboarding";

const secondaryLabel = hasCompletedOnboarding
  ? "Edit profile"
  : "Browse matches first";

const secondaryHref = hasCompletedOnboarding ? "/onboarding" : "/matches";
```

* Primary button: solid blue `Button`.
* Secondary: outline/ghost button.

### 4.3 “Under the hood” strip (small AI flex)

Under buttons, a subtle 3-chip row:

* `Embeddings-powered matches`
* `Behind-the-scenes rubric analysis`
* `AI essay drafting & grading`

This reminds judges/users that this is **not** just a filter website.

---

## 5. Core Flow Strip

A full-width pale band under the hero.

**Copy:**

> `Follow the core flow: Profile → Matches → Scholarship → Draft & Grade.`

Implementation:

* Display as inline “breadcrumb” with arrows.
* Each step label is clickable:

  * **Profile** → `/onboarding` or `/profile`
  * **Matches** → `/matches`
  * **Scholarship** → `/matches` or scroll to section explaining Detail page
  * **Draft & Grade** → `/essay` hub or a generic “Essay workspace” page.

Optionally highlight the step that is **most relevant**:

* If `!hasCompletedOnboarding`: highlight “Profile”.
* Else: highlight “Matches”.

---

## 6. “How it Works” Cards (4)

These are the **main explanatory section**, replacing the duplicated “STEP 1/2/3”
cards from the old design.

### 6.1 Layout

* 4 cards in a responsive grid (`grid-cols-1 md:grid-cols-4` or `2x2` on small).
* Use icons consistent with rest of app (person, magnifier, document, pen).

### 6.2 Card specs

All cards clickable; clicking anywhere in the card routes to the target.

#### Card 1 – Profile

* Title: `1. Profile`

* Body:

  > `Tell us about your background, grades, and interests so we know who you are.`

* On click:

  * If `hasCompletedOnboarding`: `/onboarding` with edit mode.
  * Else: `/onboarding`.

#### Card 2 – Matches

* Title: `2. Matches`

* Body:

  > `Get a curated list of scholarships you can actually win, ranked by fit.`

* On click: `/matches`.

#### Card 3 – Detail

* Title: `3. Detail`

* Body:

  > `Open a scholarship to see eligibility, what the sponsor really cares about, and why you’re a match.`

* On click: could be `/matches` with an anchor, or a sample scholarship route.

#### Card 4 – Draft & Grade

* Title: `4. Draft & Grade`

* Body:

  > `Use AI to draft essays, grade them against the rubric, and refine them until they’re ready to submit.`

* On click: `/essay` hub or direct to most urgent essay.

**No extra “STEP 1/2/3” section below this** – that would be redundant.

---

## 7. Progress Tiles (Returning Users Only)

Show this section **only if**:

* `hasCompletedOnboarding === true`, and
* stats are available.

### 7.1 Layout

3 tiles in a row (`grid-cols-1 md:grid-cols-3`):

1. Profile progress
2. Matches snapshot
3. Essays snapshot

### 7.2 Tiles

#### Tile A – Profile

* Label: `Profile`

* Text:

  * `Profile: {completionPercent}% complete`
  * `Last updated: {relativeTime}` (e.g., “2 days ago”).

* Button: `Edit profile` → `/onboarding`.

You can keep completionPercent simple:

* e.g. 100% if all core fields, 70% if some optional fields missing.

#### Tile B – Matches

* Label: `Matches`

* Text:

  * `Saved scholarships: {savedScholarships}`
  * `New since last visit: {newMatchesSinceLastVisit}` (optional).

* Button: `Go to matches` → `/matches`.

#### Tile C – Draft & Grade

* Label: `Draft & grade`

* Text:

  * `Essays in progress: {essaysInProgress}`
  * `Ready to submit: {essaysReady}`.

* Button: `Open essay workspace` → `/dashboard` or essay hub.

If `stats` are missing, hide this section entirely to keep page clean.

---

## 8. Empty / New User Variant

If the user is brand new (`!hasCompletedOnboarding` AND maybe `!isLoggedIn`):

* Hide progress tiles.

* Keep the 4 “how it works” cards.

* Make hero:

  * Primary: `Start with your profile`.
  * Secondary: `Browse matches first`.

* Optionally show a very small “How long it takes” note:

  > `Creating your profile takes about 2 minutes and unlocks personalized matches.`

---

## 9. Implementation Notes

### 9.1 Route file

`src/routes/_index.tsx` or whatever TanStack Start uses for root.

Components:

* `<HomePage />`

  * `<Hero />`
  * `<CoreFlowStrip />`
  * `<HowItWorksGrid />`
  * `<ProgressTiles />` (conditional)

### 9.2 Data loading

On server/load:

* Fetch `StudentProfile` and stats (if logged in).
* Compute `hasCompletedOnboarding`.
* Return as loader data to the component.

### 9.3 Styling

* Use same typography and colors as existing screenshot:

  * Big bold display font for hero.
  * Beige background band for core flow strip.
  * Cards similar to Dashboard / Matches cards (rounded corners, soft shadows).

---

## 10. Codex Prompt (to implement `home_page.md`)

Use this prompt in your repo when asking Codex to wire the page:

```text
You are working in the GoGetScholarship web app (TanStack Start + React + TS).
Implement the root "Home / Studio" page according to home_page.md.

Goals:
- This page is a hub that:
    * Shows the hero ("Stop searching. Start winning."),
    * Gives ONE clear next step based on whether the user has finished onboarding,
    * Explains the core flow (Profile → Matches → Scholarship → Draft & Grade),
    * Optionally shows progress tiles for returning users.

Steps:

1) Locate the current home/studio page
   - Find the route that renders the "Stop searching. Start winning." hero and
     the 4 cards + STEP 1/2/3 section.
   - Add a short comment summarizing its current structure.

2) Implement state-based CTAs in the hero
   - Introduce a `hasCompletedOnboarding` boolean from loader data (using
     StudentProfile or an existing flag).
   - If `hasCompletedOnboarding` is false:
       * Primary CTA: "Start with your profile" → /onboarding
       * Secondary CTA: "Browse matches first" → /matches
     If true:
       * Primary CTA: "View your matches" → /matches
       * Secondary CTA: "Edit profile" → /onboarding or /profile.
   - Add a small "Under the hood" strip with 2–3 short chips describing
     embeddings/rubric/AI drafting.

3) Simplify the mid-page flow section
   - Keep the beige "Follow the core flow: Profile → Matches → Scholarship →
     Draft & Grade" strip.
   - Make each label clickable, routing to the relevant page.
   - Below, keep ONLY the 4 cards (Profile, Matches, Detail, Draft & Grade).
   - Remove the duplicated bottom "STEP 1/STEP 2/STEP 3" section which
     currently repeats the same CTAs.

4) Hook up the 4 "how it works" cards
   - Make each card clickable (Card as a button):
       * "1. Profile" → /onboarding (or /profile in edit mode).
       * "2. Matches" → /matches.
       * "3. Detail" → open a sample scholarship or /matches with explanation.
       * "4. Draft & Grade" → essay workspace route.
   - Keep descriptions short and aligned with home_page.md.

5) Add optional progress tiles for returning users
   - If the loader returns stats (saved scholarships, new matches, essays
     in progress/ready), display a 3-tile grid under the how-it-works section:
       * Profile tile: show completion percentage and link to edit.
       * Matches tile: show saved count and new matches, link to /matches.
       * Draft & grade tile: show essay counts, link to essay workspace.
   - If stats are not available or user is new, hide this section.

6) Clean up layout & responsiveness
   - Use the existing design system (Tailwind + shadcn Card, Button, Badge).
   - Ensure the hero + flow + cards + tiles stack nicely on mobile
     (single-column layout).

The final home page should:
- Present ONE clear primary action based on onboarding state,
- Explain the core flow with the 4 cards,
- Optionally show personal progress for returning users,
- Avoid duplicate step sections and button overload.
```

```
::contentReference[oaicite:0]{index=0}
```
