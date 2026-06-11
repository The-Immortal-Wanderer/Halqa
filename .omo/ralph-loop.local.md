---
active: true
iteration: 1
max_iterations: 500
completion_promise: "VERIFIED"
initial_completion_promise: "DONE"
verification_attempt_id: "0c98a310-793e-415b-8455-73ac1bb3c536"
verification_session_id: "ses_14addf186ffeWUMOUbVl8p6plT"
started_at: "2026-06-11T05:05:26.243Z"
session_id: "ses_14aedd962ffeKKT7JwB77asi9E"
ultrawork: true
verification_pending: true
strategy: "continue"
message_count_at_start: 0
---
Task: Scaffold the Halqa monorepo per AGENTS.md and docs/.

Read first:
- AGENTS.md (especially "Repository Structure" and "Stack Declaration" sections)
- docs/Frontend-Plan.md (project structure section)
- docs/Backend-Plan.md (project structure section)
- docs/Database-Schema.md (for migration file scaffolding only — do not
  write table definitions yet, just the migration file structure)

Scope — scaffolding only, no feature logic:

1. Initialize the monorepo structure exactly as described in AGENTS.md
   "Repository Structure": root AGENTS.md (already exists), README.md,
   .gitignore, docs/ (already exists), frontend/, backend/, supabase/migrations/

2. /frontend — Next.js 14+ App Router, TypeScript strict mode, Tailwind CSS
   configured with the Halqa design tokens (colors, fonts, spacing, radius
   from the visual identity system referenced in Frontend-Plan.md). Install
   Phosphor Icons, Plus Jakarta Sans + Noto Nastaliq Urdu via next/font or
   Google Fonts. Create the folder structure per Frontend-Plan.md (app/,
   components/, lib/, types/, etc.) with placeholder/empty files where
   appropriate — do not implement screens yet. Set up tailwind.config.ts
   with all design tokens as CSS variables/theme extensions.

3. /backend — FastAPI project structure per Backend-Plan.md (app/routers/,
   app/services/, app/repositories/, app/models/, app/core/, etc.).
   app/core/config.py with the Settings class reading the env vars listed
   in AGENTS.md "Cross-service configuration". A working /health endpoint
   that returns {"data": {"status": "ok"}, "error": null} per the error
   handling standard. requirements.txt with FastAPI, uvicorn, supabase-py,
   pydantic, python-jose (for JWT validation), httpx, anthropic.

4. /supabase/migrations/ — create an empty first migration file with the
   correct naming convention/timestamp format for Supabase CLI, no table
   definitions yet (that's the next step, separate task).

5. Root files: README.md (brief setup instructions for both stacks —
   how to run frontend dev server, how to run backend dev server, how to
   apply migrations). .gitignore covering both Node and Python artifacts
   plus env files, exactly as listed in AGENTS.md.

6. .env.example in both /frontend and /backend with placeholder values and
   comments explaining where each value comes from, per AGENTS.md
   "Cross-service configuration".

7. Confirm both stacks build and run locally:
   - Frontend: blank Next.js app starts on dev server, no errors.
   - Backend: uvicorn starts, /health returns the expected shape.

8. Prepare (but do not necessarily complete, if it requires credentials
   you don't have) deployment config: vercel.json or Vercel project
   settings notes for root directory /frontend, and a render.yaml or
   notes for root directory /backend with build/start commands.

Decision gates from AGENTS.md still apply in ultrawork mode — specifically:
do not add any dependency outside the Stack Declaration without flagging it
first. If something in Frontend-Plan.md or Backend-Plan.md's structure
section is ambiguous or incomplete, state both reasonable interpretations
and ask rather than choosing silently.

Completion condition: both /frontend and /backend run locally without
errors, /health responds correctly, folder structures match the plans,
and AGENTS.md "Project Status Tracking" is updated to mark "Project
scaffolding" as Complete.

When fully complete, output <promise>DONE</promise>.
