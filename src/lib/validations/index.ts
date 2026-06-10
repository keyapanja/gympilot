import { z } from "zod";

/** Shared enum schemas (mirror DB enums). */
export const goalEnum = z.enum([
  "weight_loss",
  "weight_gain",
  "muscle_gain",
  "fat_loss",
  "general_fitness",
  "strength_training",
]);
export const experienceEnum = z.enum(["beginner", "intermediate", "advanced"]);
export const genderEnum = z.enum(["male", "female", "other"]);

// ---------- Auth ----------
export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Enter your full name").max(80),
    gymName: z.string().min(2, "Enter your gym name").max(80),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const requestResetSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export const setPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ---------- Gym settings ----------
export const gymSettingsSchema = z.object({
  name: z.string().min(2).max(80),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(30).optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
});
export type GymSettingsInput = z.infer<typeof gymSettingsSchema>;

// ---------- Members ----------
export const memberCreateSchema = z.object({
  fullName: z.string().min(2, "Enter the member's name").max(80),
  email: z.string().email("Enter a valid email"),
  phone: z.string().max(30).optional().or(z.literal("")),
  age: z.coerce.number().int().min(10).max(100).optional(),
  gender: genderEnum.default("other"),
  heightCm: z.coerce.number().min(80).max(260).optional(),
  weightKg: z.coerce.number().min(25).max(400).optional(),
  goal: goalEnum,
  experience: experienceEnum,
  trainingDays: z.coerce.number().int().min(1).max(7),
  preferredDays: z.array(z.string()).optional(),
  medicalNotes: z.string().max(1000).optional().or(z.literal("")),
  injuries: z.string().max(1000).optional().or(z.literal("")),
  generatePlan: z.boolean().default(true),
});
export type MemberCreateInput = z.infer<typeof memberCreateSchema>;

export const memberUpdateSchema = memberCreateSchema.partial().extend({
  status: z.enum(["invited", "active", "inactive"]).optional(),
});
export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;

// ---------- Member self profile ----------
export const memberProfileSchema = z.object({
  age: z.coerce.number().int().min(10).max(100).optional(),
  gender: genderEnum,
  heightCm: z.coerce.number().min(80).max(260).optional(),
  weightKg: z.coerce.number().min(25).max(400).optional(),
  goal: goalEnum,
  experience: experienceEnum,
  trainingDays: z.coerce.number().int().min(1).max(7),
  preferredDays: z.array(z.string()).optional(),
  medicalNotes: z.string().max(1000).optional().or(z.literal("")),
  injuries: z.string().max(1000).optional().or(z.literal("")),
});
export type MemberProfileInput = z.infer<typeof memberProfileSchema>;

// ---------- Onboarding wizard ----------
export const onboardingSchema = z.object({
  goal: goalEnum,
  experience: experienceEnum,
  gender: genderEnum,
  age: z.coerce.number().int().min(10).max(100),
  heightCm: z.coerce.number().min(80).max(260),
  weightKg: z.coerce.number().min(25).max(400),
  trainingDays: z.coerce.number().int().min(1).max(7),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ---------- Progress ----------
export const progressSchema = z.object({
  recordedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  weightKg: z.coerce.number().min(25).max(400).optional(),
  waistCm: z.coerce.number().min(30).max(250).optional(),
  chestCm: z.coerce.number().min(30).max(250).optional(),
  armsCm: z.coerce.number().min(10).max(120).optional(),
  hipsCm: z.coerce.number().min(30).max(250).optional(),
  note: z.string().max(280).optional().or(z.literal("")),
});
export type ProgressInput = z.infer<typeof progressSchema>;

// ---------- Contact ----------
export const contactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  message: z.string().min(10, "Tell us a little more").max(2000),
});
export type ContactInput = z.infer<typeof contactSchema>;

// ---------- Admin ----------
export const updateSubscriptionSchema = z.object({
  gymId: z.string().uuid(),
  planKey: z.enum(["starter", "growth", "pro", "enterprise"]),
  status: z.enum(["trialing", "active", "past_due", "canceled"]),
});
