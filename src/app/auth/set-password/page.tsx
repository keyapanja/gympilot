import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { getSession, roleHome } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Set your password" };

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  // No active recovery/invite session → send to login.
  if (!session) redirect(ROUTES.login);

  const { next } = await searchParams;
  const destination = next || roleHome(session.role);

  return (
    <AuthCard title="Set your password" subtitle="Choose a password to access your account">
      <SetPasswordForm next={destination} />
    </AuthCard>
  );
}
