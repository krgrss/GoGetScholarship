# GoGetScholarship

> **AI scholarship coach that takes students from _“which scholarships?”_ to _“ready to submit”_.**

GoGetScholarship helps students:

- discover **relevant, realistic** scholarships (not spammy lists),
- understand **why** each one fits them (eligibility + demographic focus),
- and get **rubric-aware coaching** on their essays inside a focused workspace.

Built during the Agentiiv hackathon as an end-to-end slice:  
**Match → Plan → Draft → Refine.**

---

## ✨ Core features

### 1. Smart matching (not just a directory)

- Short onboarding collects academics, background, constraints, and goals.
- Matching engine combines:
  - **Hard filters** – citizenship, level of study, GPA, deadlines, etc.
  - **Semantic search + LLM reranking** – fit with the student’s profile and interests.
- Each scholarship card shows:
  - **“Why this fits you”** explanation.
  - **Eligibility flags** when something is uncertain or needs manual checking.
  - A rough **effort estimate** (essays, references, forms).

### 2. Planner dashboard

- Students can **swipe / star / shortlist** scholarships from the match page.
- Planner lays them out by **deadline**, with:
  - Auto-generated **task checklist** (essays, refs, forms, transcripts).
  - Simple **workload hint** so they don’t stack 5 big essays in one week.

### 3. Essay workspace

- Rich-text editor with an **AI sidebar**, not a one-click essay generator.
- AI reads:
  - The **prompt** and any rubric text.
  - The **student profile** (from onboarding).
  - Relevant context about the scholarship.
- It can:
  - Suggest **outlines** and story angles using the student’s real experiences.
  - Give **rubric-aware feedback** (clarity, impact, specificity, structure).
  - Propose line-level edits with explanations so the student learns *why*.

### 4. Winner stories (RAG-powered, WIP)

- Optional store of **winner stories / example essays**.
- Used as **teaching material**, not text to copy:
  - AI surfaces patterns (impact, quantified results, reflection).
  - Student keeps their own voice and content.

---

## 🧱 Tech stack

**Frontend & app framework**

- React + TypeScript  
- TanStack Start – file-based routing, server functions  
- Tailwind CSS + shadcn/ui for UI kit and design tokens

**Backend & AI**

- Node.js (via TanStack Start server functions)  
- PostgreSQL for relational data  
- Vector search (pgvector-style) for embeddings (scholarships, winner stories)  
- Claude for matching explanations and essay coaching  
  - Model choice is configurable via environment variables

**Tooling**

- `pnpm` (recommended) or `npm` / `yarn`
- SQL scripts for schema + seed data in `sql/`
- Additional helper scripts in `scripts/`

---

## 🗂 Project structure

> This reflects the intended repo layout; trim folders as you clean up.

    .
    ├── src/                # TanStack Start app (routes, components, server functions)
    │   ├── routes/         # UI routes + loaders/actions
    │   ├── components/     # Reusable UI components
    │   ├── server/         # Server utilities (db, AI client, etc.)
    │   └── lib/            # Domain helpers (matching, scoring, etc.)
    ├── public/             # Static assets (favicons, og images, etc.)
    ├── data/               # Sample data / fixtures (personas, demo profiles)
    ├── sql/                # SQL schema + seed scripts for Postgres
    ├── scripts/            # One-off scripts (ingest JSON, seed DB, etc.)
    ├── prompts/            # Prompt templates for matching & essay coaching
    ├── docs/               # Architecture, product requirements, UX flows
    ├── .env.example        # Template for environment variables
    ├── package.json
    └── README.md

As you delete legacy folders, update this tree to match reality.

---

## ⚙️ Getting started (local dev)

### 1. Prerequisites

- Node.js **≥ 20**
- `pnpm` (recommended) – or swap `pnpm` for `npm` / `yarn` in commands
- A running PostgreSQL instance (local, Docker, or Neon/Cloud)

### 2. Clone and install

    git clone <your-repo-url> gogetscholarship
    cd gogetscholarship
    pnpm install

### 3. Configure environment variables

Copy the example file and fill in values:

    cp .env.example .env

### 4. Set up the database

Run your schema + seed scripts. If you’ve wired npm scripts, this might look like:

    # Example – adjust to whatever is in package.json
    pnpm db:migrate    # apply sql migrations
    pnpm db:seed       # seed sample scholarships + demo personas

If you don’t have CLI scripts yet, you can execute the `.sql` files in `sql/` manually via `psql` or a GUI client.

### 5. Run the dev server

    pnpm dev

Then open:

- App: `http://localhost:3000` (TanStack Start dev server)

---

## 🧪 Demo personas

You can use these profiles when demoing the app.

### Example 1 – Maya (international CS student, high need)

- 2nd-year Computer Science + Stats at the University of Toronto, GPA ≈ 3.8  
- International student from Malaysia, first-generation  
- Volunteers teaching Python to newcomer high-school students  
- Works part-time in a campus café → wants **fewer, high-value awards**  

Good match types:

- STEM / CS scholarships  
- Women in tech / women in STEM  
- First-generation and high-need awards  
- Community service / leadership scholarships  

### Example 2 – Diego (social work, community mental health)

- 3rd-year Social Work student in Calgary, GPA ≈ 3.5  
- Child of Mexican immigrants, first-gen, bilingual (English/Spanish)  
- Works as a support worker + volunteers at a food bank and peer mental health program  
- Needs scholarships to cut back work hours during practicum  

Good match types:

- Social work / human services  
- Community service and leadership  
- Mental health / community impact awards  
- First-generation and financial-need-based scholarships  

You can store these under `data/demo_profiles/` or seed them into the DB for nicer demos.

---

## 🏗 High-level architecture

**Frontend**

- TanStack Start routes for:
  - Onboarding / profile
  - Match view (swipe / shortlist)
  - Scholarship detail + “Why this fits you”
  - Planner dashboard
  - Essay workspace
  - (Optional) Winner stories browser

**Backend / API**

- TanStack Start server functions / API routes, e.g.:

  - `GET /api/matches` – fetch scholarships for a given student
  - `POST /api/explain-fit` – explain why a scholarship fits
  - `POST /api/plan` – build checklist / timeline for a scholarship
  - `POST /api/coach-essay` – rubric-aware feedback and suggestions

- PostgreSQL tables (example):

  - `students`, `student_profiles`  
  - `scholarships`  
  - `applications`, `tasks`  
  - (Optional) `winner_stories`, `essay_examples`

- Vector columns for semantic search over scholarship text and winner-story snippets.

**AI / RAG flow**

1. **Embeddings**  
   - Compute embeddings for scholarships and winner-story chunks.  
2. **Retrieval**  
   - Filter by hard constraints (citizenship, GPA, level, deadline).  
   - Use vector similarity search to get candidate scholarships and examples.  
3. **LLM reasoning**  
   - Compose a prompt with:
     - Student profile
     - Scholarship fields
     - Any relevant winner-story snippets / rubrics  
   - Model scores and reranks candidates, generates:
     - “Why this fits you” explanations
     - Planner suggestions (effort estimate, tasks)
     - Essay feedback and line-level edits

---

## 🛣 Roadmap (post-hackathon)

- ✅ MVP: end-to-end slice from onboarding → matches → planner → essay coaching.
- ⏭ Scale the scholarship dataset and clean eligibility fields for more regions.
- ⏭ Add counselor / mentor views for schools and nonprofits.
- ⏭ Track outcomes (submitted, shortlisted, won) to improve matching and prompts.
- ⏭ Explore fairness metrics for which scholarships are surfaced to which students.

---

## 📄 License

- MIT

---

## 🙋‍♀️ Contributing

This is currently a hackathon-stage codebase. Contribution are open
- The database schema.

