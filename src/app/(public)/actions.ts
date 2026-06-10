"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createGymForOwner } from "@/lib/services/gyms";
import { sendWelcomeOwner, sendPasswordReset } from "@/lib/email";
import { contactSchema, loginSchema, registerSchema, requestResetSchema } from "@/lib/validations";
import { ROUTES, homeForRole } from "@/lib/constants";
import { ok, fail, fromError, type ActionResult } from "@/lib/utils/result";
import { env } from "@/lib/env";

/** Register a gym owner: create auth user, workspace, Starter subscription. */
export async function registerOwner(raw: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { fullName, gymName, email, password } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role: "owner", full_name: fullName } },
  });
  if (error) return fail("AUTH", error.message);
  if (!data.user) return fail("AUTH", "Could not create account.");

  try {
    const admin = createAdminClient();
    await createGymForOwner(admin, { ownerId: data.user.id, gymName, contactEmail: email });
    await sendWelcomeOwner(email, fullName, gymName);
  } catch (err) {
    return fromError(err);
  }

  // If email confirmation is required, there is no session yet.
  if (!data.session) {
    return ok({ redirectTo: `${ROUTES.login}?confirm=1` });
  }
  return ok({ redirectTo: ROUTES.owner.dashboard });
}

/** Email + password login; resolves role to choose the landing page. */
export async function login(raw: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", "Enter your email and password");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return fail("AUTH", "Invalid email or password");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  return ok({ redirectTo: homeForRole(profile?.role) });
}

/** Send a password reset email (via Supabase recovery link + Resend). */
export async function requestPasswordReset(raw: unknown): Promise<ActionResult> {
  const parsed = requestResetSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", "Enter a valid email");

  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.generateLink({ type: "recovery", email: parsed.data.email });
    const props = data?.properties;
    if (props?.hashed_token) {
      const next = encodeURIComponent("/auth/set-password");
      const url = `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm?token_hash=${props.hashed_token}&type=${props.verification_type}&next=${next}`;
      await sendPasswordReset(parsed.data.email, url);
    }
    // Always succeed (don't reveal whether the email exists).
    return ok(undefined);
  } catch {
    return ok(undefined);
  }
}

/** Public contact form — logged server-side (Phase 1 has no CRM). */
export async function submitContact(raw: unknown): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");
  console.info("[contact] new enquiry:", parsed.data.email, "—", parsed.data.name);
  return ok(undefined);
}

/** Sign out (used by route handler / any server context). */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(ROUTES.login);
}
