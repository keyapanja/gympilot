import type { ExperienceLevel, FitnessGoal, Gender } from "@/types/db.types";

/** Human-readable labels and option lists used across forms and displays. */

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  weight_loss: "Weight Loss",
  weight_gain: "Weight Gain",
  muscle_gain: "Muscle Gain",
  fat_loss: "Fat Loss",
  general_fitness: "General Fitness",
  strength_training: "Strength Training",
};

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const GENDER_LABELS: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

export const GOAL_OPTIONS = Object.entries(GOAL_LABELS).map(([value, label]) => ({
  value: value as FitnessGoal,
  label,
}));

export const EXPERIENCE_OPTIONS = Object.entries(EXPERIENCE_LABELS).map(([value, label]) => ({
  value: value as ExperienceLevel,
  label,
}));

export const GENDER_OPTIONS = Object.entries(GENDER_LABELS).map(([value, label]) => ({
  value: value as Gender,
  label,
}));

export const TRAINING_DAYS_OPTIONS = [2, 3, 4, 5, 6].map((d) => ({
  value: d,
  label: `${d} days / week`,
}));

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** App route map — single source of truth for navigation. */
export const ROUTES = {
  home: "/",
  features: "/#features",
  pricing: "/#pricing",
  contact: "/#contact",
  login: "/login",
  register: "/register",
  owner: {
    dashboard: "/owner/dashboard",
    members: "/owner/members",
    newMember: "/owner/members/new",
    settings: "/owner/settings",
    member: (id: string) => `/owner/members/${id}`,
    editMember: (id: string) => `/owner/members/${id}/edit`,
  },
  member: {
    dashboard: "/member/dashboard",
    onboarding: "/member/onboarding",
    workoutPlan: "/member/workout-plan",
    progress: "/member/progress",
    profile: "/member/profile",
  },
  admin: {
    dashboard: "/admin/dashboard",
    gyms: "/admin/gyms",
    subscriptions: "/admin/subscriptions",
    analytics: "/admin/analytics",
    gym: (id: string) => `/admin/gyms/${id}`,
  },
} as const;

/** Where to send a user after login, by role. */
export function homeForRole(role: string | null | undefined): string {
  switch (role) {
    case "super_admin":
      return ROUTES.admin.dashboard;
    case "owner":
      return ROUTES.owner.dashboard;
    case "member":
      return ROUTES.member.dashboard;
    default:
      return ROUTES.login;
  }
}
