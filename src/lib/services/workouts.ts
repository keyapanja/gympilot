import "server-only";
import type { DB } from "./types";
import { selectTemplate, type TemplateCandidate } from "@/lib/workout-engine";
import { GOAL_LABELS } from "@/lib/constants";
import type { ExperienceLevel, FitnessGoal, Gender } from "@/types/db.types";

export interface PlanCriteria {
  goal: FitnessGoal;
  experience: ExperienceLevel;
  gender: Gender;
  trainingDays: number;
}

/** Fetch the active workout-template catalog as engine candidates. */
async function loadCandidates(db: DB): Promise<TemplateCandidate[]> {
  const { data, error } = await db
    .from("workout_templates")
    .select("id, key, goal, experience, gender, training_days, title")
    .eq("is_active", true);
  if (error) throw error;
  return (data ?? []) as TemplateCandidate[];
}

/**
 * Generate (or regenerate) a member's workout plan from the rule engine.
 * Archives any existing active plan, selects the best template, then
 * materializes its days + exercises into editable plan rows.
 */
export async function generatePlanForMember(db: DB, memberId: string, criteria: PlanCriteria) {
  const candidates = await loadCandidates(db);
  const match = selectTemplate(
    {
      goal: criteria.goal,
      experience: criteria.experience,
      gender: criteria.gender,
      trainingDays: criteria.trainingDays,
    },
    candidates,
  );

  if (!match) {
    throw new Error("NO_TEMPLATE: No workout template available for these criteria.");
  }

  // Archive current active plan(s).
  await db
    .from("member_workout_plans")
    .update({ status: "archived" })
    .eq("member_id", memberId)
    .eq("status", "active");

  // Create the new plan shell.
  const { data: plan, error: planErr } = await db
    .from("member_workout_plans")
    .insert({
      member_id: memberId,
      source_template_id: match.template.id,
      title: `${GOAL_LABELS[criteria.goal]} Plan`,
      goal: criteria.goal,
      experience: criteria.experience,
      training_days: criteria.trainingDays,
      status: "active",
    })
    .select("id")
    .single();
  if (planErr) throw planErr;

  // Load the template structure.
  const { data: days, error: daysErr } = await db
    .from("template_days")
    .select("id, day_index, title, is_rest")
    .eq("template_id", match.template.id)
    .order("day_index");
  if (daysErr) throw daysErr;

  for (const day of days ?? []) {
    const { data: planDay, error: pdErr } = await db
      .from("plan_days")
      .insert({ plan_id: plan.id, day_index: day.day_index, title: day.title, is_rest: day.is_rest })
      .select("id")
      .single();
    if (pdErr) throw pdErr;

    if (day.is_rest) continue;

    const { data: texData, error: texErr } = await db
      .from("template_exercises")
      .select("position, sets, reps, rest_seconds, notes, exercise_id, exercises(name)")
      .eq("template_day_id", day.id)
      .order("position");
    if (texErr) throw texErr;

    // Embedded selects can't be inferred from hand-authored types; narrow explicitly.
    const tex = (texData ?? []) as unknown as Array<{
      position: number;
      sets: number;
      reps: string;
      rest_seconds: number;
      notes: string | null;
      exercise_id: string;
      exercises: { name: string } | { name: string }[] | null;
    }>;

    const rows = tex.map((e) => {
      const ex = e.exercises as { name: string } | { name: string }[] | null;
      const name = Array.isArray(ex) ? ex[0]?.name : ex?.name;
      return {
        plan_day_id: planDay.id,
        exercise_id: e.exercise_id,
        exercise_name: name ?? "Exercise",
        position: e.position,
        sets: e.sets,
        reps: e.reps,
        rest_seconds: e.rest_seconds,
        notes: e.notes,
      };
    });
    if (rows.length > 0) {
      const { error: insErr } = await db.from("plan_exercises").insert(rows);
      if (insErr) throw insErr;
    }
  }

  return { planId: plan.id, templateKey: match.template.key, exact: match.exact };
}

/** The shape returned to the workout-plan UI. */
export interface PlanView {
  id: string;
  title: string;
  goal: FitnessGoal;
  trainingDays: number;
  days: {
    id: string;
    title: string;
    isRest: boolean;
    dayIndex: number;
    exercises: {
      id: string;
      name: string;
      sets: number;
      reps: string;
      restSeconds: number;
      notes: string | null;
      completedCount: number;
    }[];
  }[];
}

/** Load a member's active plan fully expanded for display. */
export async function getActivePlan(db: DB, memberId: string): Promise<PlanView | null> {
  const { data: plan } = await db
    .from("member_workout_plans")
    .select("id, title, goal, training_days")
    .eq("member_id", memberId)
    .eq("status", "active")
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return null;

  const { data: daysData } = await db
    .from("plan_days")
    .select("id, title, is_rest, day_index, plan_exercises(id, exercise_name, sets, reps, rest_seconds, notes, completed_count, position)")
    .eq("plan_id", plan.id)
    .order("day_index");

  const days = (daysData ?? []) as unknown as Array<{
    id: string;
    title: string;
    is_rest: boolean;
    day_index: number;
    plan_exercises: Array<{
      id: string;
      exercise_name: string;
      sets: number;
      reps: string;
      rest_seconds: number;
      notes: string | null;
      completed_count: number;
      position: number;
    }> | null;
  }>;

  return {
    id: plan.id,
    title: plan.title,
    goal: plan.goal,
    trainingDays: plan.training_days,
    days: days.map((d) => ({
      id: d.id,
      title: d.title,
      isRest: d.is_rest,
      dayIndex: d.day_index,
      exercises: (d.plan_exercises ?? [])
        .sort((a, b) => a.position - b.position)
        .map((e) => ({
          id: e.id,
          name: e.exercise_name,
          sets: e.sets,
          reps: e.reps,
          restSeconds: e.rest_seconds,
          notes: e.notes,
          completedCount: e.completed_count,
        })),
    })),
  };
}

/** Toggle an exercise as completed/incomplete (increment/reset a counter). */
export async function setExerciseDone(db: DB, exerciseId: string, done: boolean) {
  const { error } = await db
    .from("plan_exercises")
    .update({ completed_count: done ? 1 : 0 })
    .eq("id", exerciseId);
  if (error) throw error;
}

/** Completion stats for the member dashboard. */
export async function getCompletionStats(db: DB, memberId: string) {
  const plan = await getActivePlan(db, memberId);
  if (!plan) return { total: 0, completed: 0, ratio: 0 };
  let total = 0;
  let completed = 0;
  for (const day of plan.days) {
    for (const ex of day.exercises) {
      total += 1;
      if (ex.completedCount > 0) completed += 1;
    }
  }
  return { total, completed, ratio: total === 0 ? 0 : completed / total };
}
