/**
 * Demo data seeder — creates real auth users + a populated gym so you can log
 * in immediately. Requires migrations + supabase/seed.sql to have run first.
 *
 * Usage (env must be set, e.g. via `.env.local` exported into the shell):
 *   node scripts/seed-demo.mjs
 *
 * Reads: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function ensureUser(email, password, meta) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  });
  if (created?.user) return created.user;
  // Already exists → look it up.
  if (error && !String(error.message).includes("already")) throw error;
  const { data: list } = await admin.auth.admin.listUsers();
  return list.users.find((u) => u.email === email);
}

async function main() {
  console.log("Seeding demo data…");

  // 1) Super admin
  const sa = await ensureUser("admin@gympilot.app", "Password123!", { role: "super_admin", full_name: "Platform Admin" });
  await admin.from("profiles").update({ role: "super_admin", full_name: "Platform Admin" }).eq("id", sa.id);
  console.log("  ✓ super admin: admin@gympilot.app / Password123!");

  // 2) Gym owner + workspace
  const owner = await ensureUser("owner@ironworks.app", "Password123!", { role: "owner", full_name: "Alex Owner" });
  let { data: gym } = await admin.from("gyms").select("id").eq("owner_id", owner.id).maybeSingle();
  if (!gym) {
    const { data: g } = await admin
      .from("gyms")
      .insert({ owner_id: owner.id, name: "Iron Works Gym", slug: `iron-works-${owner.id.slice(0, 6)}`, contact_email: "owner@ironworks.app" })
      .select("id")
      .single();
    gym = g;
    await admin.from("profiles").update({ gym_id: gym.id, role: "owner", full_name: "Alex Owner" }).eq("id", owner.id);
    const { data: plan } = await admin.from("plans").select("id, member_limit").eq("key", "growth").single();
    await admin.from("subscriptions").insert({ gym_id: gym.id, plan_id: plan.id, status: "active", member_limit: plan.member_limit });
  }
  console.log("  ✓ gym owner: owner@ironworks.app / Password123! (Iron Works Gym)");

  // 3) A few members with profiles
  const members = [
    { name: "Maya Chen", email: "maya@ironworks.app", goal: "fat_loss", exp: "beginner", gender: "female", h: 165, w: 64, days: 3 },
    { name: "Jordan Reed", email: "jordan@ironworks.app", goal: "muscle_gain", exp: "intermediate", gender: "male", h: 180, w: 82, days: 4 },
    { name: "Sam Patel", email: "sam@ironworks.app", goal: "general_fitness", exp: "beginner", gender: "other", h: 172, w: 75, days: 3 },
  ];

  for (const m of members) {
    let { data: existing } = await admin.from("members").select("id").eq("gym_id", gym.id).eq("email", m.email).maybeSingle();
    if (!existing) {
      const { data: row } = await admin
        .from("members")
        .insert({ gym_id: gym.id, full_name: m.name, email: m.email, status: "active", joined_at: new Date().toISOString() })
        .select("id")
        .single();
      existing = row;
      await admin.from("member_profiles").insert({
        member_id: existing.id,
        age: 30,
        gender: m.gender,
        height_cm: m.h,
        weight_kg: m.w,
        goal: m.goal,
        experience: m.exp,
        training_days: m.days,
      });
      // Sample progress entries
      const base = m.w;
      const rows = [0, 1, 2, 3].map((i) => ({
        member_id: existing.id,
        recorded_on: new Date(Date.now() - (3 - i) * 7 * 86400000).toISOString().slice(0, 10),
        weight_kg: Math.round((base - i * 0.6) * 10) / 10,
        waist_cm: 84 - i,
      }));
      await admin.from("progress_entries").upsert(rows, { onConflict: "member_id,recorded_on" });
    }
    console.log(`  ✓ member: ${m.email} / (set password via invite)`);
  }

  console.log("\nDone. Log in at /login with any account above.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
