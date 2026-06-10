/**
 * Rich demo content for the Iron Works Gym workspace:
 *  - a varied member roster (active + invited)
 *  - fitness profiles
 *  - materialized workout plans (copied from matching templates, like the app does)
 *  - several weeks of progress history
 *  - some exercises marked complete (for completion stats)
 *
 * Idempotent: re-running won't duplicate members, plans, or progress.
 *
 * Run with a direct DB connection (no service-role needed for this one):
 *   PGHOST=... PGPORT=5432 PGUSER=postgres.<ref> PGPASSWORD=... PGDATABASE=postgres \
 *     node scripts/seed-content.mjs
 */
import pg from "pg";

const client = new pg.Client({ ssl: { rejectUnauthorized: false } });

// name, email, goal, experience, gender, height, weight, days, templateKey, status
const ROSTER = [
  ["Maya Chen", "maya@ironworks.app", "fat_loss", "beginner", "female", 165, 64, 3, "fl_beg_any_3", "active"],
  ["Jordan Reed", "jordan@ironworks.app", "muscle_gain", "intermediate", "male", 180, 82, 4, "mg_int_any_4", "active"],
  ["Sam Patel", "sam@ironworks.app", "general_fitness", "beginner", "other", 172, 75, 3, "gf_beg_any_3", "active"],
  ["Priya Nair", "priya@ironworks.app", "weight_loss", "beginner", "female", 160, 70, 3, "wl_beg_any_3", "active"],
  ["Diego Alvarez", "diego@ironworks.app", "strength_training", "intermediate", "male", 178, 88, 4, "st_int_any_4", "active"],
  ["Aisha Khan", "aisha@ironworks.app", "muscle_gain", "beginner", "female", 168, 60, 3, "mg_beg_any_3", "active"],
  ["Tom Becker", "tom@ironworks.app", "weight_gain", "beginner", "male", 175, 65, 3, "wg_beg_any_3", "active"],
  ["Lena Fischer", "lena@ironworks.app", "general_fitness", "beginner", "female", 163, 58, 2, "gf_beg_any_2", "active"],
  ["Marcus Lee", "marcus@ironworks.app", "muscle_gain", "advanced", "male", 183, 90, 5, "mg_adv_any_5", "active"],
  ["Sofia Rossi", "sofia@ironworks.app", "fat_loss", "beginner", "female", 170, 72, 3, "fl_beg_any_3", "active"],
  // Invited (no plan yet — shows the "Invited" badge + pending state)
  ["Noah Williams", "noah@ironworks.app", "muscle_gain", "beginner", "male", 177, 74, 3, "mg_beg_any_3", "invited"],
  ["Emma Davis", "emma@ironworks.app", "weight_loss", "beginner", "female", 158, 68, 3, "wl_beg_any_3", "invited"],
];

const q = (text, params) => client.query(text, params);

async function getGymId() {
  const r = await q("select id from gyms where name = 'Iron Works Gym' limit 1");
  if (r.rows.length === 0) throw new Error("Iron Works Gym not found — run scripts/seed-demo.mjs first.");
  return r.rows[0].id;
}

async function upsertMember(gymId, [name, email, , , , , , , , status]) {
  const joined = status === "active" ? "now()" : "null";
  const r = await q(
    `insert into members (gym_id, full_name, email, status, joined_at)
     values ($1, $2, $3, $4::member_status, ${joined})
     on conflict (gym_id, email) do update set full_name = excluded.full_name, status = excluded.status
     returning id`,
    [gymId, name, email, status],
  );
  return r.rows[0].id;
}

async function upsertProfile(memberId, [, , goal, exp, gender, h, w, days]) {
  await q(
    `insert into member_profiles (member_id, age, gender, height_cm, weight_kg, goal, experience, training_days)
     values ($1, $2, $3::gender_t, $4, $5, $6::fitness_goal, $7::experience_level, $8)
     on conflict (member_id) do update set
       gender = excluded.gender, height_cm = excluded.height_cm, weight_kg = excluded.weight_kg,
       goal = excluded.goal, experience = excluded.experience, training_days = excluded.training_days`,
    [memberId, 22 + Math.floor(Math.random() * 20), gender, h, w, goal, exp, days],
  );
}

async function materializePlan(memberId, [name, , goal, exp, , , , days, templateKey]) {
  // Skip if member already has an active plan.
  const existing = await q("select 1 from member_workout_plans where member_id = $1 and status = 'active'", [memberId]);
  if (existing.rows.length > 0) return;

  const t = await q("select id, training_days from workout_templates where key = $1", [templateKey]);
  if (t.rows.length === 0) return;
  const templateId = t.rows[0].id;

  const plan = await q(
    `insert into member_workout_plans (member_id, source_template_id, title, goal, experience, training_days, status)
     values ($1, $2, $3, $4::fitness_goal, $5::experience_level, $6, 'active') returning id`,
    [memberId, templateId, `${goal.replace(/_/g, " ")} plan`, goal, exp, days],
  );
  const planId = plan.rows[0].id;

  const days_ = await q(
    "select id, day_index, title, is_rest from template_days where template_id = $1 order by day_index",
    [templateId],
  );

  for (const d of days_.rows) {
    const pd = await q(
      "insert into plan_days (plan_id, day_index, title, is_rest) values ($1,$2,$3,$4) returning id",
      [planId, d.day_index, d.title, d.is_rest],
    );
    if (d.is_rest) continue;

    const ex = await q(
      `select te.position, te.sets, te.reps, te.rest_seconds, te.notes, te.exercise_id, e.name
       from template_exercises te join exercises e on e.id = te.exercise_id
       where te.template_day_id = $1 order by te.position`,
      [d.id],
    );
    for (const e of ex.rows) {
      // Mark ~half of the first training day's exercises complete, for varied stats.
      const done = d.day_index === 1 && e.position <= 2 ? 1 : 0;
      await q(
        `insert into plan_exercises (plan_day_id, exercise_id, exercise_name, position, sets, reps, rest_seconds, notes, completed_count)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [pd.rows[0].id, e.exercise_id, e.name, e.position, e.sets, e.reps, e.rest_seconds, e.notes, done],
      );
    }
  }
}

async function seedProgress(memberId, [, , goal, , , , w]) {
  const weeks = 6;
  // Goal-aware trend: losing goals trend down, gaining goals up.
  const dir = ["fat_loss", "weight_loss"].includes(goal) ? -1 : ["weight_gain", "muscle_gain"].includes(goal) ? 1 : 0;
  for (let i = weeks; i >= 0; i--) {
    const d = new Date(Date.now() - i * 7 * 86400000).toISOString().slice(0, 10);
    const drift = dir * (weeks - i) * 0.5 + (Math.random() - 0.5);
    const weight = Math.round((w + drift) * 10) / 10;
    const waist = Math.round((82 + dir * (weeks - i) * 0.4) * 10) / 10;
    await q(
      `insert into progress_entries (member_id, recorded_on, weight_kg, waist_cm, chest_cm, arms_cm, hips_cm)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (member_id, recorded_on) do update set weight_kg = excluded.weight_kg, waist_cm = excluded.waist_cm`,
      [memberId, d, weight, waist, 98, 35, 96],
    );
  }
}

async function main() {
  await client.connect();
  const gymId = await getGymId();
  console.log("Seeding content into Iron Works Gym…\n");

  for (const m of ROSTER) {
    const memberId = await upsertMember(gymId, m);
    await upsertProfile(memberId, m);
    const status = m[9];
    if (status === "active") {
      await materializePlan(memberId, m);
      await seedProgress(memberId, m);
    }
    console.log(`  ✓ ${m[0].padEnd(16)} ${status === "active" ? "active + plan + progress" : "invited (pending)"}`);
  }

  const counts = await q(
    `select
       (select count(*) from members where gym_id = $1) as members,
       (select count(*) from member_workout_plans p join members mm on mm.id = p.member_id where mm.gym_id = $1 and p.status='active') as plans,
       (select count(*) from progress_entries pe join members mm on mm.id = pe.member_id where mm.gym_id = $1) as progress`,
    [gymId],
  );
  console.log("\nTotals →", counts.rows[0]);
  await client.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
