# GymPilot

> **Personalized workout guidance for every gym member.**

A production-ready, multi-tenant SaaS that lets gym owners create a workspace, add members,
auto-assign rule-based workout plans, and track progress — digital coaching without a personal
trainer for every member.

Built with **Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS · shadcn/ui ·
Supabase (Postgres + Auth + Storage) · Recharts · Resend · Vercel.**

---

## Table of contents
1. [Architecture](#architecture)
2. [Features](#features)
3. [Tech stack](#tech-stack)
4. [Project structure](#project-structure)
5. [Setup](#setup)
6. [Database & migrations](#database--migrations)
7. [Environment variables](#environment-variables)
8. [Running locally](#running-locally)
9. [Testing](#testing)
10. [Deployment](#deployment)
11. [Demo accounts](#demo-accounts)
12. [Security model](#security-model)

The full planning + design docs live in [`/docs`](docs):
[Phase A — Planning](docs/PHASE-A-PLANNING.md) ·
[Phase B — Design](docs/PHASE-B-DESIGN.md) ·
[ER diagram](docs/er-diagram.md).

---

## Architecture

**Multi-tenant** with a *shared database, shared schema, row-level isolation by `gym_id`* model.
Every tenant row carries a `gym_id`, and **Postgres Row Level Security (RLS)** makes cross-tenant
reads impossible — the primary security boundary, backed by app-layer service guards and
role-aware middleware.

- **Tenant** = a gym (one owner each).
- **Roles** = `super_admin`, `owner`, `member` — enforced at RLS, middleware, and UI layers.
- **Subscription enforcement**: a `BEFORE INSERT` trigger on `members` rejects inserts that
  exceed the plan's seat limit (`MEMBER_LIMIT_EXCEEDED`). Phase 1 ships no payment processor;
  billing is a documented future seam.
- **Workout engine**: a pure, deterministic, **rule-based** recommender (no AI / external APIs)
  that matches templates by goal, experience, gender and training days, with a graceful fallback
  ladder. See [`src/lib/workout-engine`](src/lib/workout-engine).

## Features

| Module | What it does |
|---|---|
| Authentication | Owner self-signup, member invites, password reset (Supabase Auth + Resend) |
| Workspace management | Gym branding, contact details, data isolation |
| Subscription management | Plan tiers (Starter/Growth/Pro/Enterprise) + automatic seat enforcement |
| Member management | Add / edit / remove members, fitness profiles, invite emails |
| Workout engine | Rule-based plan assignment, editable materialized plans, completion tracking |
| Progress tracking | Weight + body measurements, history, Recharts charts, BMI (supporting metric) |
| Dashboards | Owner, member, and super-admin analytics |
| Landing site | Home, Features, Pricing, Contact — built to convert gym owners |

## Tech stack

- **Frontend:** Next.js 15, React 19, TypeScript (strict, `noUncheckedIndexedAccess`), Tailwind, shadcn/ui, Recharts
- **Backend:** Supabase (Postgres, Auth, Storage), Next.js Server Actions + Route Handlers
- **Email:** Resend (with a dry-run mode for local dev)
- **Deploy:** Vercel

## Project structure

```
gympilot/
├─ docs/                  Planning (Phase A) + Design (Phase B) + ER diagram
├─ supabase/
│  ├─ migrations/         0001 schema · 0002 RLS · 0003 triggers · 0004 views · 0005 storage
│  └─ seed.sql            Plans, exercises, workout templates
├─ scripts/seed-demo.mjs  Optional demo accounts + data (service role)
├─ src/
│  ├─ app/                Route groups: (public) (owner) (member) (admin) + api + auth
│  ├─ components/         ui/ (shadcn) + layout/ marketing/ members/ workout/ progress/ …
│  ├─ lib/                supabase/ services/ workout-engine/ email/ validations/ auth/ utils/
│  ├─ types/              Database types
│  └─ middleware.ts       Session refresh + role-based route gating
└─ tests/                 Vitest unit tests (engine, BMI)
```

## Setup

### Prerequisites
- Node.js ≥ 18.18
- A [Supabase](https://supabase.com) project (or the Supabase CLI for local dev)
- A [Resend](https://resend.com) account (optional locally — emails dry-run by default)

### 1. Install
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
# fill in your Supabase + Resend values (see "Environment variables" below)
```

## Database & migrations

### Option A — Supabase CLI (local)
```bash
npx supabase start          # boots local Postgres/Auth/Storage
npx supabase db reset       # applies migrations/ then runs seed.sql
npm run db:types            # regenerate src/types/db.types.ts (optional)
```

### Option B — Hosted Supabase project
Apply each file in `supabase/migrations/` in order (0001 → 0005), then run `supabase/seed.sql`,
using the SQL editor or:
```bash
npx supabase link --project-ref <your-ref>
npx supabase db push
```
Then paste `supabase/seed.sql` into the SQL editor and run it.

### Seed contents
`seed.sql` is idempotent and loads the 4 plans, ~30 exercises, and a matrix of workout templates
keyed by goal × experience × gender × training-days (with 2-day and 5-day fallbacks).

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon key (RLS-scoped) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Server-only.** Bypasses RLS — used for invites/admin |
| `NEXT_PUBLIC_SITE_URL` | ✅ | e.g. `http://localhost:3000` (no trailing slash) |
| `RESEND_API_KEY` | optional | If empty, emails dry-run to the console |
| `EMAIL_FROM` | optional | Verified sender, e.g. `GymPilot <onboarding@resend.dev>` |
| `EMAIL_DRY_RUN` | optional | `true` (default) logs emails instead of sending |

## Running locally
```bash
npm run dev          # http://localhost:3000
npm run typecheck    # strict TS, no emit
npm run lint
```

## Testing

Unit tests cover the rule-based workout engine (matching + fallback determinism) and BMI math:
```bash
npm test             # run once
npm run test:watch   # watch mode
```

Manual smoke test:
1. Register a gym owner at `/register` → lands on the owner dashboard.
2. Add a member → an invite email is dispatched (or logged in dry-run).
3. Open the member invite link → set a password → complete onboarding → a plan is generated.
4. As the member, tick exercises and log progress → charts update.
5. Promote a user to `super_admin` (see below) → visit `/admin/dashboard`.

## Deployment

### Vercel
1. Push this repo to GitHub and import it into Vercel.
2. Add all environment variables (use your **production** Supabase + Resend values; set
   `NEXT_PUBLIC_SITE_URL` to your deployed URL, `EMAIL_DRY_RUN=false`).
3. Deploy. Vercel runs `next build`; every PR gets a preview deployment.

### Supabase (production)
- Apply `supabase/migrations/*` then `supabase/seed.sql` to your prod project.
- In **Auth → URL Configuration**, set the Site URL and add
  `https://<your-domain>/auth/callback` to the redirect allow-list.
- Verify your sending domain in Resend for production email.

### Storage
Buckets `gym-logos` and `member-avatars` are created by `0005_storage.sql` with public read.

## Demo accounts

After migrations + seed, optionally create login-ready demo data:
```bash
node scripts/seed-demo.mjs
```
This creates:
- **Super admin** — `admin@gympilot.app` / `Password123!`
- **Gym owner** — `owner@ironworks.app` / `Password123!` (Iron Works Gym + sample members & progress)

> ⚠️ Demo passwords are for local/staging only. Never seed these into a real production environment.

### Promote any user to super admin
```sql
update profiles set role = 'super_admin' where id =
  (select id from auth.users where email = 'you@example.com');
```

## Security model

- **RLS everywhere** — every tenant table has policies derived from the caller's JWT via
  `SECURITY DEFINER` helpers (`auth_role`, `auth_gym_id`, `auth_member_id`, `is_super_admin`).
- **Service-role key is server-only** and never imported into client components.
- **Middleware** gates `/owner`, `/member`, `/admin` by role before rendering.
- **Validation** — all mutations validate input with Zod before touching the database.
- **Seat enforcement** happens in the database (a trigger), so it cannot be bypassed by the app.

---

© GymPilot. Phase 1.
#   g y m p i l o t  
 