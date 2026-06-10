import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { getSession, roleHome } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Create your gym workspace" };

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect(roleHome(session.role));

  return (
    <AuthCard
      title="Create your gym workspace"
      subtitle="Start coaching every member in minutes"
      footer={
        <>
          Already have an account?{" "}
          <Link href={ROUTES.login} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
