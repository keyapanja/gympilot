import "server-only";
import type { DB } from "./types";
import type { SubStatus } from "@/types/db.types";

/** All gyms with owner + subscription + member usage, for the super-admin console. */
export async function listGyms(db: DB) {
  const { data: rawData, error } = await db
    .from("gyms")
    .select("id, name, slug, created_at, contact_email, subscriptions(status, plans(name, key))")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const data = (rawData ?? []) as unknown as Array<{
    id: string;
    name: string;
    slug: string;
    created_at: string;
    contact_email: string;
    subscriptions:
      | { status: string; plans: { name: string; key: string } | { name: string; key: string }[] }
      | { status: string; plans: { name: string; key: string } | { name: string; key: string }[] }[]
      | null;
  }>;

  // gym_stats is a view with no PostgREST relationship to gyms, so fetch + merge.
  const { data: statRows } = await db.from("gym_stats").select("gym_id, members_used, member_limit");
  const statMap = new Map((statRows ?? []).map((s) => [s.gym_id, s]));

  return data.map((g) => {
    const sub = Array.isArray(g.subscriptions) ? g.subscriptions[0] : g.subscriptions;
    const plan = sub ? (Array.isArray(sub.plans) ? sub.plans[0] : sub.plans) : null;
    const stats = statMap.get(g.id);
    return {
      id: g.id,
      name: g.name,
      slug: g.slug,
      email: g.contact_email,
      created_at: g.created_at,
      status: sub?.status ?? "—",
      plan: plan?.name ?? "—",
      planKey: plan?.key ?? "",
      membersUsed: stats?.members_used ?? 0,
      memberLimit: stats?.member_limit ?? 0,
    };
  });
}

/** List subscriptions for the subscriptions console. */
export async function listSubscriptions(db: DB) {
  const { data: rawData, error } = await db
    .from("subscriptions")
    .select("id, status, member_limit, current_period_end, created_at, gyms(name), plans(name, key, price_cents)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const data = (rawData ?? []) as unknown as Array<{
    id: string;
    status: string;
    member_limit: number;
    current_period_end: string | null;
    gyms: { name: string } | { name: string }[] | null;
    plans: { name: string; key: string; price_cents: number } | { name: string; key: string; price_cents: number }[] | null;
  }>;

  return data.map((s) => {
    const gym = Array.isArray(s.gyms) ? s.gyms[0] : s.gyms;
    const plan = Array.isArray(s.plans) ? s.plans[0] : s.plans;
    return {
      id: s.id,
      gymName: gym?.name ?? "—",
      status: s.status,
      plan: plan?.name ?? "—",
      planKey: plan?.key ?? "",
      priceCents: plan?.price_cents ?? 0,
      memberLimit: s.member_limit,
      periodEnd: s.current_period_end,
    };
  });
}

/** Change a gym's plan + status (and re-denormalize the member limit). */
export async function updateSubscription(
  db: DB,
  params: { gymId: string; planKey: string; status: SubStatus },
) {
  const { data: plan, error: planErr } = await db
    .from("plans")
    .select("id, member_limit")
    .eq("key", params.planKey)
    .single();
  if (planErr) throw planErr;

  const { error } = await db
    .from("subscriptions")
    .update({ plan_id: plan.id, member_limit: plan.member_limit, status: params.status })
    .eq("gym_id", params.gymId);
  if (error) throw error;
}

/** Member growth over the last 6 months for analytics charts. */
export async function memberGrowth(db: DB) {
  const { data, error } = await db.from("members").select("created_at");
  if (error) throw error;

  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(d.toISOString().slice(0, 7), 0);
  }
  for (const m of data ?? []) {
    const key = m.created_at.slice(0, 7);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([month, count]) => ({ month, count }));
}
