import { requireMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/member/onboarding-wizard";

export const metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const session = await requireMember();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("goal, experience, gender, age, height_cm, weight_kg, training_days")
    .eq("member_id", session.memberId)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Let&apos;s build your plan</h1>
        <p className="text-sm text-muted-foreground">A few quick questions and you&apos;re training.</p>
      </div>
      <OnboardingWizard
        initial={{
          goal: profile?.goal,
          experience: profile?.experience,
          gender: profile?.gender,
          age: profile?.age != null ? String(profile.age) : "",
          heightCm: profile?.height_cm != null ? String(profile.height_cm) : "",
          weightKg: profile?.weight_kg != null ? String(profile.weight_kg) : "",
          trainingDays: profile?.training_days != null ? String(profile.training_days) : "3",
        }}
      />
    </div>
  );
}
