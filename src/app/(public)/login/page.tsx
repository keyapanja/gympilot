import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { getSession, roleHome } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Login" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(roleHome(session.role));

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your GymPilot account"
      footer={
        <>
          New to GymPilot?{" "}
          <Link href={ROUTES.register} className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
