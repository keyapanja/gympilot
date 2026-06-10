-- ============================================================
-- GymPilot — combined setup (all migrations + seed)
-- Paste this whole file into the Supabase SQL Editor and Run,
-- or run it via scripts/db-setup.mjs with your DB connection string.
-- Safe to re-run: seed is idempotent; schema assumes a fresh DB.
-- ============================================================

-- >>>>>>>>>> supabase/migrations/0001_schema.sql <<<<<<<<<<
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

-- >>>>>>>>>> supabase/migrations/0002_rls.sql <<<<<<<<<<
-- ============================================================
-- GymPilot — 0002 Row Level Security
-- Primary tenant boundary. Helpers are SECURITY DEFINER so they can read
-- profiles without recursing through the policies being evaluated.
-- ============================================================

-- ---------- Auth context helpers ----------
create or replace function auth_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_gym_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select gym_id from profiles where id = auth.uid();
$$;

create or replace function auth_member_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select member_id from profiles where id = auth.uid();
$$;

create or replace function is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role = 'super_admin' from profiles where id = auth.uid()), false);
$$;

-- ---------- Enable RLS ----------
alter table profiles             enable row level security;
alter table plans                enable row level security;
alter table gyms                 enable row level security;
alter table subscriptions        enable row level security;
alter table members              enable row level security;
alter table member_profiles      enable row level security;
alter table exercises            enable row level security;
alter table workout_templates    enable row level security;
alter table template_days        enable row level security;
alter table template_exercises   enable row level security;
alter table member_workout_plans enable row level security;
alter table plan_days            enable row level security;
alter table plan_exercises       enable row level security;
alter table progress_entries     enable row level security;

-- ---------- profiles ----------
create policy profiles_select_self_or_admin on profiles for select
  using (id = auth.uid() or is_super_admin()
         or gym_id = auth_gym_id());            -- owner can see profiles in their gym
create policy profiles_update_self on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
-- inserts handled by trigger (security definer); admins may insert
create policy profiles_insert_admin on profiles for insert
  with check (is_super_admin());

-- ---------- plans (public catalog, read-only to clients) ----------
create policy plans_select_all on plans for select using (true);
create policy plans_admin_write on plans for all
  using (is_super_admin()) with check (is_super_admin());

-- ---------- gyms ----------
create policy gyms_select on gyms for select
  using (is_super_admin() or owner_id = auth.uid() or id = auth_gym_id());
create policy gyms_owner_insert on gyms for insert
  with check (owner_id = auth.uid());
create policy gyms_owner_update on gyms for update
  using (owner_id = auth.uid() or is_super_admin())
  with check (owner_id = auth.uid() or is_super_admin());

-- ---------- subscriptions ----------
create policy subs_select on subscriptions for select
  using (is_super_admin() or gym_id = auth_gym_id());
create policy subs_owner_insert on subscriptions for insert
  with check (gym_id = auth_gym_id() or is_super_admin());
create policy subs_write on subscriptions for update
  using (is_super_admin() or gym_id = auth_gym_id())
  with check (is_super_admin() or gym_id = auth_gym_id());

-- ---------- members ----------
create policy members_select on members for select
  using (
    is_super_admin()
    or gym_id = auth_gym_id()                -- owner sees own gym
    or id = auth_member_id()                 -- member sees self
  );
create policy members_owner_insert on members for insert
  with check (gym_id = auth_gym_id());
create policy members_owner_update on members for update
  using (is_super_admin() or gym_id = auth_gym_id() or id = auth_member_id())
  with check (is_super_admin() or gym_id = auth_gym_id() or id = auth_member_id());
create policy members_owner_delete on members for delete
  using (is_super_admin() or gym_id = auth_gym_id());

-- ---------- member_profiles ----------
create policy mp_select on member_profiles for select
  using (
    is_super_admin()
    or member_id = auth_member_id()
    or exists (select 1 from members m where m.id = member_id and m.gym_id = auth_gym_id())
  );
create policy mp_write on member_profiles for all
  using (
    is_super_admin()
    or member_id = auth_member_id()
    or exists (select 1 from members m where m.id = member_id and m.gym_id = auth_gym_id())
  )
  with check (
    is_super_admin()
    or member_id = auth_member_id()
    or exists (select 1 from members m where m.id = member_id and m.gym_id = auth_gym_id())
  );

-- ---------- exercises + templates (global, read for all authed; admin writes) ----------
create policy exercises_select on exercises for select using (auth.uid() is not null);
create policy exercises_admin on exercises for all using (is_super_admin()) with check (is_super_admin());

create policy templates_select on workout_templates for select using (auth.uid() is not null);
create policy templates_admin on workout_templates for all using (is_super_admin()) with check (is_super_admin());
create policy tdays_select on template_days for select using (auth.uid() is not null);
create policy tdays_admin on template_days for all using (is_super_admin()) with check (is_super_admin());
create policy tex_select on template_exercises for select using (auth.uid() is not null);
create policy tex_admin on template_exercises for all using (is_super_admin()) with check (is_super_admin());

-- ---------- member workout plans ----------
create policy mwp_access on member_workout_plans for all
  using (
    is_super_admin()
    or member_id = auth_member_id()
    or exists (select 1 from members m where m.id = member_id and m.gym_id = auth_gym_id())
  )
  with check (
    is_super_admin()
    or member_id = auth_member_id()
    or exists (select 1 from members m where m.id = member_id and m.gym_id = auth_gym_id())
  );

create policy plan_days_access on plan_days for all
  using (exists (
    select 1 from member_workout_plans p join members m on m.id = p.member_id
    where p.id = plan_id
      and (is_super_admin() or m.id = auth_member_id() or m.gym_id = auth_gym_id())
  ))
  with check (exists (
    select 1 from member_workout_plans p join members m on m.id = p.member_id
    where p.id = plan_id
      and (is_super_admin() or m.id = auth_member_id() or m.gym_id = auth_gym_id())
  ));

create policy plan_ex_access on plan_exercises for all
  using (exists (
    select 1 from plan_days d
      join member_workout_plans p on p.id = d.plan_id
      join members m on m.id = p.member_id
    where d.id = plan_day_id
      and (is_super_admin() or m.id = auth_member_id() or m.gym_id = auth_gym_id())
  ))
  with check (exists (
    select 1 from plan_days d
      join member_workout_plans p on p.id = d.plan_id
      join members m on m.id = p.member_id
    where d.id = plan_day_id
      and (is_super_admin() or m.id = auth_member_id() or m.gym_id = auth_gym_id())
  ));

-- ---------- progress entries ----------
create policy progress_select on progress_entries for select
  using (
    is_super_admin()
    or member_id = auth_member_id()
    or exists (select 1 from members m where m.id = member_id and m.gym_id = auth_gym_id())
  );
create policy progress_member_write on progress_entries for all
  using (member_id = auth_member_id() or is_super_admin())
  with check (member_id = auth_member_id() or is_super_admin());

-- >>>>>>>>>> supabase/migrations/0003_triggers.sql <<<<<<<<<<
-- ============================================================
-- GymPilot — 0003 triggers & functions
-- ============================================================

-- ---------- updated_at maintenance ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_updated     before update on profiles
  for each row execute function set_updated_at();
create trigger trg_gyms_updated         before update on gyms
  for each row execute function set_updated_at();
create trigger trg_subs_updated         before update on subscriptions
  for each row execute function set_updated_at();
create trigger trg_members_updated      before update on members
  for each row execute function set_updated_at();
create trigger trg_member_prof_updated  before update on member_profiles
  for each row execute function set_updated_at();

-- ---------- New auth user -> profile ----------
-- Role + full_name come from auth metadata set at signUp time.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'member');
  insert into profiles (id, role, full_name)
  values (new.id, v_role, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Subscription member-limit enforcement ----------
-- Rejects inserts that would exceed the gym's seat limit (-1 = unlimited).
create or replace function enforce_member_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_limit integer;
  v_count integer;
begin
  select member_limit into v_limit
  from subscriptions
  where gym_id = new.gym_id;

  -- No subscription row yet (shouldn't happen) or unlimited -> allow.
  if v_limit is null or v_limit < 0 then
    return new;
  end if;

  -- Seats consumed = members not explicitly deactivated.
  select count(*) into v_count
  from members
  where gym_id = new.gym_id
    and status <> 'inactive';

  if v_count >= v_limit then
    raise exception 'MEMBER_LIMIT_EXCEEDED'
      using errcode = 'P0001',
            detail = format('Plan allows %s active members.', v_limit);
  end if;

  return new;
end;
$$;

create trigger trg_enforce_member_limit
  before insert on members
  for each row execute function enforce_member_limit();

-- ---------- Keep profiles.gym_id / member_id in sync ----------
-- When a member is linked to a profile (set-password), stamp the profile.
create or replace function sync_member_profile_link()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.profile_id is not null and new.profile_id is distinct from old.profile_id then
    update profiles
      set member_id = new.id, role = 'member'
      where id = new.profile_id;
  end if;
  return new;
end;
$$;

create trigger trg_sync_member_link
  after update of profile_id on members
  for each row execute function sync_member_profile_link();

-- >>>>>>>>>> supabase/migrations/0004_views.sql <<<<<<<<<<
-- ============================================================
-- GymPilot — 0004 views (analytics helpers)
-- Views inherit RLS from their base tables (security_invoker).
-- ============================================================

-- Per-gym member counts + limit usage
create or replace view gym_stats
with (security_invoker = true) as
select
  g.id as gym_id,
  g.name,
  s.member_limit,
  count(m.*) filter (where m.status <> 'inactive')      as members_used,
  count(m.*) filter (where m.status = 'active')          as active_members,
  count(m.*) filter (where m.status = 'invited')         as invited_members,
  count(m.*) filter (where m.created_at > now() - interval '30 days') as recent_signups
from gyms g
join subscriptions s on s.gym_id = g.id
left join members m on m.gym_id = g.id
group by g.id, g.name, s.member_limit;

-- BMI per member (display-only supporting metric)
create or replace view member_bmi
with (security_invoker = true) as
select
  mp.member_id,
  mp.height_cm,
  mp.weight_kg,
  case when mp.height_cm > 0
       then round((mp.weight_kg / ((mp.height_cm / 100.0) ^ 2))::numeric, 1)
       else null end as bmi,
  case
    when mp.height_cm is null or mp.weight_kg is null then null
    when (mp.weight_kg / ((mp.height_cm / 100.0) ^ 2)) < 18.5 then 'Underweight'
    when (mp.weight_kg / ((mp.height_cm / 100.0) ^ 2)) < 25   then 'Normal'
    when (mp.weight_kg / ((mp.height_cm / 100.0) ^ 2)) < 30   then 'Overweight'
    else 'Obese'
  end as bmi_category
from member_profiles mp;

-- Platform-wide metrics (super admin; RLS on base tables restricts non-admins)
create or replace view platform_stats
with (security_invoker = true) as
select
  (select count(*) from gyms)                                   as total_gyms,
  (select count(*) from members)                                as total_members,
  (select count(*) from subscriptions where status = 'active')  as active_subscriptions,
  (select count(*) from subscriptions where status = 'trialing') as trialing_subscriptions,
  (select count(*) from members where created_at > now() - interval '30 days') as new_members_30d;

-- >>>>>>>>>> supabase/migrations/0005_storage.sql <<<<<<<<<<
-- ============================================================
-- GymPilot — 0005 storage buckets + policies
-- ============================================================

-- Public bucket for gym logos
insert into storage.buckets (id, name, public)
values ('gym-logos', 'gym-logos', true)
on conflict (id) do nothing;

-- Public-ish bucket for member avatars
insert into storage.buckets (id, name, public)
values ('member-avatars', 'member-avatars', true)
on conflict (id) do nothing;

-- Anyone can read public assets
create policy "public read gym-logos" on storage.objects for select
  using (bucket_id = 'gym-logos');
create policy "public read member-avatars" on storage.objects for select
  using (bucket_id = 'member-avatars');

-- Authenticated users may upload/replace within these buckets.
-- (App scopes object paths by gym_id / member_id; service role used for admin ops.)
create policy "authed write gym-logos" on storage.objects for insert
  to authenticated with check (bucket_id = 'gym-logos');
create policy "authed update gym-logos" on storage.objects for update
  to authenticated using (bucket_id = 'gym-logos');

create policy "authed write member-avatars" on storage.objects for insert
  to authenticated with check (bucket_id = 'member-avatars');
create policy "authed update member-avatars" on storage.objects for update
  to authenticated using (bucket_id = 'member-avatars');

-- >>>>>>>>>> supabase/seed.sql <<<<<<<<<<
-- ============================================================
-- GymPilot — seed data
-- Plans, exercise library, and rule-engine workout templates.
-- Idempotent: safe to run on `supabase db reset`.
-- ============================================================

-- ---------- Plans ----------
insert into plans (key, name, member_limit, price_cents, sort) values
  ('starter',    'Starter',     10,  2900, 1),
  ('growth',     'Growth',      30,  5900, 2),
  ('pro',        'Pro',         50,  9900, 3),
  ('enterprise', 'Enterprise',  -1,     0, 4)
on conflict (key) do update
  set name = excluded.name, member_limit = excluded.member_limit,
      price_cents = excluded.price_cents, sort = excluded.sort;

-- ---------- Exercise library ----------
insert into exercises (name, muscle_group, equipment) values
  ('Bench Press',            'Chest',      'Barbell'),
  ('Incline Dumbbell Press', 'Chest',      'Dumbbell'),
  ('Push-Up',                'Chest',      'Bodyweight'),
  ('Chest Fly',              'Chest',      'Cable'),
  ('Overhead Press',         'Shoulders',  'Barbell'),
  ('Shoulder Press',         'Shoulders',  'Dumbbell'),
  ('Lateral Raise',          'Shoulders',  'Dumbbell'),
  ('Tricep Pushdown',        'Arms',       'Cable'),
  ('Dumbbell Curl',          'Arms',       'Dumbbell'),
  ('Hammer Curl',            'Arms',       'Dumbbell'),
  ('Lat Pulldown',           'Back',       'Cable'),
  ('Seated Row',             'Back',       'Cable'),
  ('Bent-Over Row',          'Back',       'Barbell'),
  ('Pull-Up',                'Back',       'Bodyweight'),
  ('Deadlift',               'Back',       'Barbell'),
  ('Back Squat',             'Legs',       'Barbell'),
  ('Goblet Squat',           'Legs',       'Dumbbell'),
  ('Leg Press',              'Legs',       'Machine'),
  ('Romanian Deadlift',      'Legs',       'Barbell'),
  ('Walking Lunge',          'Legs',       'Dumbbell'),
  ('Leg Curl',               'Legs',       'Machine'),
  ('Calf Raise',             'Legs',       'Machine'),
  ('Plank',                  'Core',       'Bodyweight'),
  ('Hanging Leg Raise',      'Core',       'Bodyweight'),
  ('Cable Crunch',           'Core',       'Cable'),
  ('Russian Twist',          'Core',       'Bodyweight'),
  ('Treadmill Intervals',    'Cardio',     'Treadmill'),
  ('Rowing Machine',         'Cardio',     'Machine'),
  ('Stationary Bike',        'Cardio',     'Machine'),
  ('Jump Rope',              'Cardio',     'Bodyweight'),
  ('Kettlebell Swing',       'Full Body',  'Kettlebell'),
  ('Burpee',                 'Full Body',  'Bodyweight')
on conflict (name) do nothing;

-- ---------- Template seeding helper ----------
-- p_plan := jsonb array of days:
--   [{ "title": "...", "rest": false,
--      "exercises": [{ "name":"Bench Press","sets":4,"reps":"8","rest":90,"notes":"" }] }]
create or replace function _seed_template(
  p_key text, p_goal fitness_goal, p_exp experience_level, p_gender template_gender,
  p_days int, p_title text, p_desc text, p_plan jsonb
) returns void language plpgsql as $$
declare
  v_template uuid;
  v_day uuid;
  d jsonb; e jsonb;
  di int := 0; pos int;
begin
  delete from workout_templates where key = p_key;  -- idempotent reseed
  insert into workout_templates (key, goal, experience, gender, training_days, title, description)
  values (p_key, p_goal, p_exp, p_gender, p_days, p_title, p_desc)
  returning id into v_template;

  for d in select * from jsonb_array_elements(p_plan)
  loop
    di := di + 1;
    insert into template_days (template_id, day_index, title, is_rest)
    values (v_template, di, d ->> 'title', coalesce((d ->> 'rest')::boolean, false))
    returning id into v_day;

    pos := 0;
    if d ? 'exercises' then
      for e in select * from jsonb_array_elements(d -> 'exercises')
      loop
        pos := pos + 1;
        insert into template_exercises (template_day_id, exercise_id, position, sets, reps, rest_seconds, notes)
        select v_day,
               (select id from exercises where name = e ->> 'name'),
               pos,
               coalesce((e ->> 'sets')::int, 3),
               coalesce(e ->> 'reps', '10'),
               coalesce((e ->> 'rest')::int, 60),
               nullif(e ->> 'notes', '');
      end loop;
    end if;
  end loop;
end;
$$;

-- ===================== TEMPLATES =====================

-- Muscle Gain — Beginner — 3 days (full-body split)
select _seed_template('mg_beg_any_3','muscle_gain','beginner','any',3,
  'Muscle Gain · Beginner · 3 Days','Full-body hypertrophy foundation.',
  '[
    {"title":"Day 1 — Full Body A","exercises":[
      {"name":"Back Squat","sets":3,"reps":"8-10","rest":90},
      {"name":"Bench Press","sets":3,"reps":"8-10","rest":90},
      {"name":"Seated Row","sets":3,"reps":"10-12","rest":75},
      {"name":"Shoulder Press","sets":3,"reps":"10","rest":60},
      {"name":"Plank","sets":3,"reps":"45s","rest":45}]},
    {"title":"Day 2 — Rest","rest":true},
    {"title":"Day 3 — Full Body B","exercises":[
      {"name":"Romanian Deadlift","sets":3,"reps":"8-10","rest":90},
      {"name":"Incline Dumbbell Press","sets":3,"reps":"10","rest":75},
      {"name":"Lat Pulldown","sets":3,"reps":"10-12","rest":75},
      {"name":"Dumbbell Curl","sets":3,"reps":"12","rest":60},
      {"name":"Tricep Pushdown","sets":3,"reps":"12","rest":60}]},
    {"title":"Day 4 — Rest","rest":true},
    {"title":"Day 5 — Full Body C","exercises":[
      {"name":"Leg Press","sets":3,"reps":"12","rest":90},
      {"name":"Push-Up","sets":3,"reps":"AMRAP","rest":60},
      {"name":"Bent-Over Row","sets":3,"reps":"10","rest":75},
      {"name":"Lateral Raise","sets":3,"reps":"15","rest":45},
      {"name":"Hanging Leg Raise","sets":3,"reps":"12","rest":45}]}
  ]'::jsonb);

-- Muscle Gain — Intermediate — 4 days (upper/lower)
select _seed_template('mg_int_any_4','muscle_gain','intermediate','any',4,
  'Muscle Gain · Intermediate · 4 Days','Upper/Lower hypertrophy split.',
  '[
    {"title":"Day 1 — Upper A","exercises":[
      {"name":"Bench Press","sets":4,"reps":"6-8","rest":120},
      {"name":"Bent-Over Row","sets":4,"reps":"8","rest":90},
      {"name":"Overhead Press","sets":3,"reps":"8-10","rest":90},
      {"name":"Dumbbell Curl","sets":3,"reps":"12","rest":60},
      {"name":"Tricep Pushdown","sets":3,"reps":"12","rest":60}]},
    {"title":"Day 2 — Lower A","exercises":[
      {"name":"Back Squat","sets":4,"reps":"6-8","rest":150},
      {"name":"Romanian Deadlift","sets":3,"reps":"8","rest":120},
      {"name":"Leg Press","sets":3,"reps":"12","rest":90},
      {"name":"Calf Raise","sets":4,"reps":"15","rest":45},
      {"name":"Plank","sets":3,"reps":"60s","rest":45}]},
    {"title":"Day 3 — Rest","rest":true},
    {"title":"Day 4 — Upper B","exercises":[
      {"name":"Incline Dumbbell Press","sets":4,"reps":"10","rest":90},
      {"name":"Lat Pulldown","sets":4,"reps":"10","rest":90},
      {"name":"Lateral Raise","sets":4,"reps":"15","rest":45},
      {"name":"Hammer Curl","sets":3,"reps":"12","rest":60},
      {"name":"Chest Fly","sets":3,"reps":"15","rest":60}]},
    {"title":"Day 5 — Lower B","exercises":[
      {"name":"Deadlift","sets":3,"reps":"5","rest":180},
      {"name":"Walking Lunge","sets":3,"reps":"12","rest":75},
      {"name":"Leg Curl","sets":3,"reps":"12","rest":60},
      {"name":"Cable Crunch","sets":3,"reps":"15","rest":45}]}
  ]'::jsonb);

-- Fat Loss — Beginner — 3 days (full body + cardio)
select _seed_template('fl_beg_any_3','fat_loss','beginner','any',3,
  'Fat Loss · Beginner · 3 Days','Metabolic full-body circuits with cardio finishers.',
  '[
    {"title":"Day 1 — Full Body + Cardio","exercises":[
      {"name":"Goblet Squat","sets":3,"reps":"12","rest":45},
      {"name":"Push-Up","sets":3,"reps":"12","rest":45},
      {"name":"Seated Row","sets":3,"reps":"12","rest":45},
      {"name":"Treadmill Intervals","sets":1,"reps":"15 min","rest":0,"notes":"30s hard / 90s easy"}]},
    {"title":"Day 2 — Rest","rest":true},
    {"title":"Day 3 — Circuit","exercises":[
      {"name":"Kettlebell Swing","sets":4,"reps":"15","rest":45},
      {"name":"Walking Lunge","sets":3,"reps":"20","rest":45},
      {"name":"Lat Pulldown","sets":3,"reps":"12","rest":45},
      {"name":"Plank","sets":3,"reps":"45s","rest":30}]},
    {"title":"Day 4 — Rest","rest":true},
    {"title":"Day 5 — Conditioning","exercises":[
      {"name":"Rowing Machine","sets":1,"reps":"20 min","rest":0},
      {"name":"Burpee","sets":4,"reps":"10","rest":60},
      {"name":"Russian Twist","sets":3,"reps":"20","rest":30}]}
  ]'::jsonb);

-- Weight Loss — Beginner — 3 days (alias-ish, cardio heavy)
select _seed_template('wl_beg_any_3','weight_loss','beginner','any',3,
  'Weight Loss · Beginner · 3 Days','Low-impact strength + steady-state cardio.',
  '[
    {"title":"Day 1 — Strength","exercises":[
      {"name":"Goblet Squat","sets":3,"reps":"12","rest":60},
      {"name":"Incline Dumbbell Press","sets":3,"reps":"12","rest":60},
      {"name":"Seated Row","sets":3,"reps":"12","rest":60},
      {"name":"Stationary Bike","sets":1,"reps":"20 min","rest":0}]},
    {"title":"Day 2 — Rest","rest":true},
    {"title":"Day 3 — Cardio + Core","exercises":[
      {"name":"Treadmill Intervals","sets":1,"reps":"25 min","rest":0},
      {"name":"Plank","sets":3,"reps":"45s","rest":30},
      {"name":"Russian Twist","sets":3,"reps":"20","rest":30}]},
    {"title":"Day 4 — Rest","rest":true},
    {"title":"Day 5 — Full Body","exercises":[
      {"name":"Leg Press","sets":3,"reps":"15","rest":60},
      {"name":"Lat Pulldown","sets":3,"reps":"12","rest":60},
      {"name":"Shoulder Press","sets":3,"reps":"12","rest":60},
      {"name":"Jump Rope","sets":3,"reps":"2 min","rest":60}]}
  ]'::jsonb);

-- Strength Training — Intermediate — 4 days (heavy compounds)
select _seed_template('st_int_any_4','strength_training','intermediate','any',4,
  'Strength · Intermediate · 4 Days','Compound strength focus, lower reps.',
  '[
    {"title":"Day 1 — Squat Focus","exercises":[
      {"name":"Back Squat","sets":5,"reps":"5","rest":180},
      {"name":"Romanian Deadlift","sets":3,"reps":"6","rest":120},
      {"name":"Leg Press","sets":3,"reps":"8","rest":90}]},
    {"title":"Day 2 — Bench Focus","exercises":[
      {"name":"Bench Press","sets":5,"reps":"5","rest":180},
      {"name":"Overhead Press","sets":3,"reps":"6","rest":120},
      {"name":"Tricep Pushdown","sets":3,"reps":"10","rest":60}]},
    {"title":"Day 3 — Rest","rest":true},
    {"title":"Day 4 — Deadlift Focus","exercises":[
      {"name":"Deadlift","sets":5,"reps":"3","rest":210},
      {"name":"Bent-Over Row","sets":4,"reps":"6","rest":120},
      {"name":"Pull-Up","sets":3,"reps":"AMRAP","rest":90}]},
    {"title":"Day 5 — Press + Accessories","exercises":[
      {"name":"Overhead Press","sets":4,"reps":"5","rest":150},
      {"name":"Incline Dumbbell Press","sets":3,"reps":"8","rest":90},
      {"name":"Hammer Curl","sets":3,"reps":"10","rest":60}]}
  ]'::jsonb);

-- General Fitness — Beginner — 3 days (balanced)
select _seed_template('gf_beg_any_3','general_fitness','beginner','any',3,
  'General Fitness · Beginner · 3 Days','Balanced strength, mobility and cardio.',
  '[
    {"title":"Day 1 — Full Body","exercises":[
      {"name":"Goblet Squat","sets":3,"reps":"12","rest":60},
      {"name":"Push-Up","sets":3,"reps":"10","rest":60},
      {"name":"Seated Row","sets":3,"reps":"12","rest":60},
      {"name":"Plank","sets":3,"reps":"40s","rest":40}]},
    {"title":"Day 2 — Rest","rest":true},
    {"title":"Day 3 — Cardio + Core","exercises":[
      {"name":"Stationary Bike","sets":1,"reps":"20 min","rest":0},
      {"name":"Walking Lunge","sets":3,"reps":"16","rest":45},
      {"name":"Russian Twist","sets":3,"reps":"20","rest":30}]},
    {"title":"Day 4 — Rest","rest":true},
    {"title":"Day 5 — Strength","exercises":[
      {"name":"Leg Press","sets":3,"reps":"12","rest":75},
      {"name":"Lat Pulldown","sets":3,"reps":"12","rest":60},
      {"name":"Shoulder Press","sets":3,"reps":"12","rest":60},
      {"name":"Dumbbell Curl","sets":2,"reps":"12","rest":45}]}
  ]'::jsonb);

-- Weight Gain — Beginner — 3 days (surplus strength)
select _seed_template('wg_beg_any_3','weight_gain','beginner','any',3,
  'Weight Gain · Beginner · 3 Days','Compound-led full body to drive size in a surplus.',
  '[
    {"title":"Day 1 — Full Body A","exercises":[
      {"name":"Back Squat","sets":3,"reps":"8","rest":120},
      {"name":"Bench Press","sets":3,"reps":"8","rest":120},
      {"name":"Bent-Over Row","sets":3,"reps":"10","rest":90}]},
    {"title":"Day 2 — Rest","rest":true},
    {"title":"Day 3 — Full Body B","exercises":[
      {"name":"Deadlift","sets":3,"reps":"5","rest":150},
      {"name":"Overhead Press","sets":3,"reps":"8","rest":90},
      {"name":"Lat Pulldown","sets":3,"reps":"10","rest":75}]},
    {"title":"Day 4 — Rest","rest":true},
    {"title":"Day 5 — Full Body C","exercises":[
      {"name":"Leg Press","sets":4,"reps":"10","rest":90},
      {"name":"Incline Dumbbell Press","sets":3,"reps":"10","rest":75},
      {"name":"Seated Row","sets":3,"reps":"10","rest":75},
      {"name":"Dumbbell Curl","sets":3,"reps":"12","rest":60}]}
  ]'::jsonb);

-- 2-day fallbacks for low-frequency trainees (one per common goal family)
select _seed_template('gf_beg_any_2','general_fitness','beginner','any',2,
  'General Fitness · Beginner · 2 Days','Two efficient full-body sessions.',
  '[
    {"title":"Day 1 — Full Body","exercises":[
      {"name":"Goblet Squat","sets":3,"reps":"12","rest":60},
      {"name":"Push-Up","sets":3,"reps":"10","rest":60},
      {"name":"Seated Row","sets":3,"reps":"12","rest":60},
      {"name":"Plank","sets":3,"reps":"40s","rest":40}]},
    {"title":"Day 2 — Rest","rest":true},
    {"title":"Day 3 — Full Body","exercises":[
      {"name":"Leg Press","sets":3,"reps":"12","rest":75},
      {"name":"Incline Dumbbell Press","sets":3,"reps":"12","rest":60},
      {"name":"Lat Pulldown","sets":3,"reps":"12","rest":60},
      {"name":"Russian Twist","sets":3,"reps":"20","rest":30}]}
  ]'::jsonb);

-- 5-day fallback (muscle gain, advanced bro-split)
select _seed_template('mg_adv_any_5','muscle_gain','advanced','any',5,
  'Muscle Gain · Advanced · 5 Days','Body-part split for high training frequency.',
  '[
    {"title":"Day 1 — Chest","exercises":[
      {"name":"Bench Press","sets":4,"reps":"8","rest":120},
      {"name":"Incline Dumbbell Press","sets":4,"reps":"10","rest":90},
      {"name":"Chest Fly","sets":3,"reps":"15","rest":60},
      {"name":"Push-Up","sets":3,"reps":"AMRAP","rest":60}]},
    {"title":"Day 2 — Back","exercises":[
      {"name":"Deadlift","sets":4,"reps":"6","rest":150},
      {"name":"Pull-Up","sets":4,"reps":"AMRAP","rest":90},
      {"name":"Seated Row","sets":3,"reps":"12","rest":75},
      {"name":"Lat Pulldown","sets":3,"reps":"12","rest":75}]},
    {"title":"Day 3 — Legs","exercises":[
      {"name":"Back Squat","sets":4,"reps":"8","rest":150},
      {"name":"Romanian Deadlift","sets":3,"reps":"10","rest":90},
      {"name":"Leg Curl","sets":3,"reps":"12","rest":60},
      {"name":"Calf Raise","sets":4,"reps":"15","rest":45}]},
    {"title":"Day 4 — Shoulders","exercises":[
      {"name":"Overhead Press","sets":4,"reps":"8","rest":120},
      {"name":"Lateral Raise","sets":4,"reps":"15","rest":45},
      {"name":"Shoulder Press","sets":3,"reps":"12","rest":60}]},
    {"title":"Day 5 — Arms + Core","exercises":[
      {"name":"Dumbbell Curl","sets":4,"reps":"12","rest":60},
      {"name":"Hammer Curl","sets":3,"reps":"12","rest":60},
      {"name":"Tricep Pushdown","sets":4,"reps":"12","rest":60},
      {"name":"Hanging Leg Raise","sets":3,"reps":"15","rest":45}]}
  ]'::jsonb);

drop function _seed_template(text, fitness_goal, experience_level, template_gender, int, text, text, jsonb);

