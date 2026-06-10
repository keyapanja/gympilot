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
