"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth/session";
import { setExerciseDone, generatePlanForMember } from "@/lib/services/workouts";
import { upsertProgress } from "@/lib/services/progress";
import { memberProfileSchema, onboardingSchema, progressSchema } from "@/lib/validations";
import type { ProgressInput } from "@/lib/validations";
import { ok, fail, fromError, type ActionResult } from "@/lib/utils/result";
import { ROUTES } from "@/lib/constants";

/** Save the member's own fitness profile; optionally regenerate the plan. */
export async function saveProfileAction(raw: unknown, regenerate = false): Promise<ActionResult> {
  const session = await requireMember();
  const parsed = memberProfileSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const v = parsed.data;
  try {
    const { error } = await supabase
      .from("member_profiles")
      .update({
        age: v.age ?? null,
        gender: v.gender,
        height_cm: v.heightCm ?? null,
        weight_kg: v.weightKg ?? null,
        goal: v.goal,
        experience: v.experience,
        training_days: v.trainingDays,
        preferred_days: v.preferredDays ?? null,
        medical_notes: v.medicalNotes || null,
        injuries: v.injuries || null,
      })
      .eq("member_id", session.memberId);
    if (error) throw error;

    if (regenerate) {
      await generatePlanForMember(supabase, session.memberId, {
        goal: v.goal,
        experience: v.experience,
        gender: v.gender,
        trainingDays: v.trainingDays,
      });
    }

    revalidatePath(ROUTES.member.profile);
    revalidatePath(ROUTES.member.dashboard);
    revalidatePath(ROUTES.member.workoutPlan);
    return ok(undefined);
  } catch (err) {
    return fromError(err);
  }
}

/** Onboarding wizard completion: save measurements + generate the first plan. */
export async function completeOnboardingAction(raw: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const session = await requireMember();
  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  const v = parsed.data;
  try {
    const { error } = await supabase
      .from("member_profiles")
      .update({
        age: v.age,
        gender: v.gender,
        height_cm: v.heightCm,
        weight_kg: v.weightKg,
        goal: v.goal,
        experience: v.experience,
        training_days: v.trainingDays,
      })
      .eq("member_id", session.memberId);
    if (error) throw error;

    await generatePlanForMember(supabase, session.memberId, {
      goal: v.goal,
      experience: v.experience,
      gender: v.gender,
      trainingDays: v.trainingDays,
    });

    revalidatePath(ROUTES.member.dashboard);
    revalidatePath(ROUTES.member.workoutPlan);
    return ok({ redirectTo: ROUTES.member.dashboard });
  } catch (err) {
    return fromError(err);
  }
}

/** Toggle an exercise complete/incomplete. Verifies ownership via RLS. */
export async function toggleExerciseAction(exerciseId: string, done: boolean): Promise<ActionResult> {
  await requireMember();
  const supabase = await createClient();
  try {
    await setExerciseDone(supabase, exerciseId, done);
    revalidatePath(ROUTES.member.workoutPlan);
    revalidatePath(ROUTES.member.dashboard);
    return ok(undefined);
  } catch (err) {
    return fromError(err);
  }
}

/** Add or update today's progress entry. */
export async function addProgressAction(input: ProgressInput): Promise<ActionResult> {
  const session = await requireMember();
  const parsed = progressSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

  const supabase = await createClient();
  try {
    await upsertProgress(supabase, session.memberId, parsed.data);
    revalidatePath(ROUTES.member.progress);
    revalidatePath(ROUTES.member.dashboard);
    return ok(undefined);
  } catch (err) {
    return fromError(err);
  }
}
