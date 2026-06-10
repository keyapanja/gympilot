import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/constants";
import type { Tables, UserRole } from "@/types/db.types";

export interface SessionContext {
  userId: string;
  email: string;
  profile: Tables<"profiles">;
  role: UserRole;
  gymId: string | null;
  memberId: string | null;
}

/** Resolve the current session + profile, or null if signed out. */
export async function getSession(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? "",
    profile,
    role: profile.role,
    gymId: profile.gym_id,
    memberId: profile.member_id,
  };
}

/** Require any authenticated user; redirects to /login otherwise. */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect(ROUTES.login);
  return session;
}

/** Require a specific role; redirects to the caller's correct home or /login. */
export async function requireRole(role: UserRole): Promise<SessionContext> {
  const session = await requireSession();
  if (session.role !== role) {
    redirect(roleHome(session.role));
  }
  return session;
}

export function roleHome(role: UserRole): string {
  switch (role) {
    case "super_admin":
      return ROUTES.admin.dashboard;
    case "owner":
      return ROUTES.owner.dashboard;
    case "member":
      return ROUTES.member.dashboard;
  }
}

/** Owner guard that also guarantees a gym exists; redirects to register flow if not. */
export async function requireOwnerWithGym(): Promise<SessionContext & { gymId: string }> {
  const session = await requireRole("owner");
  if (!session.gymId) {
    // Owner exists but workspace not created yet — send to settings to finish.
    redirect(ROUTES.owner.settings);
  }
  return session as SessionContext & { gymId: string };
}

/** Member guard that resolves the linked member id. */
export async function requireMember(): Promise<SessionContext & { memberId: string }> {
  const session = await requireRole("member");
  if (!session.memberId) redirect(ROUTES.login);
  return session as SessionContext & { memberId: string };
}
