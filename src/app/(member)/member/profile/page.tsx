import { requireMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { MemberProfileForm } from "@/components/member/profile-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Profile" };

export default async function MemberProfilePage() {
  const session = await requireMember();
  const supabase = await createClient();

  const [{ data: member }, { data: profile }] = await Promise.all([
    supabase.from("members").select("full_name, email, phone").eq("id", session.memberId).single(),
    supabase.from("member_profiles").select("*").eq("member_id", session.memberId).maybeSingle(),
  ]);

  return (
    <>
      <PageHeader title="Profile" description="Keep your details up to date" />

      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium">{member?.full_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{member?.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="font-medium">{member?.phone ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <MemberProfileForm
        initial={{
          goal: profile?.goal ?? "general_fitness",
          experience: profile?.experience ?? "beginner",
          gender: profile?.gender ?? "other",
          age: profile?.age != null ? String(profile.age) : "",
          heightCm: profile?.height_cm != null ? String(profile.height_cm) : "",
          weightKg: profile?.weight_kg != null ? String(profile.weight_kg) : "",
          trainingDays: profile?.training_days != null ? String(profile.training_days) : "3",
          medicalNotes: profile?.medical_notes ?? "",
          injuries: profile?.injuries ?? "",
        }}
      />
    </>
  );
}
