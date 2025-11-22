Here’s a **QA persona** you can use when you’re testing GoGetScholarship end-to-end.

You can literally keep this next to you and run through flows “as this person,” plus use it to structure your UX/QA notes and those evaluation metrics you defined (U1, U2, matching quality, etc.).

---

## Persona: “Aisha, Overloaded First-Gen Applicant” (QA Persona)

**Demographic snapshot**

* Age: 19
* Location: Lives off-campus in a mid-size Canadian city
* School: 2nd-year undergrad, STEM major
* Background: First-generation university student, works part-time 15–20 hours/week
* Devices:

  * Primary: 13" laptop (Chrome)
  * Secondary: Android phone (small screen, mid-range)

**Mindset when using GoGetScholarship**

* Constantly worried about **money & time** (tuition + rent + work shifts).
* Feels **overwhelmed** by how many scholarships exist and how confusing eligibility is.
* Mildly skeptical of “AI writing my essay” but open if it **saves time and reduces stress**, not if it feels like cheating.
* Wants to feel **in control** and **safe**: doesn’t want to submit something wrong or ineligible.

**Goals (from *her* point of view)**

1. “Show me a **small set of realistic scholarships** I’m actually eligible for.”
2. “Make it **obvious why each scholarship fits me (or doesn’t)**.”
3. “Help me **plan and finish at least one strong application** without getting lost.”
4. “If AI helps with essays, I want it to **sound like me** and match what the rubric wants.”

These map nicely to your demo scenarios A–D: find matches, plan & draft, grade & improve, and find low-extra-work scholarships.

---

## How QA Should Use This Persona

When you test, **pretend you are Aisha**, not a dev:

* You **don’t read JSON** or network logs; you only see what’s on screen.
* You rely on **UI cues** for:

  * “What should I do next?”
  * “Am I eligible?”
  * “Is this essay good enough yet?”
* You get annoyed if:

  * Steps feel too long or unclear,
  * Errors are cryptic (“something went wrong”),
  * Or you can’t tell whether the AI used real scholarship data.

---

## Behaviours & Expectations (for QA to simulate)

**1. Onboarding (“Calm scholarship Duolingo”)**

* She expects:

  * 3 clear steps (Basics → Background → About you).
  * Max 4–6 fields per step, obvious **“Optional”** markers for demographics.
  * Inline hints like “Only used to find targeted opportunities; never shared with providers.”
* QA checks:

  * Can she complete onboarding **without thinking hard** about what each field means?
  * Does she always know **how many steps are left**?
  * If she reloads or navigates back, **does her data persist**?

**2. Matches List (“Going Merry meets job board”)**

* She expects:

  * A **clear explanation**: “Based on your profile” at the top.
  * Cards that immediately answer:

    * Amount, deadline, level,
    * Demographic focus chip, workload chip (“1 essay · 2 refs”).
* QA checks:

  * `good@10` feels high: at least **6/10 cards look clearly relevant**, and there are **no obvious eligibility violations** (wrong country, level, or demographic).
  * Filters (country, field, level, workload) actually **change the list** and never give “0 results” silently.
  * Loading state = skeleton cards, not janky jumps.

**3. Scholarship Detail + “Why this fits you”**

* She expects:

  * Left: description + **structured eligibility** (country, level, GPA, demographic).
  * Right: sticky sidebar “What they care about” + application components checklist.
  * “Why this fits you” explains:

    * 2–3 strengths grounded in her profile & scholarship data,
    * 1–2 honest gaps (“You’re slightly below the GPA preference of 3.7”).
* QA checks:

  * All points in “Why this fits you” **actually appear in the scholarship data** (no hallucinated criteria).
  * It clearly flags **hard ineligibilities** (“Requires women in STEM; your gender is unspecified”).
  * The copy never assumes a demographic she did not provide.

**4. Planner & Tasks**

* She expects:

  * A **simple checklist**: Draft essay, Ask recommender, Request transcript, etc.
  * Suggested due dates that **make sense** (not after the deadline).
* QA checks:

  * Tasks can be ticked off, and the **status shows up correctly** on the dashboard.
  * Due dates update if she changes the plan or if you re-generate it.

**5. Essay Workspace (Rubric-Aware)**

* She expects:

  * Prompt + word limit clearly shown.
  * Editor that doesn’t lag, with word count like “312 / 500”.
  * Sidebar with **rubric criteria & themes** (“Leadership”, “Community impact”).
* QA checks:

  * “Generate outline / Draft from bullets / Rewrite for clarity”:

    * Never wipes content without warning.
    * Produces text that **respects the word limit** and references rubric ideas.
  * Autosave works: closing & reopening restores her latest content.

**6. Rubric Self-Grading & Revision**

* She expects:

  * Button: “Grade against rubric” → table of criteria with scores + 1-line feedback.
  * Clear readiness label: “Needs work / Solid / Ready”.
  * When she clicks “Improve this”, a **diff view** with Accept/Keep original.
* QA checks:

  * Feedback **mentions rubric criteria by name** and doesn’t invent new ones (matches E2 metric).
  * After accepting a revision, the editor content updates and the readiness bar changes.

**7. Dashboard + “Low Extra Work” suggestions**

* She expects:

  * Simple overview: Not started / In progress / Ready per scholarship, and a readiness meter.
  * Suggestions like “Similar leadership essay, lighter workload.”
* QA checks:

  * Status and counts match her actual actions (starting an essay → In progress; grading & “Ready” → Ready).
  * Low-extra-work suggestions **actually have similar prompts** and equal or lighter workload (sanity check against schema).

---

## QA Checklist Summary for This Persona

When you run a full QA pass “as Aisha”, answer these YES/NO:

1. **Can Aisha complete the full A→D flow without dev help?**
   Onboarding → Matches → Scholarship detail → Plan → Draft → Grade → Improve → Dashboard. (Metric U1).

2. **Does she always know what to do next?**

   * Each screen has a clear primary action (Next, Save & see matches, Start essay, Grade against rubric, etc.).

3. **Does the app reduce her stress instead of increasing it?**

   * Copy avoids jargon, highlights progress, and never hides eligibility rules.

4. **Are there any moments where she would think “I don’t trust this”?**

   * Hallucinated eligibility, weird essay content, or opaque AI behavior.

5. **Is the experience consistent across desktop and mobile?**

   * No broken layouts, impossible taps, or missing buttons on small screens.

6. **Do the internal evaluation metrics look good for her run?**

   * `good@10` for matches feels ≥ 0.6,
   * Eligibility error rate ≈ 0,
   * Essay quality noticeably improves after RubricCoach (delta ≥ +1).

---

If you want, next step I can turn this into a **one-page “QA Persona + Test Script”** you can paste into your repo (e.g., `qa/QA-PERSONA-AISHA.md`) and tick off during each regression run.
