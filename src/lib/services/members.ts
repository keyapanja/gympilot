import "server-only";
import type { DB } from "./types";
import type { Database } from "@/types/db.types";
import type { MemberCreateInput, MemberUpdateInput } from "@/lib/validations";
import { generatePlanForMember } from "./workouts";

export interface MemberListItem {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  goal: string | null;
  experience: string | null;
}

/** List members in a gym with their fitness goal, optionally filtered. */
export async function listMembers(
  db: DB,
  gymId: string,
  opts: { q?: string; status?: string } = {},
): Promise<MemberListItem[]> {
  let query = db
    .from("members")
    .select("id, full_name, email, status, created_at, member_profiles(goal, experience)")
    .eq("gym_id", gymId)
    .order("created_at", { ascending: false });

  if (opts.status && opts.status !== "all") query = query.eq("status", opts.status as never);
  if (opts.q) query = query.or(`full_name.ilike.%${opts.q}%,email.ilike.%${opts.q}%`);

  const { data: rawData, error } = await query;
  if (error) throw error;

  const data = (rawData ?? []) as unknown as Array<{
    id: string;
    full_name: string;
    email: string;
    status: string;
    created_at: string;
    member_profiles: { goal: string; experience: string } | { goal: string; experience: string }[] | null;
  }>;

  return data.map((m) => {
    const mp = m.member_profiles;
    const profile = Array.isArray(mp) ? mp[0] : mp;
    return {
      id: m.id,
      full_name: m.full_name,
      email: m.email,
      status: m.status,
      created_at: m.created_at,
      goal: profile?.goal ?? null,
      experience: profile?.experience ?? null,
    };
  });
}

/** Full member detail incl. fitness profile. */
export async function getMember(db: DB, gymId: string, memberId: string) {
  const { data: member, error } = await db
    .from("members")
    .select("*")
    .eq("gym_id", gymId)
    .eq("id", memberId)
    .single();
  if (error) throw error;

  const { data: profile } = await db.from("member_profiles").select("*").eq("member_id", memberId).maybeSingle();
  const { data: bmi } = await db.from("member_bmi").select("*").eq("member_id", memberId).maybeSingle();

  return { member, profile, bmi };
}

/**
 * Create a member + fitness profile, then optionally generate the initial plan.
 * The DB trigger enforces the subscription member limit (throws MEMBER_LIMIT_EXCEEDED).
 */
export async function createMember(db: DB, gymId: string, input: MemberCreateInput) {
  const { data: member, error } = await db
    .from("members")
    .insert({
      gym_id: gymId,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone || null,
      status: "invited",
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: mpErr } = await db.from("member_profiles").insert({
    member_id: member.id,
    age: input.age ?? null,
    gender: input.gender,
    height_cm: input.heightCm ?? null,
    weight_kg: input.weightKg ?? null,
    goal: input.goal,
    experience: input.experience,
    training_days: input.trainingDays,
    preferred_days: input.preferredDays ?? null,
    medical_notes: input.medicalNotes || null,
    injuries: input.injuries || null,
  });
  if (mpErr) throw mpErr;

  if (input.generatePlan) {
    await generatePlanForMember(db, member.id, {
      goal: input.goal,
      experience: input.experience,
      gender: input.gender,
      trainingDays: input.trainingDays,
    });
  }

  return { memberId: member.id };
}

/** Update a member and/or their fitness profile. Regenerates plan if requested. */
export async function updateMember(
  db: DB,
  gymId: string,
  memberId: string,
  input: MemberUpdateInput,
  regeneratePlan = false,
) {
  const memberPatch: Database["public"]["Tables"]["members"]["Update"] = {};
  if (input.fullName !== undefined) memberPatch.full_name = input.fullName;
  if (input.email !== undefined) memberPatch.email = input.email;
  if (input.phone !== undefined) memberPatch.phone = input.phone || null;
  if (input.status !== undefined) memberPatch.status = input.status;

  if (Object.keys(memberPatch).length > 0) {
    const { error } = await db.from("members").update(memberPatch).eq("id", memberId).eq("gym_id", gymId);
    if (error) throw error;
  }

  const profilePatch: Database["public"]["Tables"]["member_profiles"]["Update"] = {};
  if (input.age !== undefined) profilePatch.age = input.age ?? null;
  if (input.gender !== undefined) profilePatch.gender = input.gender;
  if (input.heightCm !== undefined) profilePatch.height_cm = input.heightCm ?? null;
  if (input.weightKg !== undefined) profilePatch.weight_kg = input.weightKg ?? null;
  if (input.goal !== undefined) profilePatch.goal = input.goal;
  if (input.experience !== undefined) profilePatch.experience = input.experience;
  if (input.trainingDays !== undefined) profilePatch.training_days = input.trainingDays;
  if (input.preferredDays !== undefined) profilePatch.preferred_days = input.preferredDays ?? null;
  if (input.medicalNotes !== undefined) profilePatch.medical_notes = input.medicalNotes || null;
  if (input.injuries !== undefined) profilePatch.injuries = input.injuries || null;

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await db.from("member_profiles").update(profilePatch).eq("member_id", memberId);
    if (error) throw error;
  }

  if (regeneratePlan && input.goal && input.experience && input.gender && input.trainingDays) {
    await generatePlanForMember(db, memberId, {
      goal: input.goal,
      experience: input.experience,
      gender: input.gender,
      trainingDays: input.trainingDays,
    });
  }
}

/** Remove a member (cascades profile, plans, progress). */
export async function removeMember(db: DB, gymId: string, memberId: string) {
  const { error } = await db.from("members").delete().eq("id", memberId).eq("gym_id", gymId);
  if (error) throw error;
}
