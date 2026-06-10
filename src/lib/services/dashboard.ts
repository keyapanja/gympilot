import "server-only";
import type { DB } from "./types";

/** Owner dashboard aggregate metrics + recent lists. */
export async function getOwnerDashboard(db: DB, gymId: string) {
  const { data: stats } = await db.from("gym_stats").select("*").eq("gym_id", gymId).maybeSingle();

  const { data: recentMembersRaw } = await db
    .from("members")
    .select("id, full_name, email, status, created_at, member_profiles(goal)")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false })
    .limit(5);
  const recentMembers = (recentMembersRaw ?? []) as unknown as Array<{
    id: string;
    full_name: string;
    email: string;
    status: string;
    created_at: string;
    member_profiles: { goal: string } | { goal: string }[] | null;
  }>;

  const { data: recentProgressRaw } = await db
    .from("progress_entries")
    .select("id, recorded_on, weight_kg, created_at, members!inner(full_name, gym_id)")
    .eq("members.gym_id", gymId)
    .order("created_at", { ascending: false })
    .limit(6);
  const recentProgress = (recentProgressRaw ?? []) as unknown as Array<{
    id: string;
    weight_kg: number | null;
    created_at: string;
    members: { full_name: string } | { full_name: string }[] | null;
  }>;

  const memberLimit = stats?.member_limit ?? 0;
  const used = stats?.members_used ?? 0;

  return {
    totalMembers: used,
    activeMembers: stats?.active_members ?? 0,
    invitedMembers: stats?.invited_members ?? 0,
    recentSignups: stats?.recent_signups ?? 0,
    memberLimit,
    limitUsage: memberLimit > 0 ? used / memberLimit : 0,
    unlimited: memberLimit < 0,
    recentMembers: recentMembers.map((m) => {
      const mp = m.member_profiles;
      const profile = Array.isArray(mp) ? mp[0] : mp;
      return {
        id: m.id,
        full_name: m.full_name,
        email: m.email,
        status: m.status,
        created_at: m.created_at,
        goal: profile?.goal ?? null,
      };
    }),
    recentActivity: recentProgress.map((p) => {
      const mem = p.members;
      const member = Array.isArray(mem) ? mem[0] : mem;
      return {
        id: p.id,
        name: member?.full_name ?? "Member",
        weight: p.weight_kg,
        when: p.created_at,
      };
    }),
  };
}

/** Super-admin platform-wide metrics. */
export async function getPlatformDashboard(db: DB) {
  const { data: stats } = await db.from("platform_stats").select("*").maybeSingle();

  const { data: recentGymsRaw } = await db
    .from("gyms")
    .select("id, name, created_at, subscriptions(status, plans(name))")
    .order("created_at", { ascending: false })
    .limit(8);
  const recentGyms = (recentGymsRaw ?? []) as unknown as Array<{
    id: string;
    name: string;
    created_at: string;
    subscriptions:
      | { status: string; plans: { name: string } | { name: string }[] }
      | { status: string; plans: { name: string } | { name: string }[] }[]
      | null;
  }>;

  return {
    totalGyms: stats?.total_gyms ?? 0,
    totalMembers: stats?.total_members ?? 0,
    activeSubscriptions: stats?.active_subscriptions ?? 0,
    trialingSubscriptions: stats?.trialing_subscriptions ?? 0,
    newMembers30d: stats?.new_members_30d ?? 0,
    recentGyms: recentGyms.map((g) => {
      const sub = g.subscriptions;
      const s = Array.isArray(sub) ? sub[0] : sub;
      const planObj = s ? (Array.isArray(s.plans) ? s.plans[0] : s.plans) : null;
      return {
        id: g.id,
        name: g.name,
        created_at: g.created_at,
        status: s?.status ?? "—",
        plan: planObj?.name ?? "—",
      };
    }),
  };
}
