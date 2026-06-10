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
