"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOwnerWithGym } from "@/lib/auth/session";
import { createMember, removeMember, updateMember, getMember } from "@/lib/services/members";
import { updateGymSettings, getGymWithSubscription } from "@/lib/services/gyms";
import { inviteMember } from "@/lib/services/invites";
import { memberCreateSchema, memberUpdateSchema, gymSettingsSchema } from "@/lib/validations";
import type { MemberFormValues } from "@/components/members/member-form";
import type { GymSettingsInput } from "@/lib/validations";
import { ok, fail, fromError, type ActionResult } from "@/lib/utils/result";
import { ROUTES } from "@/lib/constants";

/** Map the flat form values into the validated create payload. */
function toMemberInput(v: MemberFormValues) {
  return memberCreateSchema.safeParse({
    fullName: v.fullName,
    email: v.email,
    phone: v.phone,
    age: v.age || undefined,
    gender: v.gender,
    heightCm: v.heightCm || undefined,
    weightKg: v.weightKg || undefined,
    goal: v.goal,
    experience: v.experience,
    trainingDays: v.trainingDays,
    preferredDays: v.preferredDays,
    medicalNotes: v.medicalNotes,
    injuries: v.injuries,
    generatePlan: v.generatePlan,
  });
}

export async function createMemberAction(values: MemberFormValues): Promise<ActionResult<{ memberId: string }>> {
  const session = await requireOwnerWithGym();
  const parsed = toMemberInput(values);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  try {
    const { memberId } = await createMember(supabase, session.gymId, parsed.data);

    // Fire the invite email (best-effort; gym name for the template).
    const { data: gym } = await supabase.from("gyms").select("name").eq("id", session.gymId).single();
    await inviteMember({
      memberId,
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      gymName: gym?.name ?? "Your gym",
    });

    revalidatePath(ROUTES.owner.members);
    revalidatePath(ROUTES.owner.dashboard);
    return ok({ memberId });
  } catch (err) {
    return fromError(err);
  }
}

export async function updateMemberAction(
  memberId: string,
  values: MemberFormValues,
): Promise<ActionResult<{ memberId: string }>> {
  const session = await requireOwnerWithGym();
  const parsed = memberUpdateSchema.safeParse({
    fullName: values.fullName,
    phone: values.phone,
    age: values.age || undefined,
    gender: values.gender,
    heightCm: values.heightCm || undefined,
    weightKg: values.weightKg || undefined,
    goal: values.goal,
    experience: values.experience,
    trainingDays: values.trainingDays,
    preferredDays: values.preferredDays,
    medicalNotes: values.medicalNotes,
    injuries: values.injuries,
  });
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  try {
    await updateMember(supabase, session.gymId, memberId, parsed.data, values.generatePlan);
    revalidatePath(ROUTES.owner.member(memberId));
    revalidatePath(ROUTES.owner.members);
    return ok({ memberId });
  } catch (err) {
    return fromError(err);
  }
}

export async function removeMemberAction(memberId: string): Promise<ActionResult> {
  const session = await requireOwnerWithGym();
  const supabase = await createClient();
  try {
    await removeMember(supabase, session.gymId, memberId);
    revalidatePath(ROUTES.owner.members);
    revalidatePath(ROUTES.owner.dashboard);
    return ok(undefined);
  } catch (err) {
    return fromError(err);
  }
}

export async function resendInviteAction(memberId: string): Promise<ActionResult> {
  const session = await requireOwnerWithGym();
  const supabase = await createClient();
  try {
    const { member } = await getMember(supabase, session.gymId, memberId);
    const { data: gym } = await supabase.from("gyms").select("name").eq("id", session.gymId).single();
    await inviteMember({
      memberId,
      email: member.email,
      fullName: member.full_name,
      gymName: gym?.name ?? "Your gym",
    });
    return ok(undefined);
  } catch (err) {
    return fromError(err);
  }
}

export async function updateSettingsAction(input: GymSettingsInput): Promise<ActionResult> {
  const session = await requireOwnerWithGym();
  const parsed = gymSettingsSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  try {
    await updateGymSettings(supabase, session.gymId, parsed.data);
    revalidatePath(ROUTES.owner.settings);
    return ok(undefined);
  } catch (err) {
    return fromError(err);
  }
}

/** Used by the settings page to load current gym + subscription. */
export async function loadSettings() {
  const session = await requireOwnerWithGym();
  const supabase = await createClient();
  return getGymWithSubscription(supabase, session.gymId);
}
