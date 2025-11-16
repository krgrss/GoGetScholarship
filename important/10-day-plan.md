# 10-Day Hackathon Project Plan: AI-Powered Scholarship Application Assistant

## Day 1: Project Setup and Planning

-   **Environment Setup:** Initialize the project with **TanStack Start** (React + Vite) to leverage full-stack capabilities (SSR, server functions, etc.)[tanstack.com](https://tanstack.com/start/latest/docs/framework/react/overview#:~:text=TanStack%20Start%20is%20a%20full,provider%20or%20runtime%20you%20want). Integrate **TailwindCSS** and **shadcn/ui** for rapid UI styling. Verify the dev server runs and basic routing works.
    
-   **Repository & Config:** Set up version control and create a `.env` file for API keys (Claude API, Voyage API, database URL). Implement a simple TanStack **server function** (RPC endpoint) that returns a test string to confirm backend integration[tanstack.com](https://tanstack.com/start/latest/docs/framework/react/overview#:~:text=%2A%20Full,support%20across%20the%20entire%20stack).
    
-   **Frontend Scaffold:** Build a basic homepage and navigation. Design a form for student profile input (e.g. fields for name, background, academic interests, personal story highlights). Keep it simple and plan to enhance it later.
    
-   **Planning & Design:** Outline the data models and components needed. Draft the schema for scholarships (e.g. id, name, description, vector, profile data) and decide how to represent extracted priorities/constraints. Decide on data for winner stories. Sketch the user flow: profile input ➜ scholarship matching ➜ essay generation. Allocate which features to tackle on each day, leaving buffer time.
    

## Day 2: Data Collection and Embeddings Initialization

-   **Scholarship Data:** Gather ~25–50 seed scholarship descriptions (either scrape from public sources or create realistic dummy data). Ensure each has details like eligibility, criteria, and values sought (this will feed the **Pattern Profiler**). Also collect a small set (e.g. 5–10) of public scholarship **winning essays or stories** to use for pattern mining.
    
-   **Database Setup:** Configure a **PostgreSQL** database and install the **pgvector** extension. Create tables for `scholarships` (including text fields and a VECTOR field for embeddings) and for `winner_stories` (or store these in code if simpler). This allows using Postgres as a vector database to store and query embeddings[tigerdata.com](https://www.tigerdata.com/blog/postgresql-as-a-vector-database-using-pgvector#:~:text=With%20some%20help%20from%20the,text%20strings%20for%20OpenAI%E2%80%99s%20models).
    
-   **Compute Embeddings:** Write a script or use a server function to generate embeddings for each scholarship description using the **Voyage 3.5** embedding model (1024-dim)[docs.voyageai.com](https://docs.voyageai.com/docs/embeddings#:~:text=Model%20Context%20Length%20,See%20blog%20post%20for%20details). Store these vectors in the `scholarships` table alongside the scholarship data. Similarly, decide if student profiles will be embedded on the fly (most likely yes for matching). Ensure the Voyage API integration works (test with a sample text).
    
-   **Initial Matching Logic:** Implement a basic similarity search using pgvector. For example, given a dummy student profile, compute its embedding and run a kNN search in Postgres to retrieve top-N similar scholarships. This validates the end-to-end vector search pipeline early. Adjust `pgvector` query (use cosine or Euclidean distance) as needed for meaningful results.
    
-   **Frontend Progress:** Connect the profile form to a stub handler that, for now, just prints or logs the input. Prepare the UI flow for showing matched scholarships (e.g., a placeholder list). This sets up the structure for when the real matching and essays are integrated.
    

## Day 3: Implement Scholarship Pattern Profiler (Feature 1)

-   **LLM Prompt Design:** Create a prompt template for **Claude** that feeds in a scholarship description and asks for structured analysis. For example: *“Analyze the following scholarship description and identify: (a) the key priorities or criteria (e.g. academic merit, community service, financial need) and their relative weights, (b) the preferred tone or values emphasized (e.g. leadership, innovation, adversity), (c) any explicit constraints or requirements. Provide the output in JSON.”* This will form the basis of the Scholarship Pattern Profiler.
    
-   **Backend Functionality:** Develop a server-side function or offline script to run each scholarship description through the Claude API using the above prompt. Use **Claude Haiku 4.5** for these analysis calls to conserve budget (it offers near-frontier performance at roughly one-third the cost of Sonnet)[anthropic.com](https://www.anthropic.com/news/claude-haiku-4-5#:~:text=What%20was%20recently%20at%20the,more%20than%20twice%20the%20speed). Parse the LLM’s response (JSON) to extract the structured priorities and tone for each scholarship.
    
-   **Data Storage:** For each scholarship, save the extracted profile data (priorities, tone, constraints) in the database (either in new columns or a JSON field). This effectively gives each scholarship a “personality profile” that can later be used to tailor essays. Double-check a few outputs for accuracy (e.g., ensure weights sum up or major themes are captured correctly) and refine the prompt if necessary for consistency.
    
-   **Verification:** Run the profiler on a subset (maybe 5 scholarships first) to verify the output format. Adjust parsing logic to handle any edge cases (LLM might sometimes need few-shot examples if it struggles to format JSON reliably). Keep an eye on token usage per call to make sure analyzing ~50 scholarships stays within budget (these are relatively short texts, so it should be fine).
    
-   **Integration Consideration:** Plan how these scholarship profiles will be used in essay generation. For instance, note to later inject these priorities into the prompt (e.g., “Scholarship A values leadership (weight 0.7) and community service (0.3) with a formal tone”). This planning ensures Feature 1 and Feature 3 will be properly merged.
    

## Day 4: Implement Success Pattern Miner (Feature 2)

-   **Input Prep:** Take the collected scholarship **winner essays/stories** dataset. If the essays are long, summarize each story’s key points first (either manually or via LLM) to keep input concise. The goal is to identify common themes across these success stories.
    
-   **LLM Analysis:** Design a prompt for Claude to find recurring themes and narrative strategies. For example: *“Here are brief summaries of X scholarship-winning essays. Identify the common themes, values, or storytelling techniques that appear frequently across these winners (e.g. overcoming adversity, leadership roles, community impact, passion for field, etc.). Also note common narrative styles (e.g. personal anecdote, goal-oriented storytelling).”* Use **Claude Haiku 4.5** here as well if the input is large, to save cost, since Haiku can handle the analysis at lower cost while remaining fast.
    
-   **Theme Extraction:** Run the above prompt, possibly providing all summaries at once (if within context limits) to let Claude find patterns. If needed, do this in parts (e.g., analyze in two batches then combine results) to ensure quality. The output might be a list of recurring themes like *“many winners mention overcoming personal challenges, community service involvement, strong leadership in school clubs, and clear future aspirations related to the scholarship’s mission.”*
    
-   **Compile Success Patterns:** Synthesize the LLM’s findings into a concise set of “success patterns.” For example: **Themes:** overcoming adversity; community impact; leadership and initiative; passion for the field of study. **Narrative strategies:** use personal anecdotes, show growth over time, align personal goals with the scholarship’s values. These patterns will serve as guidelines to infuse into any essay draft.
    
-   **Data Storage:** Store these extracted patterns in a convenient form (could be a simple JSON or a constant in code) accessible during essay generation. We may not need a full database table since the dataset is small and mostly static.
    
-   **Validation:** Review the patterns for intuitiveness. Even if the data set is small, ensure they make sense (they likely will correspond to known scholarship essay clichés). This feature doesn’t directly show to the user, but it provides important context to improve essay quality. We will merge this by weaving these themes into the generated drafts on Day 5.
    

## Day 5: Build Multi-Scholarship Draft Generator (Feature 3)

-   **Scholarship Matching:** Implement the function to **match a student to top N scholarships**. When the user submits their profile, embed the profile text using Voyage 3.5 (same embedding space as scholarships) and perform a vector similarity search in Postgres to get the best matches. You can combine this with simple filters (if available, e.g., if a scholarship has a field like “STEM major required” and the student is STEM, etc.) for more accuracy. The result is a list of, say, top 3 scholarship IDs that are most relevant.
    
-   **Prompt Construction:** For each of the top N scholarships, assemble the prompt for Claude to generate a tailored essay draft. This prompt should merge inputs from **all three features**:
    
    -   *Scholarship info:* Include the scholarship’s name and a brief description, **plus its “profile” findings** from Feature 1 (e.g. “This scholarship prioritizes leadership and community service, and has a formal tone”).
        
    -   *Student profile:* Insert the key details of the student (from the form) – academic background, personal story highlights, goals – that the essay should center on.
        
    -   *Success patterns:* Insert the list of common winning themes from Feature 2 as suggestions (e.g. “In past winning essays, successful candidates often mention overcoming a challenge or their community impact. Keep this in mind.”).
        
    -   *Instructions:* Ask Claude to draft a personalized scholarship essay that highlights the student’s fit, aligning with the scholarship’s priorities and incorporating the success themes where relevant. Also specify any format constraints (e.g. “around 500 words, first-person narrative, engaging tone while remaining formal as required”).
        
-   **LLM Generation:** Call **Claude Sonnet 4.5** for each scholarship’s prompt to generate the essay draft. We choose Sonnet 4.5 here because it’s Anthropic’s most powerful model with superior reasoning and writing capabilities[anthropic.com](https://www.anthropic.com/news/claude-sonnet-4-5#:~:text=Claude%20Sonnet%204,gains%20in%20reasoning%20and%20math), which should yield high-quality, coherent essays. Given the budget, generating a few essays is fine – Sonnet’s higher cost is justified for the final output quality. Monitor token usage (each essay might be a few hundred tokens of prompt + output).
    
-   **Backend Implementation:** Wrap the above steps in a server function like `generateEssays(profileData)` which returns an array of generated essays with their scholarship names. Handle these calls sequentially (for simplicity) or in parallel if the platform supports it. Ensure to catch errors (if any API call fails, maybe skip that scholarship with an error message in the result).
    
-   **Frontend Display:** Develop the UI to present the results. For each recommended scholarship, show the scholarship title, maybe a one-liner about it, and the AI-generated essay draft. Use **shadcn/ui** components to make this look clean – e.g., a tab view or accordion for each essay so judges can easily read one at a time. Include a note like “Draft generated by AI – please edit before submitting” (just to clarify in demo). The essays should demonstrate how the content is tailored: ideally they reference the student’s experiences in light of each scholarship’s focus.
    
-   **Testing:** Do a full test with a sample student profile that you think is representative. Check that the essays indeed differ based on scholarship priorities (this confirms the merging of features worked). For instance, Scholarship A’s essay might emphasize leadership, while Scholarship B’s essay might highlight financial need if those were in their profiles. Tweak prompt wording as needed to sharpen this differentiation. By the end of Day 5, the core generation feature should be implemented.
    

## Day 6: End-to-End Integration and MVP Completion

-   **Integration Testing:** Connect the frontend to the backend for the full flow: profile form ➜ matching function ➜ LLM generation ➜ display results. Run the app locally through this sequence. This will likely reveal any integration bugs (e.g., data not being passed correctly, or an async issue with server functions). Fix any issues such as vector queries or null outputs. Ensure that each component (Feature 1 and 2 outputs) is being pulled in at the right time for Feature 3’s prompt.
    
-   **Prompt Refinement:** Evaluate the quality of the generated essays from the end-to-end run. If they seem too generic or miss important details, refine the prompts. For example, if the essay didn’t use the success patterns, make that part of the prompt more explicit (“be sure to include themes of X or Y if applicable”). If the tone is off, adjust instructions (maybe the scholarship profile tone needs to be emphasized more in text). Iterate quickly by testing small changes and re-running one example.
    
-   **Performance & Budget Check:** With N essays generated per run, measure how long it takes. If it’s slow (Claude might take a few seconds per essay), consider limiting N (e.g. top 3 scholarships) for the demo to keep it snappy. Also check the approximate tokens used in a typical generation. Ensure it’s within limits (we expect perhaps ~1,000 tokens per essay including prompt and output; 3 essays ~3,000 tokens per run, which is well within budget for multiple demo runs). The **pgvector** search is very fast (sub-second for 50 entries) so that’s fine.
    
-   **UI/UX Improvements:** Add a loading spinner or progress indicator when the user submits their profile, since essay generation might take 5–10 seconds with multiple calls. Ensure the UI remains responsive (perhaps generate essays one by one and stream them if possible, though TanStack’s streaming SSR could allow showing partial results). Also, add basic form validation or at least ensure empty fields are handled gracefully (maybe require the student to fill a minimum set of info).
    
-   **Milestone – Functional MVP:** By the end of Day 6, aim to have an **end-to-end functional prototype** covering all major features. At this point, a user (or judge) could use the app to get a personalized set of scholarship essays generated live. This is the crucial hackathon MVP milestone. If anything core is still incomplete, use the beginning of Day 7 to finish it. Otherwise, you’re ready to shift focus to polish and presentation. [tanstack.com](https://tanstack.com/start/latest/docs/framework/react/overview#:~:text=TanStack%20Start%20is%20a%20full,provider%20or%20runtime%20you%20want)
    

## Day 7: Buffer, Bug Fixes and Enhancements

-   **Buffer for Incomplete Tasks:** Use this day to catch up on any slips. If the end-to-end flow wasn’t fully working by Day 6, prioritize completing it now. For example, if the **Success Pattern Miner** output isn’t integrated yet, wire it into the prompt. Or if the scholarship profiling had issues, fix those (maybe some descriptions didn’t yield good JSON – handle those gracefully or manually adjust that data).
    
-   **Bug Fixing:** Test edge cases. What if the student profile is very short or very long? Try unusual inputs (a profile that doesn’t match any scholarship well) – does the system still return something sensible? Make small improvements: e.g., if two recommended scholarships are very similar, maybe diversify by picking the next one. Ensure the app doesn’t crash if Claude API fails; maybe add a simple error message like “Unable to generate essay for Scholarship X, please try again.”
    
-   **Optimize API Usage:** Review how often Claude is being called. The Scholarship Profiler (Feature 1) and Success Pattern analysis (Feature 2) ideally were done offline or cached so they don’t run every time. Make sure these results are reused for every user to stay within the $50 budget. The main ongoing cost is from generating essays (Feature 3). Given Claude Sonnet 4.5’s pricing of ~$3 per million input tokens and $15 per million output[anthropic.com](https://www.anthropic.com/news/claude-sonnet-4-5#:~:text=Claude%20Sonnet%204,at%20%243%2F%2415%20per%20million%20tokens) (total ~$18/M), and Haiku’s ~$1/$5 per million (total ~$6/M)[anthropic.com](https://www.anthropic.com/news/claude-haiku-4-5#:~:text=Claude%20Haiku%204,million%20input%20and%20output%20tokens), our usage should be safe. Emphasize using the cheaper Haiku model for any analysis or re-analysis tasks where top quality isn’t crucial, reserving Sonnet for final essay generation. This way, the unified system stays within budget while maximizing quality where it matters.
    
-   **Feature Merge and Tuning:** This is a good time to ensure the **three features truly work in unison**. For example, verify that the scholarship’s extracted priorities (Concept 1) are clearly reflected in the generated essay – you might even print out the scholarship profile in the results for demo purposes, or highlight sentences in the essay that tie to those priorities. Similarly, check that at least one of the success themes (Concept 2) appears in each essay (if not, you might tweak the prompt to encourage it). The goal is to make it evident that the prior analyses improved the drafts, which is key for the **innovation** angle.
    
-   **Optional Enhancements:** If all is well and time permits, consider small “nice-to-have” features:
    
    -   Implement a text input where a user can paste a new scholarship description and run the **Pattern Profiler** on the fly, showing the extracted priorities. This could be a cool demo to show the AI analysis live (though use it sparingly to conserve tokens).
        
    -   Add a toggle or option for using Claude Haiku 4.5 vs Sonnet 4.5 for generation, purely to demonstrate flexibility and mention cost savings (for the demo, you’ll likely stick to Sonnet for best output, but it’s a talking point).
        
    -   If using Qdrant vector DB is of interest, you could set up a Qdrant instance and quickly test swapping out the embedding search to Qdrant (since the data is small, it’s not necessary, but mentioning that the system can scale to an external vector DB might be worth a slide).
        
-   **Begin Presentation Prep:** Start outlining the pitch narrative. Jot down how you’ll explain the problem (students overwhelmed writing scholarship essays) and the solution (your app automates personalized drafts). Plan to emphasize how **Feature 1 + 2 + 3 together** make the solution stand out: unlike a generic essay generator, yours does *analysis of scholarships and success stories* to produce more tailored, high-quality content. This alignment with judging criteria (innovation and quality) should be highlighted.
    

## Day 8: UI Polish and Deployment

-   **UI/UX Refinement:** Give the application a visual polish. Use Tailwind CSS to ensure a cohesive design (spacing, font sizing, button styles). Implement any remaining **shadcn/ui** components for better UX – for example, a nicer form with proper labeled inputs and a submit button style, a loading spinner component or progress bar during generation, and an accordion/tabs for results that make it easy to navigate multiple essays. Keep paragraphs of the essay in an easy-to-read format (maybe a slightly larger font for the essay text and good line height). These details will make the demo more appealing and professional.
    
-   **User Testing:** Simulate a user experience: fill in the form with a variety of profile types (different majors, life stories) and see the output. This not only checks robustness but might also yield a particularly compelling example to use in your demo video or slides. If one student story led to an especially inspiring essay, note that scenario for showcasing. Also test on mobile or a small laptop screen if possible, since judges might view the demo on different devices – make sure important elements (like the “Generate” button or results) are visible without needing custom CSS fixes.
    
-   **Content Constraints:** Add any necessary limits or warnings for real-world sensibility. For instance, if an essay comes out extremely long, you might limit to ~500 words by instructing the model or truncating output for the demo (judges won’t read a huge essay anyway). You can also pre-set the student profile in the demo to something concise to keep generation focused. Essentially, tailor the content length and detail to what’s optimal to present.
    
-   **Deployment Setup:** It’s crucial to have the app live for the hackathon. Choose between **Fly.io** or **Railway** (both support deploying full-stack Node apps). Set up the project on the chosen hosting:
    
    -   Ensure environment variables (Claude API key, Voyage API key, DB URL, etc.) are added in the hosting config.
        
    -   Build and deploy the app. TanStack Start should bundle a Node server for SSR and API routes; verify that the build succeeds on the host.
        
    -   After deployment, test the live URL. Do a quick run-through (maybe with a smaller test profile to not waste tokens) to confirm everything works outside your local environment.
        
-   **Deployment Debugging:** If any issues arise (e.g., memory limits, cold start delays on serverless, or connection issues to the database), address them now. Perhaps use a smaller instance on Fly or adjust a setting. Ensure that vector extension is enabled on the cloud Postgres (if using a managed DB, pgvector must be installed there too). This might involve a quick step on the DB setup (most modern hosted Postgres allow extensions like pgvector).
    
-   **Final Pre-Demo Checks:** Now that the app is live and polished, consider how to handle the demo to avoid hiccups:
    
    -   Possibly implement a flag or mode to reuse a cached output for the demo user profile, just in case the API rate limits or internet is flaky during a live demo recording. For example, you could store one successful run’s essays and have an option to load those instead of calling the API. This acts as a fallback to show results instantly if needed.
        
    -   However, you still want to demonstrate the live AI capability, so plan to do at least one live generation in the video (maybe for one scholarship) to prove it works, then you can fast-forward or cut to final results for brevity.
        
-   By the end of Day 8, you should have a **fully functional, nicely designed application deployed online**, ready for demonstration.
    

## Day 9: Pitch Deck and Demo Video Preparation

-   **Craft the Narrative:** Begin by clearly defining the story your pitch will tell. Highlight how students struggle to tailor each scholarship application, and how your AI assistant innovatively solves this by analyzing scholarships and past winners to generate better essays. Make sure this is framed as a novel approach (for innovation points) and a valuable aid (for impact).
    
-   **Slide Deck Creation:** Prepare a slide deck (~5-7 slides) to support your pitch. Key slides to include:
    
    1.  **Problem Statement:** e.g., *“Students waste countless hours writing scholarship essays. It’s hard to know what each scholarship really wants.”* Use a few stats or an emotive graphic if available (but keep it simple).
        
    2.  **Solution – Scholarship Essay Copilot:** Introduce your web app that *“analyzes scholarship criteria and winning essays to draft personalized applications for you.”* A high-level diagram might help: show three components (Profiler, Miner, Generator) feeding into the final result.
        
    3.  **How It Works (Innovation):** One slide to explain the pipeline. For instance, a small flowchart: Scholarship descriptions → **LLM analysis** → priorities; Winner stories → **LLM analysis** → themes; Student profile + those outputs → **LLM essay generator** → draft essays. Emphasize that this chain is what makes the solution unique.
        
    4.  **Tech Stack (Technical Execution):** List the technologies used (LLMs, embeddings, vector DB, TanStack Start, etc.). You can briefly note why each was chosen (e.g., “Voyage-3.5 embeddings + pgvector for semantic matching of student & scholarships[tigerdata.com](https://www.tigerdata.com/blog/postgresql-as-a-vector-database-using-pgvector#:~:text=With%20some%20help%20from%20the,text%20strings%20for%20OpenAI%E2%80%99s%20models), Claude 4.5 for natural language generation”). This shows you implemented a complex, modern stack – great for technical score.
        
    5.  **Demo Highlights (Draft Quality):** If possible, include a before-and-after or an example excerpt: e.g., show a snippet of a generated essay that clearly references something from the scholarship’s priorities and the student’s story (to prove quality and personalization). Even a quote like *“...thus, I started a coding club to share my passion (aligning with the innovation focus of this scholarship)...”* can illustrate how the AI output is on-point.
        
    6.  **Conclusion/Impact:** End with how this could increase students’ success, save time, etc., and perhaps future plans (like scaling to all scholarships, or a marketplace). Keep it optimistic and aligned with hackathon goals (innovation improving lives, etc.).
        
-   **Demo Video Planning:** Outline the sequence for the 2–3 minute demo video. Typically: a 10-20 second intro of the problem/solution, then screen recordings of the app in action with voiceover or captions, and a closing statement. Plan the steps you will show on screen:
    
    -   Start with the homepage/form. Show a user filling in their profile details (pick a compelling example, e.g., a student who overcame a challenge and is applying for STEM scholarships).
        
    -   Then click “Generate” and perhaps cut to a loading indicator briefly. If possible, live-record the actual generation for one essay to show the realtime aspect (or simulate it).
        
    -   Show the results: scroll through one of the generated essays, pointing out (either via voice or a highlight effect) how it matches the scholarship’s asked qualities (maybe overlay text like “Note: mentions leadership and community – priorities identified by AI”).
        
    -   If multiple essays were generated, demonstrate switching between them (e.g., click another scholarship tab to show another draft, indicating the system did this for each automatically).
        
    -   End with either the app’s name or a tagline like “AI-powered Scholarship Essay Assistant – helping you apply smarter, not harder!”
        
-   **Practice Run:** Do a practice voiceover or write a script for each part of the video. Ensure you mention the key judging points: *innovation* (the unique multi-step AI approach), *quality* (better essays through personalization), and *technical execution* (highlight the stack or the fact it’s fully functional and live). Time your script with the screen recording to make sure it fits in 3 minutes.
    
-   **Record Drafts:** Start capturing screen recordings using your deployed app. You might take several takes to get a smooth operation (no typos, no waiting too long). If generation is slow, you can edit the video to trim waiting times. Also consider adding captions or annotations in post-editing to reinforce what’s happening (many judges will watch without audio).
    
-   **Feedback:** If possible, get a friend or teammate to review your slides or a rough cut of the video. Fresh eyes might catch confusing parts. This is the day to iterate on the presentation content so it’s clear and compelling.
    

## Day 10: Final Polishing, Dry Run, and Submission

-   **Final Demo Video Edits:** Complete the editing of the demo video. Add any voiceover narration or background music if desired (make sure it doesn’t overpower the explanation). Ensure the final video file meets the hackathon requirements (length, format). Double-check that the content clearly shows off the unified system and its benefits. Every feature integrated should get at least a mention or visual cue in the video to maximize credit from judges.
    
-   **Pitch Deck & Q&A Prep:** Finalize the slide deck and rehearse the pitch alongside the demo video or live demo if you’ll present in real-time. Practice speaking within a 3-5 minute window, covering all important points without rushing. Prepare for potential judge questions – for example:
    
    -   *“How do you ensure the essays are unique and not just templates?”* (Answer: because we leverage the student’s own profile and specific scholarship criteria, the content is highly tailored each time).
        
    -   *“What was the hardest technical challenge?”* (Perhaps integrating multiple AI components and keeping within token budget, or working with a new framework like TanStack Start).
        
    -   *“How do you see this scaling?”* (Answer: with more data and possibly fine-tuned models, plus the optional integration of real-time scraping to constantly update scholarships).
        
-   **Last-Minute Quality Checks:** Run through the entire app once more in the deployed environment. This is a sanity check that nothing broke in the last edits (e.g., API keys still work, the DB has the necessary data, etc.). It also re-warms any serverless functions in case the demo is live. Prepare a backup in case the live system fails during judging (e.g., have the video or screenshots ready to show instead).
    
-   **Submission Materials:** Ensure you have all required components ready to submit:
    
    -   The live demo URL (and perhaps credentials if needed, but ideally it’s open).
        
    -   The pitch video file uploaded to the platform or YouTube as required.
        
    -   The slide deck PDF if they need it.
        
    -   A written description of the project for the submission page – repurpose content from your slides: what it does, how it works (mention LLMs, vector DB, etc.), and why it’s cool. Include instructions if judges want to test it themselves (e.g., “enter any profile to see AI-generated essays; note: limit 3 essays per try to conserve token usage”).
        
-   **Submit and Breathe:** Aim to submit a few hours before the final deadline to avoid any technical difficulties with the submission portal. Once submitted, you can relax a bit. If there’s a live demo session, be ready to present as rehearsed. Have your environment and browser set up for the demo, with the app pre-loaded and your example profile handy to input. A quick dry run right before presenting is wise.
    
-   **Judging Focus:** During the pitch or Q&A, circle back to the judging criteria one more time:
    
    -   **Innovation:** Stress that the project isn’t just using an LLM naively; it’s chaining multiple AI analyses (pattern profiling and theme mining) to create something new and more effective[anthropic.com](https://www.anthropic.com/news/claude-haiku-4-5#:~:text=What%20was%20recently%20at%20the,more%20than%20twice%20the%20speed)[anthropic.com](https://www.anthropic.com/news/claude-sonnet-4-5#:~:text=Claude%20Sonnet%204,gains%20in%20reasoning%20and%20math).
        
    -   **Quality of Output:** If you have any metrics or anecdotes (maybe compare a raw GPT-4 essay vs your tailored essay), mention that your approach yields more relevant essays, which could improve students’ success rate.
        
    -   **Technical Execution:** Mention that you managed to implement this full stack in a short time: from frontend to backend, vector search, and two different Claude models – all hosted and working. This demonstrates skill in integrating multiple technologies into a cohesive product.
        
-   With a polished app and a well-prepared presentation, by the end of Day 10 you’ll be ready to impress the judges with a **unified AI system** that personalizes scholarship recommendations and essay drafts, hopefully maximizing your hackathon score on all fronts