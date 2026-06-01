# Inculcate

AI-assisted study-abroad platform — **AI elevates, humans execute.** AI handles
data-heavy discovery and matching across universities in 193 countries; expert
counselors handle applications, documents, visas, accommodation, and travel.

> **All 7 epics complete.** Live demo: https://inculcate.vercel.app

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind v4 + shadcn-style UI |
| Backend | Next.js Route Handlers + Server Actions (modular service layer in `src/server`) |
| DB | PostgreSQL (Neon) + Prisma (migration-first) |
| Auth | Auth.js (NextAuth v5), credentials + JWT sessions, RBAC |
| AI | **Synthetic, key-free** engines behind swappable provider interfaces (Claude API drops in later) |
| Storage / Integrations | Swappable interfaces — DB-backed blob store + stubbed flight/loan providers |

## Features by epic

1. **Foundation** — scaffold, full data model, Auth.js + 4-role RBAC, audit log, role dashboards, seed.
2. **Profile & Catalog** — student intake wizard; admin university/program/scholarship CRUD; CSV import; filtered search.
3. **AI Matching** — synthetic embeddings + matching engine → fit score, admission probability, risk + rationale; compare & shortlist (`/student/matches`).
4. **AI Counselor** — profile-aware RAG chat over the catalog + "talk to a human" handoff → Lead + counselor notification (`/student/counselor`).
5. **Applications & Tasks** — application state machine + deadline tracker; document vault (DB-backed storage) with RBAC download; counselor task queue.
6. **Phase-2 Execution** — SOP/LOR/essay assistant; visa cases with country checklists; finance estimator + loan tracking; accommodation + travel (stubbed flights).
7. **CRM & Analytics** — lead pipeline + assignment; conversion funnel, counselor performance, partner-university/commission tracking (`/admin/analytics`).

> All AI/integration is synthetic and key-free per the demo brief — each lives behind an interface
> (`EmbeddingProvider`, `CounselorProvider`, `StorageProvider`, `FlightProvider`, writing provider)
> so a real Claude/embedding/S3/GDS backend swaps in without touching callers. No "visa/admission
> guarantee" copy anywhere; AI outputs are flagged for human review.

## Prerequisites

- Node 20+ (tested on 24)
- A PostgreSQL database. Pick one:
  - **Docker** (recommended): `docker compose up -d` — starts Postgres+pgvector on `:5432`.
  - **Hosted free tier**: [Neon](https://neon.tech) or [Supabase](https://supabase.com) —
    paste the connection string into `DATABASE_URL`.

## Setup

```bash
# 1. Install deps
npm install

# 2. Configure env
cp .env.example .env          # then edit DATABASE_URL + AUTH_SECRET
#   AUTH_SECRET: run `npx auth secret` (or any 32+ char random string)

# 3. Start a database (choose one)
docker compose up -d          # OR point DATABASE_URL at Neon/Supabase

# 4. Create schema + seed demo data
npm run db:migrate            # creates tables via migration
npm run db:seed               # one user per role + demo universities

# 5. Run
npm run dev                   # http://localhost:3000
```

> No Docker and no hosted DB yet? The app boots and public pages render, but
> login and dashboards need a database (they read/write Postgres).

## Demo logins (after seeding)

Password for all: `Passw0rd!`

| Email | Role | Lands on |
|---|---|---|
| `student@inculcate.dev` | Student | `/student` |
| `counselor@inculcate.dev` | Counselor | `/counselor` |
| `ops@inculcate.dev` | Ops Admin | `/admin` |
| `admin@inculcate.dev` | Super Admin | `/admin` |

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create/apply migrations (dev) |
| `npm run db:push` | Push schema without a migration (quick prototyping) |
| `npm run db:seed` | Seed core users + a few demo universities |
| `npm run db:seed:catalog` | Generate the synthetic catalog (~36 unis / ~99 programs, embedded) |
| `npm run db:seed:crm` | Generate synthetic students/applications/leads for analytics |
| `npm run db:studio` | Prisma Studio (browse data) |
| `npm run db:reset` | Drop, re-migrate, re-seed |

## Project structure

```
src/
  app/
    (auth)/sign-in, sign-up        # credentials auth UI
    student/  counselor/  admin/   # role-based dashboards
    api/auth/[...nextauth]/        # Auth.js handler
    api/register/                  # public student registration
  auth.ts, auth.config.ts          # Auth.js (node provider + edge config)
  components/ui/                    # shadcn-style primitives
  components/dashboard/             # shell, stat cards, sign-out
  lib/        db, rbac, utils, validation
  server/     guards, audit         # server-side RBAC + audit log
  types/      next-auth.d.ts        # session/JWT augmentation
prisma/       schema.prisma, seed.ts
middleware.ts                       # edge RBAC route gating
docker-compose.yml                  # Postgres + pgvector
```

## Security posture (enforced from Epic 1)

- Zod validation on all auth inputs; server-side role checks (`src/server/guards.ts`).
- RBAC at the edge (middleware) **and** per-page (`requireRole`).
- Audit log on registration; extended to all counselor/admin actions in later epics.
- Secrets only in `.env` (gitignored); `.env.example` documents every key.
- **No "100% visa guarantee" copy.** AI-generated SOP/visa/financial content will be
  flagged for human review (Epic 6).

## Assumptions made

- Next.js full-stack (vs separate NestJS) and Auth.js (vs Clerk) per your choices.
- pgvector over a separate vector DB to keep one datastore (revisit at scale, Epic 3).
- Credentials auth for now; Google OAuth tables are present for later.
- Self-registration is Student-only; staff accounts provisioned by Super Admin (Epic 7).

## Roadmap (next epics)

2. Profile wizard + University/Program/Scholarship DB (CSV import + CRUD + filter search)
3. AI Matching Engine (pgvector embeddings, fit + admission-probability + risk)
4. AI Conversational Counselor (Claude + RAG, human handoff → Lead)
5. Application & Task Management (state machine, deadline tracker, document vault)
6. Phase-2 Execution (SOP/LOR assistant, visa cases, loan/finance, accommodation, travel)
7. CRM, Analytics & Admin (lead pipeline, funnel, partner-university/commission)
```
