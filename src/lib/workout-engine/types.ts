import type { ExperienceLevel, FitnessGoal, Gender, TemplateGender } from "@/types/db.types";

/** Member criteria the engine matches against. */
export interface MatchCriteria {
  goal: FitnessGoal;
  experience: ExperienceLevel;
  gender: Gender;
  trainingDays: number;
}

/** A template candidate (subset of workout_templates) considered by the engine. */
export interface TemplateCandidate {
  id: string;
  key: string;
  goal: FitnessGoal;
  experience: ExperienceLevel;
  gender: TemplateGender;
  training_days: number;
  title: string;
}

/** Result of selecting a template for a member. */
export interface MatchResult {
  template: TemplateCandidate;
  score: number;
  exact: boolean;
  reasons: string[];
}
