/**
 * Database types for the GymPilot Postgres schema.
 *
 * In a live project these are regenerated with:
 *   npm run db:types   (supabase gen types typescript --local)
 * This hand-authored version mirrors supabase/migrations and keeps the app
 * strictly typed without requiring a running database at build time.
 *
 * `_Tables` / `_Views` describe the raw shapes; the exported `Database` maps
 * them to add the `Relationships: []` field that supabase-js's GenericSchema
 * requires (otherwise `.from()` queries degrade to `never`).
 */

export type UserRole = "super_admin" | "owner" | "member";
export type Gender = "male" | "female" | "other";
export type TemplateGender = "any" | "male" | "female";
export type FitnessGoal =
  | "weight_loss"
  | "weight_gain"
  | "muscle_gain"
  | "fat_loss"
  | "general_fitness"
  | "strength_training";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type MemberStatus = "invited" | "active" | "inactive";
export type SubStatus = "trialing" | "active" | "past_due" | "canceled";
export type PlanStatus = "active" | "archived";

type Timestamp = string;

interface PlansTable {
  Row: {
    id: string;
    key: string;
    name: string;
    member_limit: number;
    price_cents: number;
    sort: number;
    is_active: boolean;
    created_at: Timestamp;
  };
  Insert: Partial<PlansTable["Row"]> & { key: string; name: string; member_limit: number };
  Update: Partial<PlansTable["Row"]>;
}

interface ProfilesTable {
  Row: {
    id: string;
    role: UserRole;
    full_name: string | null;
    avatar_url: string | null;
    gym_id: string | null;
    member_id: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };
  Insert: { id: string } & Partial<Omit<ProfilesTable["Row"], "id">>;
  Update: Partial<ProfilesTable["Row"]>;
}

interface GymsTable {
  Row: {
    id: string;
    owner_id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    contact_email: string;
    contact_phone: string | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };
  Insert: { owner_id: string; name: string; slug: string; contact_email: string } & Partial<GymsTable["Row"]>;
  Update: Partial<GymsTable["Row"]>;
}

interface SubscriptionsTable {
  Row: {
    id: string;
    gym_id: string;
    plan_id: string;
    status: SubStatus;
    member_limit: number;
    current_period_end: Timestamp | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };
  Insert: { gym_id: string; plan_id: string; member_limit: number } & Partial<SubscriptionsTable["Row"]>;
  Update: Partial<SubscriptionsTable["Row"]>;
}

interface MembersTable {
  Row: {
    id: string;
    gym_id: string;
    profile_id: string | null;
    full_name: string;
    email: string;
    phone: string | null;
    status: MemberStatus;
    invited_at: Timestamp;
    joined_at: Timestamp | null;
    created_at: Timestamp;
    updated_at: Timestamp;
  };
  Insert: { gym_id: string; full_name: string; email: string } & Partial<MembersTable["Row"]>;
  Update: Partial<MembersTable["Row"]>;
}

interface MemberProfilesTable {
  Row: {
    member_id: string;
    age: number | null;
    gender: Gender;
    height_cm: number | null;
    weight_kg: number | null;
    goal: FitnessGoal;
    experience: ExperienceLevel;
    training_days: number;
    preferred_days: string[] | null;
    medical_notes: string | null;
    injuries: string | null;
    updated_at: Timestamp;
  };
  Insert: { member_id: string } & Partial<Omit<MemberProfilesTable["Row"], "member_id">>;
  Update: Partial<MemberProfilesTable["Row"]>;
}

interface ExercisesTable {
  Row: { id: string; name: string; muscle_group: string; equipment: string | null; is_global: boolean; created_at: Timestamp };
  Insert: { name: string; muscle_group: string } & Partial<ExercisesTable["Row"]>;
  Update: Partial<ExercisesTable["Row"]>;
}

interface WorkoutTemplatesTable {
  Row: {
    id: string;
    key: string;
    goal: FitnessGoal;
    experience: ExperienceLevel;
    gender: TemplateGender;
    training_days: number;
    title: string;
    description: string | null;
    is_active: boolean;
    created_at: Timestamp;
  };
  Insert: { key: string; goal: FitnessGoal; experience: ExperienceLevel; training_days: number; title: string } & Partial<
    WorkoutTemplatesTable["Row"]
  >;
  Update: Partial<WorkoutTemplatesTable["Row"]>;
}

interface TemplateDaysTable {
  Row: { id: string; template_id: string; day_index: number; title: string; is_rest: boolean };
  Insert: { template_id: string; day_index: number; title: string } & Partial<TemplateDaysTable["Row"]>;
  Update: Partial<TemplateDaysTable["Row"]>;
}

interface TemplateExercisesTable {
  Row: {
    id: string;
    template_day_id: string;
    exercise_id: string;
    position: number;
    sets: number;
    reps: string;
    rest_seconds: number;
    notes: string | null;
  };
  Insert: { template_day_id: string; exercise_id: string; position: number } & Partial<TemplateExercisesTable["Row"]>;
  Update: Partial<TemplateExercisesTable["Row"]>;
}

interface MemberWorkoutPlansTable {
  Row: {
    id: string;
    member_id: string;
    source_template_id: string | null;
    title: string;
    goal: FitnessGoal;
    experience: ExperienceLevel;
    training_days: number;
    status: PlanStatus;
    assigned_at: Timestamp;
  };
  Insert: { member_id: string; title: string; goal: FitnessGoal; experience: ExperienceLevel; training_days: number } & Partial<
    MemberWorkoutPlansTable["Row"]
  >;
  Update: Partial<MemberWorkoutPlansTable["Row"]>;
}

interface PlanDaysTable {
  Row: { id: string; plan_id: string; day_index: number; title: string; is_rest: boolean };
  Insert: { plan_id: string; day_index: number; title: string } & Partial<PlanDaysTable["Row"]>;
  Update: Partial<PlanDaysTable["Row"]>;
}

interface PlanExercisesTable {
  Row: {
    id: string;
    plan_day_id: string;
    exercise_id: string | null;
    exercise_name: string;
    position: number;
    sets: number;
    reps: string;
    rest_seconds: number;
    notes: string | null;
    completed_count: number;
  };
  Insert: { plan_day_id: string; exercise_name: string; position: number } & Partial<PlanExercisesTable["Row"]>;
  Update: Partial<PlanExercisesTable["Row"]>;
}

interface ProgressEntriesTable {
  Row: {
    id: string;
    member_id: string;
    recorded_on: string;
    weight_kg: number | null;
    waist_cm: number | null;
    chest_cm: number | null;
    arms_cm: number | null;
    hips_cm: number | null;
    note: string | null;
    created_at: Timestamp;
  };
  Insert: { member_id: string } & Partial<Omit<ProgressEntriesTable["Row"], "member_id">>;
  Update: Partial<ProgressEntriesTable["Row"]>;
}

interface _Tables {
  plans: PlansTable;
  profiles: ProfilesTable;
  gyms: GymsTable;
  subscriptions: SubscriptionsTable;
  members: MembersTable;
  member_profiles: MemberProfilesTable;
  exercises: ExercisesTable;
  workout_templates: WorkoutTemplatesTable;
  template_days: TemplateDaysTable;
  template_exercises: TemplateExercisesTable;
  member_workout_plans: MemberWorkoutPlansTable;
  plan_days: PlanDaysTable;
  plan_exercises: PlanExercisesTable;
  progress_entries: ProgressEntriesTable;
}

interface _Views {
  gym_stats: {
    Row: {
      gym_id: string;
      name: string;
      member_limit: number;
      members_used: number;
      active_members: number;
      invited_members: number;
      recent_signups: number;
    };
  };
  member_bmi: {
    Row: {
      member_id: string;
      height_cm: number | null;
      weight_kg: number | null;
      bmi: number | null;
      bmi_category: string | null;
    };
  };
  platform_stats: {
    Row: {
      total_gyms: number;
      total_members: number;
      active_subscriptions: number;
      trialing_subscriptions: number;
      new_members_30d: number;
    };
  };
}

// Add the `Relationships` field required by supabase-js's GenericSchema.
type WithRel<T> = { [K in keyof T]: T[K] & { Relationships: [] } };

export interface Database {
  public: {
    Tables: WithRel<_Tables>;
    Views: WithRel<_Views>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      gender_t: Gender;
      template_gender: TemplateGender;
      fitness_goal: FitnessGoal;
      experience_level: ExperienceLevel;
      member_status: MemberStatus;
      sub_status: SubStatus;
      plan_status: PlanStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Convenience row aliases
export type Tables<T extends keyof _Tables> = _Tables[T]["Row"];
export type Views<T extends keyof _Views> = _Views[T]["Row"];
