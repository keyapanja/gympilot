import type { ExperienceLevel, FitnessGoal } from "@/types/db.types";
import type { MatchCriteria, MatchResult, TemplateCandidate } from "./types";

/**
 * Rule-based workout recommendation engine.
 *
 * No AI, no external APIs. Given a member's criteria (goal, experience, gender,
 * training days) and the catalog of workout templates, it deterministically
 * scores every candidate and returns the best match. A scoring approach (rather
 * than rigid equality) gives graceful fallback when no exact template exists.
 *
 * Pure and side-effect free → fully unit-testable (see tests/workout-engine.test.ts).
 */

const EXPERIENCE_ORDER: Record<ExperienceLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

/**
 * Goal families: a member's goal can be satisfied by a related template when an
 * exact one is missing (e.g. "weight_loss" ⇄ "fat_loss"). The first entry is the
 * goal itself; remaining entries are acceptable fallbacks in priority order.
 */
const GOAL_FAMILIES: Record<FitnessGoal, FitnessGoal[]> = {
  weight_loss: ["weight_loss", "fat_loss", "general_fitness"],
  fat_loss: ["fat_loss", "weight_loss", "general_fitness"],
  muscle_gain: ["muscle_gain", "strength_training", "weight_gain"],
  weight_gain: ["weight_gain", "muscle_gain", "strength_training"],
  strength_training: ["strength_training", "muscle_gain", "general_fitness"],
  general_fitness: ["general_fitness", "fat_loss", "muscle_gain"],
};

const WEIGHTS = {
  goalExact: 100,
  goalFamily: 55, // minus index penalty
  experienceExact: 30,
  experienceAdjacent: 15,
  genderExact: 15,
  genderAny: 10,
  daysExact: 25,
  daysPerDiff: -6, // per day of difference
} as const;

/** Score a single template against the criteria. Returns -Infinity if incompatible. */
export function scoreTemplate(criteria: MatchCriteria, t: TemplateCandidate): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // --- Goal (mandatory: must be in the family) ---
  const family = GOAL_FAMILIES[criteria.goal];
  const goalIndex = family.indexOf(t.goal);
  if (goalIndex === -1) {
    return { score: -Infinity, reasons: ["goal mismatch"] };
  }
  if (goalIndex === 0) {
    score += WEIGHTS.goalExact;
    reasons.push("goal exact");
  } else {
    score += WEIGHTS.goalFamily - (goalIndex - 1) * 10;
    reasons.push(`goal related (${t.goal})`);
  }

  // --- Experience ---
  const diff = Math.abs(EXPERIENCE_ORDER[criteria.experience] - EXPERIENCE_ORDER[t.experience]);
  if (diff === 0) {
    score += WEIGHTS.experienceExact;
    reasons.push("experience exact");
  } else if (diff === 1) {
    score += WEIGHTS.experienceAdjacent;
    reasons.push("experience adjacent");
  } else {
    reasons.push("experience far");
  }

  // --- Gender ---
  if (t.gender === "any") {
    score += WEIGHTS.genderAny;
    reasons.push("gender any");
  } else if (t.gender === criteria.gender) {
    score += WEIGHTS.genderExact;
    reasons.push("gender exact");
  } else {
    reasons.push("gender mismatch (allowed)");
  }

  // --- Training days ---
  const dayDiff = Math.abs(criteria.trainingDays - t.training_days);
  if (dayDiff === 0) {
    score += WEIGHTS.daysExact;
    reasons.push("days exact");
  } else {
    score += Math.max(0, WEIGHTS.daysExact + dayDiff * WEIGHTS.daysPerDiff);
    reasons.push(`days off by ${dayDiff}`);
  }

  return { score, reasons };
}

/**
 * Select the best template for a member. Deterministic: ties are broken by the
 * smaller training-day distance, then by template key (stable ordering).
 * Returns null only when the catalog is empty or no goal-family match exists.
 */
export function selectTemplate(criteria: MatchCriteria, candidates: TemplateCandidate[]): MatchResult | null {
  let best: MatchResult | null = null;

  for (const t of candidates) {
    const { score, reasons } = scoreTemplate(criteria, t);
    if (score === -Infinity) continue;

    const exact =
      t.goal === criteria.goal &&
      t.experience === criteria.experience &&
      t.training_days === criteria.trainingDays &&
      (t.gender === "any" || t.gender === criteria.gender);

    const candidate: MatchResult = { template: t, score, exact, reasons };

    if (!best) {
      best = candidate;
      continue;
    }
    if (score > best.score) {
      best = candidate;
    } else if (score === best.score) {
      // tie-break: closer day count, then stable key order
      const a = Math.abs(criteria.trainingDays - t.training_days);
      const b = Math.abs(criteria.trainingDays - best.template.training_days);
      if (a < b || (a === b && t.key < best.template.key)) best = candidate;
    }
  }

  return best;
}
