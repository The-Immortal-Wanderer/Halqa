# Halqa (حلقہ) — Your neighborhood, organized.

A hyperlocal, address-verified community platform for Pakistani neighborhoods.
Built for the **AI for Civic Innovation Hackathon 2026**.

**Tagline:** Your neighborhood, organized. / آپ کا حلقہ، منظم۔

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript strict, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, async throughout |
| Database | Supabase (PostgreSQL), Supabase Auth, Supabase Storage, Supabase Realtime |
| AI Layer | Anthropic Claude API (claude-sonnet-4-20250514) via FastAPI |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Icons | @phosphor-icons/react |
| Typography | Plus Jakarta Sans + Noto Nastaliq Urdu (Google Fonts) |

---

## Prerequisites

- **Node.js** 20.x
- **Python** 3.11+
- **Supabase CLI** (for local database migrations)
- **pnpm** or npm (for frontend)

---

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase project credentials
npm run dev
```

The frontend dev server starts at `http://localhost:3000`.

### Environment Variables (frontend/.env.local)

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API |
| `NEXT_PUBLIC_API_URL` | Backend URL (`http://localhost:8000/api/v1` for dev) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Generated VAPID key for Web Push |

---

## Backend Setup

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Supabase and Anthropic credentials
uvicorn app.main:app --reload --port 8000
```

The API server starts at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Health Check

```bash
curl http://localhost:8000/health
# → {"data":{"status":"ok","environment":"development"},"error":null}
```

### Environment Variables (backend/.env)

| Variable | Source |
|---|---|
| `SUPABASE_URL` | Supabase project → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API (service role, keep secret) |
| `SUPABASE_ANON_KEY` | Supabase project → Settings → API (anon/publishable key) |
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys |
| `VAPID_PUBLIC_KEY` | Generated VAPID key pair |
| `VAPID_PRIVATE_KEY` | Generated VAPID key pair |
| `VAPID_EMAIL` | Your contact email for VAPID |
| `INTERNAL_SERVICE_TOKEN` | Generate a random 32-char token |
| `ENVIRONMENT` | `development` or `production` |
| `LOG_LEVEL` | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins |

---

## Supabase Setup

```bash
# Link your Supabase project
supabase link --project-ref <your-project-ref>

# Apply migrations
supabase db push

# Reset with seed data (development only)
supabase db reset
```

Migrations live in `supabase/migrations/`. Seed data is embedded in the initial migration file (`20260611_001_initial_schema.sql`).

---

## Project Structure

```
/
├── docs/                          # Architecture and plan documents
│   ├── ARCHITECTURE.md            # System architecture, API contract, design tokens
│   ├── PRD.md                     # Product requirements
│   ├── Database-Schema.md         # Database schema, RLS policies, migrations
│   ├── Backend-Plan.md            # Backend implementation plan
│   ├── Frontend-Plan.md           # Frontend implementation plan
│   └── features/                  # Feature specifications
├── frontend/                      # Next.js App Router frontend
│   ├── app/                       # Route pages and layouts
│   ├── components/                # React components
│   ├── hooks/                     # Custom React hooks
│   ├── lib/                       # Client libraries (Supabase, API)
│   ├── types/                     # Shared TypeScript types
│   └── public/                    # Static assets, PWA files
├── backend/                       # FastAPI backend
│   ├── app/
│   │   ├── core/                  # Config, auth, error codes, logging
│   │   ├── db/                    # Database client and dependencies
│   │   ├── routers/               # HTTP route handlers
│   │   ├── services/              # Business logic
│   │   ├── repositories/          # Data access layer
│   │   └── schemas/               # Pydantic models
│   └── tests/                     # Test suite
├── supabase/
│   └── migrations/                # SQL migration files
├── .gitignore
└── README.md
```

---

## Development

- Frontend runs on `:3000`, backend on `:8000`
- API base URL for frontend dev: `http://localhost:8000/api/v1`
- Backend auto-reloads on file changes (uvicorn --reload)
- Supabase Realtime subscriptions go directly from browser to Supabase

---

## Deployment

- **Frontend**: Vercel (root directory: `frontend/`)
- **Backend**: Render (root directory: `backend/`)
- **Database**: Managed Supabase project (migrations applied via CLI)

See deployment configs in `frontend/vercel.json` and `backend/render.yaml`.

---

## License

Hackathon prototype — not licensed for production use.
