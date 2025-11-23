# QA Review – Dashboard, Backend, and UI wiring

## Findings

1. **Dashboard UI ignores cookie-based session** – `/dashboard` only reads `localStorage` for `scholarship_student_id`/`student_id` before calling `/api/dashboard`, even though the server exposes a HttpOnly `student_id` cookie helper. Users who authenticated via cookies (the default secure flow) will hit the hard error and never load the dashboard because their ID is not mirrored into localStorage. 【F:src/routes/dashboard.tsx†L41-L74】

2. **Dashboard API allows arbitrary student data access** – `/api/dashboard` accepts any UUID `student_id` query param and never checks it against the caller’s cookie or auth. Any client can exfiltrate another student’s applications by guessing/pasting a UUID. There is no admin check or ownership guard before returning drafts, plans, and metadata. 【F:src/routes/api/dashboard.ts†L23-L97】

3. **Draft length falsely marks applications as submitted** – Progress is derived from `(draft_content.length / 2000) * 100` with no upper bound. Typing a 2,500-character draft sets `progress` to 125%, which trips `isSubmitted` (`progress >= 100`) and labels the application as “Submitted”/“Ready” even if no tasks are done or nothing was actually submitted. 【F:src/routes/api/dashboard.ts†L63-L88】

4. **Demographic filters never sent from Matches page** – `buildEligibility` omits `gender` and `ethnicity` from the profile and only forwards `backgroundTags`. The backend’s demographic hard filter expects `gender`/`ethnicity` to derive tags (e.g., `women`, `indigenous`), so UI users who provide gender/ethnicity get zero demographic filtering and mismatched results. 【F:src/routes/matches.tsx†L746-L783】

5. **Matches gate keeps valid cookie sessions out** – The `/matches` route `beforeLoad` hard-redirects to `/login` when localStorage lacks a student id, ignoring the server-side cookie session. Cookie-authenticated users are bounced to login despite being signed in, breaking the flow and making SSR navigation brittle. 【F:src/routes/matches.tsx†L20-L36】

