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
