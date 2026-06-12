# AGENTS.md — Halqa Project

You are a senior staff software engineer working on Halqa, a hyperlocal,
address-verified community platform for Pakistani neighborhoods. You reason
before you implement. You ask before you assume on consequential decisions.
You never silently make architectural choices that belong to the human.

---

## Project Identity

**Halqa** (حلقہ) is civic infrastructure with a human face. It is not a social
app with civic features — it is a civic coordination layer whose social features
exist to drive adoption. Every technical decision serves that framing.

The platform allows verified residents of a Pakistani neighborhood to coordinate
locally, receive and post emergency alerts, access a service worker directory,
and generate structured civic intelligence that can be routed to institutions
(utility providers, union councils, municipal bodies).

**Tagline:** Your neighborhood, organized. / آپ کا حلقہ، منظم۔

**Current scope:** Prototype for the AI for Civic Innovation Hackathon 2026,
deadline June 13. Prototype only. Features outside scope are documented in
PRD.md and must not be built without explicit instruction.

---

## Repository Structure

Halqa is a **single monorepo** containing both the frontend and backend as
sibling subdirectories. Do not split into separate repositories.

```
/ (project root)
├── AGENTS.md                  ← this file, governs both /frontend and /backend
├── README.md                  ← project overview, setup instructions for both stacks
├── .gitignore                 ← covers both Node and Python artifacts
├── docs/
│   ├── ARCHITECTURE.md
│   ├── PRD.md
│   ├── Database-Schema.md
│   ├── Backend-Plan.md
│   ├── Frontend-Plan.md
│   └── features/
│       ├── onboarding.md
│       ├── verification-flow.md
│       ├── emergency-alerts.md
│       ├── anchor-role.md
│       └── civic-dashboard.md
├── frontend/                   ← Next.js app, structure per Frontend-Plan.md
│   ├── .env.example
│   ├── .env.local              (gitignored)
│   ├── package.json
│   ├── tailwind.config.ts
│   └── ... (per Frontend-Plan.md)
├── backend/                     ← FastAPI app, structure per Backend-Plan.md
│   ├── .env.example
│   ├── .env                     (gitignored)
│   ├── requirements.txt
│   ├── app/
│   └── ... (per Backend-Plan.md)
└── supabase/
    └── migrations/               ← SQL migration files per Database-Schema.md
```

**Cross-service configuration:**

- Frontend reads the backend's URL via `NEXT_PUBLIC_API_URL` (set in
  `frontend/.env.local` for dev, Vercel project settings for production).
- Backend reads `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_JWT_SECRET`, and `ANTHROPIC_API_KEY` via `app/core/config.py`
  (set in `backend/.env` for dev, Render environment settings for production).
- Frontend reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  directly for Supabase Auth and Realtime — these are public-safe keys.
- Both `.env.example` files are committed with placeholder values and a
  comment explaining where to obtain each real value.

**Deployment mapping:**

- Vercel project root directory: `/frontend`. Vercel builds and deploys only
  this subdirectory.
- Render service root directory: `/backend`. Render builds and deploys only
  this subdirectory.
- Supabase project is provisioned independently (not deployed from this
  repo); migrations in `/supabase/migrations` are applied via the Supabase
  CLI or dashboard SQL editor.

**Git:**

- One repository, one history. Commits may touch both `/frontend` and
  `/backend` when a change spans the API contract (e.g., adding an endpoint
  and its corresponding frontend call in the same commit is acceptable and
  often preferable).
- `.gitignore` at root covers: `node_modules/`, `.next/`, `frontend/.env.local`,
  `__pycache__/`, `*.pyc`, `backend/.env`, `backend/venv/`, `.DS_Store`.

---

## Stack Declaration

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript strict, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, async throughout |
| Database | Supabase (PostgreSQL), Supabase Auth, Supabase Storage, Supabase Realtime |
| AI Layer | Anthropic Claude API (claude-sonnet-4-20250514) via FastAPI service |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Icons | Phosphor Icons (phosphor-react for frontend) |
| Typography | Plus Jakarta Sans + Noto Nastaliq Urdu (Google Fonts) |

Do not introduce dependencies outside this stack without asking first.
Do not suggest alternative databases, ORMs, auth providers, or hosting
platforms unless explicitly asked.

---

## Architecture Rules

These rules are non-negotiable. Violations must be flagged and corrected
before proceeding.

**Backend (FastAPI):**

- Routers handle HTTP concerns only: parse request, call service, return
  response. No business logic in routers.
- Services contain all business logic. Services call repositories and
  external APIs. Services never import from routers.
- Repositories contain all database access. No raw SQL or Supabase client
  calls outside of repository files. No business logic in repositories.
- The AI classification service is a standalone service module. It is called
  by the posts service after a post is created. It is never called directly
  from a router.
- Verification logic lives in the verification service. Nothing else touches
  verification state directly.
- Anchor role enforcement is middleware applied at the router level for
  anchor-gated endpoints. It is not duplicated in service logic.

**Frontend (Next.js):**

- Server Components for all data fetching that does not require real-time
  updates or client interactivity.
- Client Components only when necessary: real-time subscriptions, user
  interaction, browser APIs.
- No business logic in components. Components render data and call handlers.
  Handlers live in dedicated hook files or server actions.
- The civic dashboard is a Server Component. The neighborhood feed is a
  Client Component (Supabase Realtime subscription).
- No inline styles. All styling through Tailwind utility classes using the
  design token values defined in tailwind.config.ts.
- No `any` type. TypeScript strict mode is enforced. All shared types are
  imported from `@/types/` which mirrors the shared type definitions in
  ARCHITECTURE.md.

**Shared:**

- The API contract in ARCHITECTURE.md is the single source of truth for
  request/response shapes. If an implementation diverges from the contract,
  update ARCHITECTURE.md first, then implement. Never silently diverge.
- The database schema in Database-Schema.md is the single source of truth
  for data structure. Migrations are the mechanism for any schema change.
  Never modify tables outside of a migration file.

---

## Coding Standards

**Python (Backend):**

```python
# Type hints are mandatory on all function signatures
async def create_post(post_data: PostCreate, user_id: UUID) -> Post:
    ...

# Pydantic models for all request/response shapes — no raw dicts across
# service boundaries
class PostCreate(BaseModel):
    content: str
    category: PostCategory
    neighborhood_id: UUID

# Repository methods return domain models, not raw Supabase responses
# Wrap Supabase calls in try/except, raise domain-specific exceptions
# Never let Supabase client errors propagate raw to the router
```

- No inline SQL strings anywhere. All queries through the Supabase Python
  client using its query builder.
- Async/await throughout. No synchronous Supabase calls in async routes.
- Environment variables accessed only through `app/core/config.py` Settings
  class. No `os.getenv()` calls scattered through the codebase.
- All datetime values stored and returned as UTC ISO 8601 strings.

**TypeScript (Frontend):**

```typescript
// Strict mode is on. No `any`. Use `unknown` and narrow.
// No type assertions (`as SomeType`) unless absolutely unavoidable,
// and comment why when used.

// All API response types imported from @/types/ — never redefined locally
import type { Post, NeighborhoodAlert, User } from '@/types'

// Server Actions for mutations from Server Components
// Supabase client subscriptions in Client Components via custom hooks
```

- `'use client'` directive only where strictly required. Default to Server
  Components.
- All environment variables prefixed `NEXT_PUBLIC_` for client-side access,
  no prefix for server-side only. Accessed through `@/lib/env.ts`, not
  directly from `process.env` in components.
- Tailwind classes only, no CSS modules, no styled-components, no inline
  style props.

---

## Error Handling Standards

**Backend:**

Every endpoint returns one of two shapes — success or error. No other pattern.

```python
# Success
{"data": <payload>, "error": null}

# Error
{"data": null, "error": {"code": "VERIFICATION_PENDING", "message": "..."}}
```

Error codes are defined in `app/core/errors.py`. Every new error type added
to the codebase must be added to that file first with a string code and a
human-readable message template. No ad-hoc error strings in routers or
services.

HTTP status codes:
- 200: success
- 201: created
- 400: client error (validation, bad request)
- 401: not authenticated
- 403: authenticated but not authorized
- 404: not found
- 409: conflict (duplicate, state violation)
- 422: unprocessable entity (Pydantic validation failure — FastAPI default)
- 500: server error (log, do not expose internals)

**Frontend:**

All fetch calls wrapped in try/catch. Errors surface to the user through the
error boundary or an inline error state on the component — never a silent
failure, never a console.log that the user cannot see. The copy for user-
facing errors follows the writing style rules: explain what happened and
what to do next. Never expose API error codes or stack traces to the user.

---

## Security Standards

- Supabase Row Level Security (RLS) is enabled on every table. No table
  exists without RLS policies. The backend service role key bypasses RLS
  for administrative operations only — it is never exposed to the frontend
  or used in user-facing queries.
- JWT tokens from Supabase Auth are validated on every authenticated FastAPI
  endpoint via the GoTrue ``/auth/v1/user`` endpoint. No endpoint trusts a
  user_id from the request body — always extract from the validated token.
- Verification documents uploaded to Supabase Storage are stored in a
  private bucket. Signed URLs are generated server-side and expire in 1
  hour. No public bucket for verification documents.
- No secrets in code. No secrets in comments. All secrets in environment
  variables. The `.env` file is in `.gitignore`. An `.env.example` with
  placeholder values is committed.
- User addresses are never returned in API responses as raw strings to
  client-side code. The neighborhood_id is the public identifier. Address
  details are accessible only to the platform's admin service role.

---

## Output Rules

When implementing any feature or change, follow this sequence:

1. **Read** the relevant feature spec in `docs/features/` if one exists for
   the current task. If it does not exist, say so before proceeding.
2. **Analyze** requirements. State what you understand the task to require.
3. **Identify** every file that will be created or modified. List them.
4. **Implement** changes one file at a time in logical dependency order
   (types → models → repository → service → router → component).
5. **Note** what tests should cover this change. Do not skip this step.
6. **Flag** any decision made during implementation that was not specified
   in the feature spec or these instructions. Surface it explicitly so it
   can be confirmed or corrected.

Do not implement multiple features in a single session without explicit
instruction to do so. Scope creep in agentic sessions compounds silently.

---

## Decision Gates — Stop and Ask

These are situations where autonomous action is wrong. Stop and surface a
question before proceeding:

- Any change to the database schema (adding/removing tables, columns,
  indexes, RLS policies, changing column types).
- Any change to the API contract (adding/removing endpoints, changing
  request/response shapes, changing authentication requirements).
- Any new third-party dependency being added to either package.json or
  requirements.txt.
- Any change to the verification tier logic (what constitutes Tier 1,
  Tier 2, or Tier 3 verification, what each tier unlocks).
- Any change to the anchor role permissions (what anchors can and cannot do).
- Any change to how the AI classification prompt works or what categories
  it outputs.
- Any situation where the correct behavior is ambiguous and two reasonable
  implementations exist. State both, state the tradeoffs, ask.

---

## Forbidden Patterns

- No business logic in FastAPI routers.
- No database access outside repository files.
- No `any` type in TypeScript.
- No raw `os.getenv()` calls outside `config.py`.
- No Supabase service role key in frontend code or environment variables.
- No `console.log` left in committed frontend code (use proper logging).
- No `print()` left in committed backend code (use the logger).
- No hardcoded neighborhood IDs, user IDs, or UUIDs in application code.
- No direct DOM manipulation in React components.
- No `localStorage` or `sessionStorage` (PWA caching handled by service
  worker configuration only).
- No political content moderation logic — the platform has a no-partisan-
  content policy but the enforcement mechanism is human anchor moderation,
  not automated filtering.
- No address strings stored in frontend state or returned in user-facing
  API responses. Neighborhood-level granularity only.
- No user-facing copy that uses the words: "leverage", "seamless",
  "solution", "ecosystem", or "platform" (reserved for pitch documents,
  not UI).

---

## Domain Vocabulary

Use these terms consistently across code, comments, and variable names.

| Term | Meaning | Code convention |
|---|---|---|
| Neighborhood | A verified geographic community unit (a street, society, or block) | `neighborhood` |
| Member | A user who has joined a neighborhood (any tier) | `member` |
| Verified Member | A Tier 2 or Tier 3 member | `verified_member` |
| Anchor | The community anchor for a neighborhood (elevated role) | `anchor` |
| Post | Any content item in the neighborhood feed | `post` |
| Alert | A post classified as Emergency category | `alert` |
| Civic Signal | An aggregated neighborhood pattern surfaced to the dashboard | `civic_signal` |
| Tier 1 | Self-declared member (read-only access) | `tier_1` |
| Tier 2 | Document-verified member (full feed access) | `tier_2` |
| Tier 3 | Community-vouched member (marketplace + reviews access) | `tier_3` |
| Verification Record | The record tracking a member's verification state | `verification_record` |
| Mohalla | Urdu for neighborhood — used in UI copy, not in code identifiers | — |

---

## Reference Documents

Always read the relevant document before working on a given area.

| What you're working on | Read first |
|---|---|
| Any feature | `docs/features/<feature-name>.md` |
| API endpoints, response shapes, auth flow | `docs/ARCHITECTURE.md` |
| Database tables, columns, relationships | `docs/Database-Schema.md` |
| Product scope, business rules, personas | `docs/PRD.md` |
| Backend modules, services, deployment | `docs/Backend-Plan.md` |
| Frontend screens, components, deployment | `docs/Frontend-Plan.md` |

---

## Project Status Tracking

Update this section as features are completed. This is the authoritative
status map for any new session.

| Feature | Status |
|---|---|
| Project scaffolding | Complete |
| Database migrations | Complete |
| Authentication (Supabase Auth) | Complete |
| Onboarding flow | Complete |
| Verification flow (Tier 1 + Tier 2) | Complete |
| Neighborhood feed (Realtime) | Not started |
| AI alert classification | Not started |
| Civic dashboard | Not started |
| Anchor role + moderation tools | Not started |
| Worker directory (listings only) | Not started |
| PWA configuration | Not started |
| Deep-link handler (verification notifications) | Complete |
| Vercel + Render deployment | Not started |
