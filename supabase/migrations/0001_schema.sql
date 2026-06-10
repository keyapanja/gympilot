-- ============================================================
-- GymPilot — 0001 schema
-- Multi-tenant: every tenant row carries gym_id. Isolation by RLS (0002).
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type user_role        as enum ('super_admin', 'owner', 'member');
create type gender_t         as enum ('male', 'female', 'other');
create type template_gender  as enum ('any', 'male', 'female');
create type fitness_goal     as enum ('weight_loss', 'weight_gain', 'muscle_gain', 'fat_loss', 'general_fitness', 'strength_training');
create type experience_level as enum ('beginner', 'intermediate', 'advanced');
create type member_status    as enum ('invited', 'active', 'inactive');
create type sub_status        as enum ('trialing', 'active', 'past_due', 'canceled');
create type plan_status       as enum ('active', 'archived');

-- ---------- Plans (subscription catalog) ----------
create table plans (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,                 -- starter | growth | pro | enterprise
  name         text not null,
  member_limit integer not null,                     -- -1 = unlimited / custom
  price_cents  integer not null default 0,
  sort         integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------- Profiles (1:1 auth.users) ----------
create table profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       user_role not null default 'member',
  full_name  text,
  avatar_url text,
  gym_id     uuid,        -- set for owners (and used as denormalized tenant key)
  member_id  uuid,        -- set for members (links to members.id)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Gyms (the tenant) ----------
create table gyms (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null unique references profiles (id) on delete cascade,
  name          text not null,
  slug          text not null unique,
  logo_url      text,
  contact_email text not null,
  contact_phone text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- profiles.gym_id references gyms (added after gyms exists)
alter table profiles
  add constraint profiles_gym_fk foreign key (gym_id) references gyms (id) on delete set null;

-- ---------- Subscriptions (1:1 gym) ----------
create table subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  gym_id             uuid not null unique references gyms (id) on delete cascade,
  plan_id            uuid not null references plans (id),
  status             sub_status not null default 'trialing',
  member_limit       integer not null,            -- denormalized from plan at write time
  current_period_end timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------- Members ----------
create table members (
  id         uuid primary key default gen_random_uuid(),
  gym_id     uuid not null references gyms (id) on delete cascade,
  profile_id uuid references profiles (id) on delete set null,  -- set once member logs in
  full_name  text not null,
  email      text not null,
  phone      text,
  status     member_status not null default 'invited',
  invited_at timestamptz not null default now(),
  joined_at  timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, email)
);

-- profiles.member_id references members (added after members exists)
alter table profiles
  add constraint profiles_member_fk foreign key (member_id) references members (id) on delete set null;

-- ---------- Member fitness profile (1:1) ----------
create table member_profiles (
  member_id     uuid primary key references members (id) on delete cascade,
  age           integer check (age between 10 and 100),
  gender        gender_t not null default 'other',
  height_cm     numeric(5,1) check (height_cm between 80 and 260),
  weight_kg     numeric(5,1) check (weight_kg between 25 and 400),
  goal          fitness_goal not null default 'general_fitness',
  experience    experience_level not null default 'beginner',
  training_days integer not null default 3 check (training_days between 1 and 7),
  preferred_days text[],                    -- e.g. {Mon,Wed,Fri}
  medical_notes text,
  injuries      text,
  updated_at    timestamptz not null default now()
);

-- ---------- Exercise library (global) ----------
create table exercises (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  muscle_group text not null,
  equipment    text,
  is_global    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------- Workout templates (rule-engine source) ----------
create table workout_templates (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique,
  goal          fitness_goal not null,
  experience    experience_level not null,
  gender        template_gender not null default 'any',
  training_days integer not null check (training_days between 1 and 7),
  title         text not null,
  description   text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index on workout_templates (goal, experience, gender, training_days);

create table template_days (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references workout_templates (id) on delete cascade,
  day_index   integer not null,
  title       text not null,
  is_rest     boolean not null default false,
  unique (template_id, day_index)
);

create table template_exercises (
  id              uuid primary key default gen_random_uuid(),
  template_day_id uuid not null references template_days (id) on delete cascade,
  exercise_id     uuid not null references exercises (id),
  position        integer not null,
  sets            integer not null default 3,
  reps            text not null default '10',
  rest_seconds    integer not null default 60,
  notes           text,
  unique (template_day_id, position)
);

-- ---------- Member workout plans (materialized + editable) ----------
create table member_workout_plans (
  id                 uuid primary key default gen_random_uuid(),
  member_id          uuid not null references members (id) on delete cascade,
  source_template_id uuid references workout_templates (id),
  title              text not null,
  goal               fitness_goal not null,
  experience         experience_level not null,
  training_days      integer not null,
  status             plan_status not null default 'active',
  assigned_at        timestamptz not null default now()
);
create index on member_workout_plans (member_id, status);

create table plan_days (
  id        uuid primary key default gen_random_uuid(),
  plan_id   uuid not null references member_workout_plans (id) on delete cascade,
  day_index integer not null,
  title     text not null,
  is_rest   boolean not null default false,
  unique (plan_id, day_index)
);

create table plan_exercises (
  id              uuid primary key default gen_random_uuid(),
  plan_day_id     uuid not null references plan_days (id) on delete cascade,
  exercise_id     uuid references exercises (id),
  exercise_name   text not null,
  position        integer not null,
  sets            integer not null default 3,
  reps            text not null default '10',
  rest_seconds    integer not null default 60,
  notes           text,
  completed_count integer not null default 0,
  unique (plan_day_id, position)
);

-- ---------- Progress tracking ----------
create table progress_entries (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members (id) on delete cascade,
  recorded_on date not null default current_date,
  weight_kg   numeric(5,1) check (weight_kg between 25 and 400),
  waist_cm    numeric(5,1),
  chest_cm    numeric(5,1),
  arms_cm     numeric(5,1),
  hips_cm     numeric(5,1),
  note        text,
  created_at  timestamptz not null default now(),
  unique (member_id, recorded_on)
);
create index on progress_entries (member_id, recorded_on);

-- Helpful FK indexes
create index on members (gym_id, status);
create index on subscriptions (gym_id);
create index on template_exercises (template_day_id, position);
create index on plan_exercises (plan_day_id, position);
create index on plan_days (plan_id, day_index);
