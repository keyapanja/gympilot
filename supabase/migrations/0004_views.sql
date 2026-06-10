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
