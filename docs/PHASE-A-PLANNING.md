# GymPilot — Phase A: Planning & Architecture

> _Personalized workout guidance for every gym member._

This document is the single source of truth for the architecture of GymPilot Phase 1.
It precedes any code. Sections map 1:1 to the required planning deliverables.

**Stack:** Next.js 15 (App Router) · React · TypeScript (strict) · Tailwind CSS · shadcn/ui ·
Supabase (Postgres + Auth + Storage) · Recharts · Resend (email) · Vercel (deploy).

**Scoping note on billing:** Phase 1 ships **no payment processor**. Subscriptions are
*modeled and enforced* in Postgres (plan tier → member limit, enforced by RLS + DB triggers +
app guards). Stripe is a documented future seam, not a Phase 1 dependency.

---

## 1. Product Architecture

GymPilot is a **3-tier multi-tenant SaaS**:

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT (Browser)                          │
│  Next.js 15 App Router · React Server Components + Client islands  │
│  Tailwind + shadcn/ui · Recharts · mobile-first responsive         │
└───────────────┬───────────────────────────────┬──────────────────┘
                │ RSC / Server Actions           │ Browser SDK (auth only)
                ▼                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                     NEXT.JS SERVER (Vercel)                        │
│  · Route Handlers (/api/*)        · Server Actions (mutations)     │
│  · Middleware (auth + tenant)     · Service layer (lib/services)   │
│  · Workout rule engine (pure TS)  · Resend email dispatch          │
└───────────────┬───────────────────────────────┬──────────────────┘
                │ supabase-js (service + RLS)    │
                ▼                                 ▼
┌────────────────────────────────┐  ┌────────────────────────────────┐
│         SUPABASE               │  │           RESEND                │
│  · Postgres (RLS multi-tenant) │  │  Transactional email:           │
│  · Auth (JWT, email/pass)      │  │   welcome / invite / reset      │
│  · Storage (gym logos, avatars)│  └────────────────────────────────┘
└────────────────────────────────┘
```

### Module map

| Module | Responsibility | Primary tables |
|---|---|---|
| Authentication | Sign-up, login, password reset, session | `auth.users`, `profiles` |
| Workspace Management | Gym workspace CRUD, branding, isolation | `gyms` |
| Subscription Management | Plan tier, status, member-limit enforcement | `subscriptions`, `plans` |
| Member Management | Invite/add/edit/remove members, fitness profile | `members`, `member_profiles` |
| Workout Management | Templates, rule engine, plan assignment | `workout_templates`, `template_days`, `template_exercises`, `member_workout_plans`, `plan_days`, `plan_exercises`, `exercises` |
| Progress Tracking | Body metrics history, BMI, charts | `progress_entries` |
| Dashboard Analytics | Owner + member + super-admin metrics | (views over the above) |
| Landing Website | Marketing pages → conversion | none (static) |

### Rendering strategy
- **Public/marketing pages** → static (SSG) for speed + SEO.
- **Dashboards** → React Server Components reading via per-request Supabase client (RLS-scoped).
- **Mutations** → Server Actions / Route Handlers, never direct client writes to tenant data.
- **Charts** → client components (`"use client"`) hydrating server-fetched data.

---

## 2. Multi-Tenant SaaS Architecture

**Tenancy model:** *Shared database, shared schema, row-level isolation by `gym_id`.*
This is the standard Supabase-native pattern and the cheapest to operate for Phase 1.

```
                        Super Admin (platform)
                               │ sees all gyms
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
   ┌─────────┐            ┌─────────┐            ┌─────────┐
   │ Gym A   │            │ Gym B   │            │ Gym C   │   ← tenant = gym
   │ owner   │            │ owner   │            │ owner   │
   │ members │            │ members │            │ members │
   └─────────┘            └─────────┘            └─────────┘
   Every tenant row carries gym_id. RLS makes cross-tenant reads impossible.
```

### Isolation enforcement (defense in depth)
1. **Postgres RLS** — every tenant table has policies keyed on the caller's `gym_id`,
   derived from a `SECURITY DEFINER` helper `auth_gym_id()` that reads the JWT → `profiles`.
   This is the *primary* boundary; even a bug in app code cannot leak across tenants.
2. **Application service layer** — all queries go through `lib/services/*` which always
   pass the authenticated context; no ad-hoc cross-gym queries.
3. **Middleware** — resolves session, attaches role + `gym_id`, blocks unauthenticated access
   to `/(owner)`, `/(member)`, `/(admin)` route groups.

### "One Gym Owner per Workspace"
- Enforced by `gyms.owner_id` being **unique** (`UNIQUE` constraint) and a partial unique index
  ensuring a profile with role `owner` maps to exactly one gym.

### Subscription enforcement
- `subscriptions.member_limit` is denormalized from the plan at write time.
- A `BEFORE INSERT` trigger on `members` counts active members for the gym and **rejects** the
  insert if it would exceed `member_limit` (raising `MEMBER_LIMIT_EXCEEDED`).
- The app surfaces this gracefully and prompts an upgrade.

---

## 3. Database Design

### Entities (logical)

- **profiles** — 1:1 with `auth.users`; holds `role` (`super_admin|owner|member`), `full_name`, optional `gym_id`, optional `member_id`.
- **plans** — catalog of subscription tiers (Starter/Growth/Pro/Enterprise) with `member_limit`, `price_cents`.
- **gyms** — the tenant. Branding + owner.
- **subscriptions** — 1:1 with gym; current `plan_id`, `status`, denormalized `member_limit`.
- **members** — a person in a gym (independent of whether they have a login yet).
- **member_profiles** — 1:1 fitness profile (goal, gender, experience, body stats, medical).
- **exercises** — global exercise library (name, muscle group, equipment).
- **workout_templates** — rule-engine source plans keyed by (goal, experience, gender, days).
- **template_days / template_exercises** — structure of a template.
- **member_workout_plans** — a template *materialized* + assigned to a member.
- **plan_days / plan_exercises** — the member's concrete plan structure (editable copy).
- **progress_entries** — time-series body metrics per member.

### Key columns & constraints (summary; full DDL in migrations)

```
plans(id, key, name, member_limit, price_cents, sort, is_active)
gyms(id, owner_id UNIQUE→profiles, name, slug UNIQUE, logo_url, contact_email,
     contact_phone, created_at)
subscriptions(id, gym_id UNIQUE→gyms, plan_id→plans, status[active|past_due|canceled|trialing],
     member_limit, current_period_end, created_at)
members(id, gym_id→gyms, profile_id→profiles NULLABLE, full_name, email, phone,
     status[invited|active|inactive], invited_at, joined_at, created_at)
     UNIQUE(gym_id, email)
member_profiles(member_id UNIQUE→members, age, gender[male|female|other],
     height_cm, weight_kg, goal[...6], experience[beginner|intermediate|advanced],
     training_days int[1..7], medical_notes, injuries, updated_at)
exercises(id, name, muscle_group, equipment, is_global)
workout_templates(id, key UNIQUE, goal, experience, gender[any|male|female],
     training_days, title, description, is_active)
template_days(id, template_id, day_index, title, is_rest)
template_exercises(id, template_day_id, exercise_id, position, sets, reps, rest_seconds, notes)
member_workout_plans(id, member_id→members, source_template_id, title, goal, experience,
     training_days, status[active|archived], assigned_at)
plan_days(id, plan_id→member_workout_plans, day_index, title, is_rest)
plan_exercises(id, plan_day_id, exercise_id, exercise_name, position, sets, reps,
     rest_seconds, notes, completed_count)
progress_entries(id, member_id→members, recorded_on date, weight_kg, waist_cm, chest_cm,
     arms_cm, hips_cm, note, created_at)  UNIQUE(member_id, recorded_on)
```

### Derived / computed
- **BMI** = `weight_kg / (height_m)^2`, computed in TS (and a SQL helper view) — *display-only*.
- **Member limit usage** = `count(members where status='active') / member_limit`.

### Indexing
- All FKs indexed. Hot paths: `members(gym_id, status)`, `progress_entries(member_id, recorded_on)`,
  `workout_templates(goal, experience, gender, training_days)`, `plan_exercises(plan_day_id, position)`.

---

## 4. Authentication Flow

Supabase Auth (email + password), JWT in httpOnly cookies via `@supabase/ssr`.

### Gym Owner sign-up (self-serve)
```
Register form ──▶ supabase.auth.signUp(email,pwd)
   │                      │ creates auth.users row
   │                      ▼
   │            DB trigger handle_new_user()  ──▶ profiles(role='owner')
   ▼
Server Action create_gym() ──▶ gyms + subscriptions(plan=Starter, trialing)
   │
   ▼
Resend: welcome email ──▶ redirect /owner/dashboard
```

### Member onboarding (invited by owner)
```
Owner "Add Member" ──▶ members(status='invited') + member_profiles
   │                          (limit trigger enforced)
   ▼
Resend: invitation email w/ magic-link / set-password token
   │
   ▼
Member sets password ──▶ profiles(role='member', member_id linked)
   │                       members.status='active', joined_at=now()
   ▼
Onboarding wizard (goal→experience→measurements) ──▶ generate initial plan
```

### Password reset
```
Forgot password ──▶ supabase.auth.resetPasswordForEmail()
   ──▶ Resend-delivered link ──▶ /auth/reset ──▶ updateUser(password)
```

### Session handling
- `middleware.ts` refreshes the session cookie on every request and redirects by role.
- Server components read the user via `createServerClient()` (RLS-scoped).
- The browser only ever holds the auth session; **no tenant data fetched client-side without RLS.**

---

## 5. User Roles & Permissions (RBAC)

Three roles stored on `profiles.role`. Permissions enforced at **RLS**, **middleware**, and **UI** layers.

| Capability | Super Admin | Gym Owner | Member |
|---|:--:|:--:|:--:|
| View all gyms | ✅ | — | — |
| Manage any subscription | ✅ | — | — |
| Platform analytics | ✅ | — | — |
| Create/manage own gym workspace | — | ✅ | — |
| Add / edit / remove members | — | ✅ | — |
| View member progress (own gym) | — | ✅ | own only |
| Assign / regenerate workout plan | — | ✅ | — |
| View assigned workout plan | — | ✅ (any in gym) | ✅ own |
| Update own progress | — | — | ✅ |
| Edit own fitness profile | — | — | ✅ |
| Edit own gym branding/settings | — | ✅ | — |

**Route-group → role mapping**
- `app/(public)/*` → anyone
- `app/(owner)/*` → `owner`
- `app/(member)/*` → `member`
- `app/(admin)/*` → `super_admin`

RLS predicate examples (conceptual):
- `members`: `gym_id = auth_gym_id()` (owner) OR `auth_role() = 'super_admin'` OR `id = auth_member_id()` (member self).
- `progress_entries`: member self-write; owner read within gym; super-admin read all.

---

## 6. API Structure

Hybrid: **Server Actions** for form mutations (typed, no client fetch), **Route Handlers**
for webhooks/email/cron-style and anything called by client charts. All under `app/api` or co-located actions.

```
Server Actions (app/(...)/actions.ts)
  auth.registerOwner / login / requestReset / resetPassword
  gym.updateBranding / gym.updateSettings
  members.create / members.update / members.remove / members.resendInvite
  onboarding.saveProfile / onboarding.generatePlan
  workout.assignTemplate / workout.regenerate / workout.toggleExerciseDone
  progress.addEntry / progress.updateEntry / progress.deleteEntry
  admin.updateSubscription / admin.toggleGymStatus

Route Handlers (REST-ish, JSON)
  POST   /api/auth/callback            Supabase auth code exchange
  GET    /api/members                  list (owner, RLS)         ?status=&q=
  GET    /api/members/:id              detail
  GET    /api/progress/:memberId       series for charts
  GET    /api/dashboard/owner          aggregate metrics
  GET    /api/dashboard/member         aggregate metrics
  GET    /api/admin/gyms               super-admin list
  GET    /api/admin/analytics          platform metrics
  POST   /api/email/preview            (dev only) render email
  GET    /api/health                   liveness
```

Conventions: Zod-validated input, typed `Result<T>` returns, consistent error envelope
`{ error: { code, message } }`, HTTP 4xx for validation / 403 for RBAC / 409 for limit.

---

## 7. Folder Structure

```
gympilot/
├─ docs/                         # this planning + design
├─ public/                       # static assets, logos
├─ supabase/
│  ├─ migrations/                # ordered SQL (schema, RLS, triggers, views)
│  ├─ seed.sql                   # plans, exercises, workout templates, demo data
│  └─ config.toml
├─ src/
│  ├─ app/
│  │  ├─ (public)/               # home, features, pricing, contact, login, register
│  │  ├─ (owner)/                # dashboard, members, settings
│  │  ├─ (member)/               # dashboard, workout-plan, progress, profile
│  │  ├─ (admin)/                # dashboard, gyms, subscriptions, analytics
│  │  ├─ auth/                   # reset, callback, set-password
│  │  ├─ api/                    # route handlers
│  │  ├─ layout.tsx  globals.css  not-found.tsx  error.tsx
│  ├─ components/
│  │  ├─ ui/                     # shadcn primitives
│  │  ├─ layout/                 # sidebars, topbars, shells
│  │  ├─ marketing/              # hero, pricing cards, feature grid
│  │  ├─ members/  workout/  progress/  dashboard/  charts/
│  ├─ lib/
│  │  ├─ supabase/               # server, client, middleware factories
│  │  ├─ services/               # data access per module
│  │  ├─ workout-engine/         # rule engine (pure, tested)
│  │  ├─ email/                  # Resend client + templates
│  │  ├─ validations/            # Zod schemas
│  │  ├─ auth/                   # role guards, session helpers
│  │  └─ utils/                  # bmi, formatting, constants
│  ├─ types/                     # db.types.ts (generated), domain types
│  └─ middleware.ts
├─ tests/                        # unit (engine, bmi) + setup
├─ .env.example  .eslintrc  tailwind.config.ts  tsconfig.json
├─ package.json  next.config.ts  components.json  README.md
```

---

## 8. Page Hierarchy

```
PUBLIC
  /                 Home (hero, value prop, CTA)
  /features         Features
  /pricing          Pricing (4 plans)
  /contact          Contact form
  /login            Login
  /register         Owner registration
  /auth/reset       Password reset
  /auth/set-password Member set-password (from invite)

OWNER  (role: owner)
  /owner/dashboard          metrics + recent members/activity
  /owner/members            list + search/filter
  /owner/members/new        add member (multi-step)
  /owner/members/:id        member details (profile, plan, progress)
  /owner/members/:id/edit   edit member
  /owner/settings           gym branding, contact, subscription view

MEMBER  (role: member)
  /member/dashboard         goal, plan summary, BMI, completion stats
  /member/onboarding        first-run wizard (goal→exp→measurements→plan)
  /member/workout-plan      full plan by day, mark complete
  /member/progress          add entry + charts
  /member/profile           edit fitness + personal profile

SUPER ADMIN  (role: super_admin)
  /admin/dashboard          platform KPIs
  /admin/gyms               all gyms
  /admin/gyms/:id           gym detail
  /admin/subscriptions      manage plans/status
  /admin/analytics          charts across platform
```

---

## 9. UI Component Hierarchy

```
RootLayout
├─ ThemeProvider, Toaster, fonts
│
├─ (public) MarketingLayout
│   ├─ SiteHeader (nav, CTA)         ├─ Footer
│   ├─ Hero  FeatureGrid  PricingTable  ContactForm  AuthCard
│
├─ AppShell (authenticated)
│   ├─ Sidebar (role-aware nav)      ├─ Topbar (user menu, gym name)
│   └─ <page content>
│
├─ Owner
│   ├─ StatCard ×4                   ├─ MemberLimitMeter
│   ├─ RecentMembersTable            ├─ RecentActivityTable
│   ├─ MemberForm (steps)            ├─ MemberDetailTabs
│   │     └─ ProfilePanel · PlanPanel · ProgressPanel
│
├─ Member
│   ├─ GoalCard  BmiCard  CompletionCard
│   ├─ OnboardingWizard (Stepper)
│   ├─ WorkoutPlanView (DayAccordion → ExerciseRow → DoneToggle)
│   ├─ ProgressForm  ProgressCharts (WeightChart, MeasurementChart)
│   └─ ProfileForm
│
├─ Admin
│   ├─ PlatformStatCard ×N           ├─ GymsTable
│   ├─ SubscriptionTable             ├─ AnalyticsCharts
│
└─ shared/ui (shadcn): Button Input Select Card Table Tabs Dialog
   Sheet Badge Avatar Form Label Toast Skeleton DropdownMenu Accordion
   Progress Separator Switch Textarea
```

Design principles: mobile-first, accessible (labels, focus rings, ARIA, keyboard),
reusable primitives, server components by default with client islands for interactivity.

---

## 10. Database ER Diagram

```
auth.users 1───1 profiles
                    │ role
        ┌───────────┼───────────────┐
        │ (owner)   │ (member)      │ (super_admin)
        ▼           ▼
      gyms 1──────1 subscriptions ───* plans
        │  owner_id UNIQUE   plan_id
        │ gym_id
        ▼
     members 1───1 member_profiles
        │  │
        │  └───────1 profiles (member login link)
        │
        ├──* progress_entries
        │
        └──* member_workout_plans 1──* plan_days 1──* plan_exercises ──* exercises
                       ▲
                       │ source_template_id
        workout_templates 1──* template_days 1──* template_exercises ──* exercises
            (goal, experience, gender, training_days)  ← RULE ENGINE KEYS
```

Cardinality summary:
- gym 1—1 subscription, 1—* members
- member 1—1 member_profile, 1—* progress_entries, 1—* workout_plans (1 active)
- template 1—* days 1—* exercises (FK to global exercise library)
- profile optionally links to one gym (owner) or one member (member)

_A rendered Mermaid version lives in `docs/er-diagram.md`._

---

## 11. Deployment Architecture

```
   GitHub repo ──push──▶ Vercel (CI/CD)
        │                   │ build Next.js 15, run typecheck + unit tests
        │                   ▼
        │             Vercel Edge/Serverless (prod + preview per PR)
        │                   │  env: SUPABASE_URL, ANON, SERVICE_ROLE, RESEND_API_KEY
        ▼                   ▼
   Supabase project ◀───────┘  Postgres + Auth + Storage (RLS enforced)
        │
        └─ Resend (verified sending domain) for transactional email
```

- **Environments:** Vercel Preview (per branch) → Production. Separate Supabase projects for
  staging vs prod recommended.
- **Migrations:** applied via Supabase CLI (`supabase db push`) in a deploy step / manually for Phase 1.
- **Secrets:** only `NEXT_PUBLIC_*` exposed to client; `SERVICE_ROLE` + `RESEND_API_KEY` server-only.
- **Storage:** public bucket `gym-logos`, signed/avatars bucket `member-avatars`.
- **Observability:** Vercel logs + Supabase logs; `/api/health` for uptime checks.

---

### Phase A exit criteria ✅
Architecture, tenancy, data model, auth, RBAC, API surface, structure, pages, components,
ER diagram, and deployment are fully specified. Proceed to **Phase B — Design**.
