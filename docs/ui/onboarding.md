# GoGetScholarship – Onboarding Flow (`onboarding.md`)

_Last updated: 2025-11-22_

## 1. Purpose & Vision

The onboarding flow is the **first impression** of GoGetScholarship. It should:

1. Collect enough information to **filter out ineligible scholarships** and
   **rank good fits**.
2. Feel like **“teaching the AI who I am”**, not filling out a bureaucratic form.
3. Make the **payoff visible**: students should feel they’re unlocking real
   money and smart coaching, not just dumping data.

We replace the current 4-step wizard with a **2-screen, value-focused flow**:

1. **Eligibility basics** – required.
2. **Boost your matches (optional extras)** – identity + activities + resume.

---

## 2. Route & Entry Conditions

### 2.1 Route

- Primary route: `src/routes/onboarding.tsx`
- Optional nested route: `src/routes/onboarding/$step.tsx` if you want real
  step URLs (`/onboarding/basics`, `/onboarding/boost`).

### 2.2 When to show onboarding

- New users (no `StudentProfile` record) are redirected to `/onboarding` from:
  - `/` root
  - `/matches`
  - `/dashboard`
- Existing users can revisit from:
  - Profile → `Edit my profile & matches` (link to `/onboarding` in “edit” mode).

### 2.3 Completion state

- On final submit, create/update:

  - `StudentProfile`
  - `StudentIdentity` (if provided)
  - `StudentActivities`

- Mark profile as `hasCompletedOnboarding = true`.
- Redirect to `Matches` (Swipe mode) with a brief “Matches ready” banner.

---

## 3. Data Model

These types are conceptual; adapt to actual DB schema.

```ts
type StudentProfile = {
  id: string;
  studentId: string;

  countryOfStudy: string;       // ISO code, e.g. "CA"
  levelOfStudy: "high_school" | "undergrad" | "grad" | "phd" | "other";
  major: string;                // normalized label (from autocomplete)
  gpa: number | null;           // 0–4 scaled
  gpaScale: number | null;      // 4.0, 4.3, 100, etc.
  gpaUnknownReason?: string | null; // "school_no_gpa" | "not_sure" | ...
};

type StudentIdentity = {
  id: string;
  studentId: string;

  gender: string | null;
  yearOfBirth: number | null;   // avoid full DOB if not needed
  ethnicity: string | null;

  tags: string[];               // ["first_gen", "low_income", "lgbtq", ...]
};

type StudentActivity = {
  id: string;
  studentId: string;

  role: string;                 // "President"
  organization: string;         // "Debate Club"
  startYear: number | null;
  endYear: number | null;
  ongoing: boolean;
  description: string;          // 1–2 sentence impact summary
};

type StudentProfileSummary = {
  id: string;
  studentId: string;
  summaryText: string;          // short 2–4 sentence AI-generated profile
  source: "user" | "ai";
};
