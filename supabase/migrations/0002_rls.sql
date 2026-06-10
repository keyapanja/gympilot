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
