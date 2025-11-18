````markdown
# GoGetScholarship – Data Ingestion Requirements

> **File:** `data-ingestion-requirements.md`  
> **Scope:** How we discover, ingest, clean, and maintain the scholarship dataset.  
> **Audience:** Data / backend / “research Sani”.

---

## 1. Goals & Scope

### 1.1 Primary goals

We need a **small but high-quality** dataset that:

- Is **diverse** (Canada + US + some UK/EU + ASEAN).
- Has **clear eligibility** (including demographics, GPA, fields, geography).
- Has **application components** (essays, refs, transcript, etc.).
- Provides **rubrics / criteria / “what they care about”** when possible.
- Preferably includes **winners and transparency signals** (for future features).

For hackathon, we prioritize **quality over volume**:
- Target: **50–150 scholarships** fully wired end-to-end.
- Time coverage: **last 5 years of cycles** (e.g. 2020–2025) where relevant.
- It’s okay if older winners exist; we don’t need to ingest all of them now.

### 1.2 In-scope vs out-of-scope

**In scope:**

- Official university, government, foundation, corporate scholarships.
- Multi-year recurring scholarships where structure is stable.
- Public scholarship programs with clear terms and deadlines.

**Out of scope:**

- Sweepstakes / random draws / “no-essay $500 giveaway”.
- Pay-to-apply or obvious lead-generation scams.
- Paywalled or TOS-forbidden sources.

---

## 2. Source Selection Requirements

### 2.1 Geographic priorities

Order of priority:

1. **Canada** (core demo set)
2. **United States**
3. **UK / EU**
4. **ASEAN** (Singapore, Malaysia, Indonesia, etc.)

For each region, prefer:

- `.edu`, `.ac.*`, `.gov`, `.org` official sites.
- Named corporate scholarship programs (e.g. major tech / finance / NGO).
- Foundations with **clear recipient pages**.

### 2.2 Source quality criteria

A source is “good” if it:

- Has **clearly stated eligibility** (level, geography, demographics, GPA, field).
- Specifies **application components** (essays, LORs, transcript, interview).
- Provides **essay prompts** (verbatim).
- Ideally provides some **rubric / criteria / “what we look for”** language.

We prefer sources that also:

- Publish **winners / recipients list**.
- Publish **winning essays / profiles** (even if we only link them).
- Have **annual or impact reports**.

---

## 3. Data Model & Field Mapping

We ingest into a raw layer (CSV/JSON) and then **normalize** into the DB schema from `db-requirements.md`.

### 3.1 Minimal required fields (MUST HAVE)

Each scholarship record MUST have:

- `id` (internal UUID)
- `name`
- `provider_name`
- `provider_type` (university/foundation/government/corporate/platform)
- `url` (main information page)
- `source_country` (host org country)
- `last_verified_at` (ISO datetime)
- `amount_min`, `amount_max`, `currency`
- At least one **deadline** (date or clear rolling description)
- Eligibility:
  - `level_of_study[]`
  - `fields_of_study[]`
  - `country_eligibility[]`
  - `citizenship_requirements[]`
  - `is_international_students_allowed`
- Demographics:
  - `demographic_eligibility[]` (hard rules)
- Application structure:
  - `application_components` (normalized object)
  - `application_effort` (low/medium/high from components)
- Text:
  - `description_raw`
  - `eligibility_raw`

If any of these fields cannot be reliably populated, that scholarship is **not included** in the MVP dataset.

### 3.2 Important but optional (SHOULD HAVE if possible)

- GPA:
  - `min_gpa`, `gpa_scale`
- `num_awards`, `is_renewable`, `frequency`
- `demographic_focus_raw` (verbatim language)
- `demographic_focus` JSON (structured required vs priority)
- `essay_prompts`:
  - `[{ id, prompt, word_limit, type }]`
- `rubric`:
  - `[{ id, name, description, weight }]`
- `personality_profile` (themes we derive later)
- `transparency` JSON:
  - winners list URLs, essays links, rubrics, judges, etc.

### 3.3 Winners & transparency (future-use)

If available, per scholarship we should capture:

- `winners_url`
- `winners_coverage_years`
- `publishes_winning_essays` (Y/N, with URLs)
- `publishes_selection_rubric` (Y/N)
- `publishes_judges_or_committee` (Y/N)
- `publishes_annual_or_impact_report` (Y/N)
- `transparency_rating` (0–5, manual label for now)

Plus optional child rows in `scholarship_winners`:

- `year`, `winner_name`, `school_or_affiliation`, `field_of_study`
- `winner_profile_url`, `winning_essay_url`

---

## 4. Demographic & Eligibility Requirements

We explicitly separate **hard eligibility** from **soft preference**.

### 4.1 Hard demographic eligibility

- Examples:
  - “Open only to women”.
  - “Must be an Indigenous student”.
  - “Must be a permanent resident of X”.

Rules:

- These go into `demographic_eligibility[]` and/or `citizenship_requirements[]`.
- In the product:
  - We **must** filter out ineligible users (don’t show as match).
  - We must show this clearly in the eligibility section.

### 4.2 Soft demographic focus / priority

- Examples:
  - “Priority for first-generation students”.
  - “Scholarship aims to support Black students in STEM, but all may apply”.

Rules:

- Store raw phrase in `demographic_focus_raw`.
- Normalize into `demographic_focus` JSON:
  - `{ "required": [...], "priority": [...] }`
- For MVP:
  - Use `required` for hard filters.
  - Use `priority` only to **highlight** and to improve explanation (“Why this fits you”).

### 4.3 Non-demographic eligibility

- Academic:
  - `level_of_study[]`, `fields_of_study[]`, `min_gpa`, `gpa_scale`.
- Geographic:
  - `country_eligibility[]`, `citizenship_requirements[]`, `is_international_students_allowed`.
- Financial need:
  - Boolean flag if there is explicit need requirement.

All of these must be **explicitly present in the source**; we do **not** guess GPA or need if not stated.

---

## 5. Application Components & Effort Modeling

We must transform messy language like:

> “A 500-word personal statement, two letters of reference, and a transcript are required. Shortlisted candidates may be interviewed.”

into normalized structure.

### 5.1 `application_components` (structured)

Each scholarship should have a JSON object like:

```json
{
  "essays": {
    "count": 1,
    "details": [
      {
        "id": "main",
        "word_limit": 500,
        "topic_hint": "leadership in STEM",
        "required": true
      }
    ]
  },
  "references": {
    "count": 2,
    "required": true
  },
  "transcript": {
    "required": true,
    "type": "official"
  },
  "interview": {
    "required": true,
    "stage": "shortlist"
  },
  "other_materials": [
    {
      "type": "portfolio",
      "description": "Artistic portfolio (PDF or website)"
    }
  ]
}
````

Ingestors must:

* Parse application pages and bullet lists.
* Normalize counts and required flags.
* Set `required: true` only if the source clearly states it.

### 5.2 `application_effort` (heuristic label)

From `application_components`, assign:

* `low`:

  * e.g. 1 short essay OR just refs/transcript.
* `medium`:

  * e.g. 1 longer essay + 1–2 refs + transcript.
* `high`:

  * multiple essays and/or interview plus other materials.

**Rule:** We never show “hard/easy”. It’s a **workload** proxy only.

---

## 6. Essay Prompts & Rubrics

### 6.1 Essay prompts

From source:

* Capture **verbatim** prompt text.
* Capture word limits if stated.
* Example structure:

```json
[
  {
    "id": "main",
    "prompt": "Describe a leadership challenge you faced and how you responded.",
    "word_limit": 500,
    "type": "main_essay"
  }
]
```

Rules:

* Do not paraphrase prompts.
* If there are multiple prompts, capture each as a separate entry.

### 6.2 Rubrics / criteria

Some sources provide explicit or implicit rubrics (e.g. “selection is based on academic excellence, leadership, community service”).

We must:

* Extract named criteria where possible.
* Map to:

```json
[
  {
    "id": "academic",
    "name": "Academic excellence",
    "description": "Grades, course rigor, and academic achievements.",
    "weight": 0.4
  },
  {
    "id": "leadership",
    "name": "Leadership",
    "description": "Roles, initiatives, and impact.",
    "weight": 0.3
  },
  {
    "id": "service",
    "name": "Community service",
    "description": "Volunteer work and community impact.",
    "weight": 0.3
  }
]
```

Where weights are:

* Taken from explicit percentages if available, OR
* Approximate (normalized) if only relative language is provided (“primary consideration”, “secondary”).

For transparency, we should store:

* Raw rubric text (if available).
* Source URL where rubric came from.

---

## 7. Pipeline Architecture & Process

We assume a simple **ETL** style pipeline:

```text
Source discovery → Extraction → Normalization → Enrichment → Validation → Load
```

### 7.1 Source discovery

* Maintain a simple **source registry** (could be a JSON or small table) with:

  * Source name, base URL, type, country.
  * Notes on quality and last checked date.

### 7.2 Extraction

Methods:

* Manual curation:

  * Copying fields by hand into a Google Sheet/CSV for key scholarships (OK for hackathon).
* Semi-automatic:

  * Simple scrapers (BeautifulSoup, Playwright) where page layouts are stable.

Requirements:

* Capture:

  * raw HTML (optional),
  * text segments (description, eligibility, application requirements),
  * URLs to requirements and winners pages.

### 7.3 Normalization

* Map raw fields into standardized columns:

  * Countries → ISO codes.
  * Currency → 3-letter code (`CAD`, `USD`, etc.).
  * Levels → normalized set (`undergraduate`, `graduate`, etc.).
  * Fields of study → normalized set (`computer_science`, `business`, etc.).
* Convert dates to `YYYY-MM-DD`.
* Compute `amount_min` / `amount_max` from text; if only “up to X”, set both to `X`.

### 7.4 Enrichment

* Generate:

  * `application_components` from parsed requirements.
  * `application_effort` from components.
  * `rubric` from selection criteria text.
  * `transparency` JSON from winners/essays pages.
* Optionally use Claude offline to help classify:

  * field of study tags,
  * demographic focus,
  * rubric categories.

### 7.5 Validation

Automated checks:

* Ensure all **MUST HAVE** fields are populated.
* Validate numeric fields (amounts, GPA).
* Validate date formats.
* Ensure arrays are non-empty where required.

Manual spot checks:

* Random subset of scholarships per region.
* Verify:

  * URL opens the right scholarship.
  * Eligibility & components match actual page.
  * Demographic requirements correctly classified.

### 7.6 Load

* Export final dataset as:

  * `scholarships.json` / `scholarships.jsonl`.
  * Optionally CSV for quick debugging.
* Load into Postgres `scholarships` and `scholarship_embeddings`.

---

## 8. File Formats & Internal Artifacts

### 8.1 Raw extraction

* Can be in loose JSON/CSV, not required to be perfect.
* At least preserves:

  * URL,
  * raw description & eligibility text,
  * raw components text.

### 8.2 Clean, app-ready dataset

**Canonical file** (for hackathon):
`data/scholarships_clean.jsonl`

Each line = one scholarship, aligned with DB schema.

* Keys:

  * Match those in `scholarships` table when possible.
  * Additional fields (`source_name`, `transparency_rating`) can be stored in JSONB.

Optional:

* `data/winners.jsonl` for `scholarship_winners`.

---

## 9. Licensing, TOS & Ethics

### 9.1 Licensing / usage

* We only store **facts** and short excerpts (prompts, criteria) from public pages.
* We do **not** redistribute entire websites.
* We respect:

  * Robots.txt for automated scraping (no large-scale brute scraping for hackathon).
  * Terms of use – if a site prohibits scraping, we use manual entry or skip.

### 9.2 Winners & essays

* For winning essays and profiles:

  * We store **links only**, not full content.
  * We may later use them for **offline analysis**, but not directly show or copy text without attribution and careful consideration.

### 9.3 Demographic & sensitive data

* We only capture demographic **eligibility / focus** from scholarships themselves, not personal user identities beyond self-reported profile.
* For our own user profiles:

  * Demographic fields are **optional** and used only for matching to **available opportunities**.
  * No demographic-based scoring of user quality.

---

## 10. Core vs Stretch (Hackathon)

### Core (must-do)

* Curate **50–150 scholarships** with:

  * All MUST HAVE fields filled.
  * Reasonable application components & effort labels.
  * At least a basic rubric or “what they look for” for ~10–20 scholarships (for RubricCoach demo).
* Ensure:

  * Canada/US heavy,
  * but include a few UK/EU/ASEAN examples.

### Stretch (nice-to-have)

* Winners & transparency data for a subset:

  * e.g. 5–10 scholarships with winners lists and essay links.
* A small number of **deeply annotated** scholarships:

  * very rich rubric,
  * clear demographic focus,
  * multiple application components,
  * used as “gold” demo examples.

---