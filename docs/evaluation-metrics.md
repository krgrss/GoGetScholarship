# GoGetScholarship – Evaluation & Metrics

> **File:** `evaluation-metrics.md`  
> **Scope:** How we judge whether the product actually “works” (for users + judges).  
> **Audience:** PM, eng, design, demo prep.

---

## 1. Evaluation Goals

We want to show that GoGetScholarship:

1. **Finds good scholarships** – relevant, realistic, not scammy or obviously ineligible.
2. **Improves essays** – students can see clear, rubric-aligned improvement.
3. **Reduces overwhelm** – it’s easier to decide *what to work on next*.
4. **Is trustworthy & transparent** – users can see why they match and why they got a score.
5. **Is technically solid** – queries and workflows are fast and reliable for the demo.

We’re not doing a full academic study – this is a **hackathon-level, evidence-lite but honest** evaluation.

---

## 2. Evaluation Setup

### 2.1 Actors

- **Internal testers** (you, friends, classmates):
  - Provide real-ish profiles and essay drafts.
- **Judges / demo audience**:
  - See 1–2 scripted flows live.
- **Synthetic users** (optional):
  - Pre-defined profiles to test matching and eligibility.

### 2.2 Test datasets

- ~50–150 scholarships (Canada, US, some UK/EU/ASEAN).
- 2–3 “gold” scholarships:
  - Fully wired rubric, components, and clear demographic rules.
- 3–5 sample user profiles:
  - E.g. “Canadian first-gen CS student”, “Intl STEM major”, “Arts student with strong community service”.

---

## 3. Metrics Overview

We track five categories:

1. **Matching quality**
2. **Essay coach effectiveness**
3. **UX & flow effectiveness**
4. **System performance & reliability**
5. **Trust, transparency, and safety**

Each has a mix of **quantitative (numbers)** and **qualitative (subjective)** metrics.

---

## 4. Matching Quality Metrics

### 4.1 Relevance & eligibility

**Metric M1 – Top-K match relevance (manual labeling)**

- For each test profile:
  - Take top 10 scholarships from `/matches`.
  - Label each as:
    - `good` – clearly relevant & eligible.
    - `meh` – somewhat relevant OR some unclear eligibility.
    - `bad` – clearly irrelevant or ineligible.
- Compute:
  - `good@10` = (#good) / 10
  - `(good+meh)@10` = (#good + #meh) / 10

**Success target (hackathon):**  
- `good@10 ≥ 0.6` for “gold” profiles.  
- `(good+meh)@10 ≥ 0.8`.

---

**Metric M2 – Eligibility errors (hard violations)**

- Count top 10 matches that violate obvious hard constraints:
  - wrong level,
  - wrong citizenship / country eligibility,
  - mismatch on required demographic.
- `eligibility_error_rate = (#violations) / (profiles × 10)`.

**Goal:** keep this **as close to 0 as possible** on curated demo set.

---

### 4.2 Diversity & workload balance (soft)

**Metric M3 – Workload distribution**

- Among top 10 matches for each test profile, check distribution:
  - # low effort, # medium, # high.
- Objective:
  - Not all high, not all ultra-low.
  - At least some “easy wins” and some high-value, heavier ones.

This is qualitative but helps tell the story that we’re not just surfacing 10 mega-fellowships.

---

## 5. Essay Coach Effectiveness

### 5.1 Perceived improvement

**Metric E1 – Before vs After quality rating (human)**

For each test user:

1. Take a **baseline essay**:
   - Either written without AI or an initial short draft.
2. Run through RubricCoach:
   - Grade → revise on weakest criterion → get updated version.
3. Ask human rater (can be the same student or a peer):
   - “On a scale of 1–5, how strong is this essay for this scholarship?”
   - Rate baseline and improved versions **blindly if possible**.

Record:

- `baseline_score`
- `improved_score`
- `delta = improved_score - baseline_score`

**Success target:**  
Average `delta ≥ +1.0` across 3–5 test essays.

---

### 5.2 Rubric alignment (sanity check)

**Metric E2 – Alignment with rubric criteria**

For graded essays, check:

- Does feedback **explicitly reference rubric criteria**?
  - E.g. mentions “community impact”, “leadership” etc.
- Does the lowest-scoring criterion line up with obvious weaknesses?

Manual checklist per essay:

- ✅ Mentions at least 2 rubric criteria by name.
- ✅ Weak criterion and feedback make intuitive sense.
- 🚫 No weird invented criteria.

We can summarize as:

- `rubric_alignment_ok_rate = (#essays that pass checklist) / (#essays reviewed)`

Target: > 80% for demo set.

---

## 6. UX & Flow Effectiveness

### 6.1 Task completion

**Metric U1 – End-to-end flow success**

For 3–5 test users (or yourself acting as them), check:

1. Can they:
   - Complete onboarding,
   - See meaningful matches,
   - Open a scholarship,
   - Plan application,
   - Draft an essay,
   - Run rubric grading,
   - Apply at least one revision,
   - View it on Dashboard?
2. Without dev intervention (no JSON debugging etc).

Record:

- `completed` (yes/no),
- steps where they struggled.

Goal: **100%** completion on curated paths by demo time.

---

### 6.2 Perceived usability

**Metric U2 – SUS-lite or simple ratings**

Ask 3–5 testers:

- “How easy was it to understand what to do next?” (1–5)
- “Did the app help reduce your stress about scholarship applications?” (1–5)
- “Would you use this for your real scholarship applications?” (Yes/No/Maybe)

We don’t need a perfect UX study; a simple table of these results is enough for a “User feedback” slide.

---

## 7. System Performance & Reliability

### 7.1 Latency

**Metric S1 – API latency (measured)**

For:

- `/api/matches`
- `/api/scholarships/:id/explain-fit`
- `/api/scholarships/:id/essays/:essayId/grade`

Measure:

- `p50`, `p90` latency (ms) in a small test set.

Targets (for demo):

- Matches: `p90 < 600 ms`
- Explain-fit: `p90 < 2,000 ms`
- Grade essay: `p90 < 5,000 ms` (LLM call), with good loading UX.

---

### 7.2 Reliability (error rate)

**Metric S2 – Error rate on key flows**

During testing:

- Track #requests and #errors (5xx, LLM failures).
- Especially:
  - Explain-fit calls.
  - Drafting calls.
  - Grading calls.

Compute:

- `error_rate = errors / total_requests`.

**Goal (hackathon):** keep visible failures **rare** on the curated demo path, and ensure **good error messages** when they do occur.

---

## 8. Trust, Transparency & Safety

### 8.1 Transparency

**Metric T1 – Explanation clarity**

Ask testers:

- “Did you understand *why* a scholarship was recommended to you?” (1–5)
- “Did the eligibility section make it clear whether you’re eligible?” (1–5)

Goal: average ≥ 4.0 for both on test profiles.

---

### 8.2 Demographic handling

**Metric T2 – Demographic usage sanity check**

For a few scholarships with demographic rules:

- Verify:
  - Hard requirements → correctly exclude ineligible profiles.
  - Priority groups → surfaced as:
    - tags (“priority for X”), **not** hard exclusions.
- Check LLM explanations:
  - They **do not** suggest fabricating or exaggerating identity.
  - They clearly say: “This scholarship prioritizes X, but others may still apply” when appropriate.

Summarize:

- #cases reviewed.
- #cases with incorrect or unsafe behavior.

Goal: **0 unsafe cases** in curated demo set.

---

## 9. Evaluation Checklist (Pre-Demo)

Use this as a **burn-down checklist**:

### Matching

- [ ] For 3–5 test profiles, `good@10` and `(good+meh)@10` measured.
- [ ] No obvious eligibility violations in top 10 for demo profiles.

### Essay Coaching

- [ ] At least 3 essays with before/after human ratings.
- [ ] Average delta ≥ +1.0.
- [ ] Rubric alignment sanity-checked on those essays.

### UX

- [ ] At least 2 full end-to-end runs on “gold” scholarships are smooth.
- [ ] Testers can explain the flow in their own words.

### System

- [ ] Latency measured informally (dev logs or simple timing).
- [ ] No known breaking bugs on primary demo path.

### Trust & Safety

- [ ] Demographic handling reviewed on a few scholarships.
- [ ] LLM prompts updated if any unsafe/ambiguous wording is found.

---

## 10. How to Present This to Judges

You can summarize in **1–2 slides**:

- “We did a lightweight evaluation:”
  - Matching:
    - “For 3 test profiles, 70% of top-10 matches were judged ‘good’, 90% ‘good or acceptable’.”
  - Essay improvement:
    - “Human raters scored essays +1.3 points on average (1–5 scale) after using RubricCoach.”
  - Usability:
    - “Testers rated usefulness 4.5/5 and said they’d use it for real applications.”
  - Safety:
    - “We explicitly separate hard vs priority demographics and never suggest fabricating identity.”

You don’t need perfect stats – just **honest, structured evidence** that you thought about whether the system actually helps real students.

---
