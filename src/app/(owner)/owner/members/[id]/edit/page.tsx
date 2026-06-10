import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireOwnerWithGym } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getMember } from "@/lib/services/members";
import { PageHeader } from "@/components/shared/page-header";
import { MemberForm, type MemberFormValues } from "@/components/members/member-form";
import { Button } from "@/components/ui/button";
import { updateMemberAction } from "@/app/(owner)/actions";
import { ROUTES } from "@/lib/constants";

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwnerWithGym();
  const supabase = await createClient();
  const { id } = await params;

  let data;
  try {
    data = await getMember(supabase, session.gymId, id);
  } catch {
    notFound();
  }
  const { member, profile } = data;

  const initial: Partial<MemberFormValues> = {
    fullName: member.full_name,
    email: member.email,
    phone: member.phone ?? "",
    age: profile?.age != null ? String(profile.age) : "",
    gender: profile?.gender ?? "other",
    heightCm: profile?.height_cm != null ? String(profile.height_cm) : "",
    weightKg: profile?.weight_kg != null ? String(profile.weight_kg) : "",
    goal: profile?.goal ?? "general_fitness",
    experience: profile?.experience ?? "beginner",
    trainingDays: profile?.training_days != null ? String(profile.training_days) : "3",
    preferredDays: profile?.preferred_days ?? [],
    medicalNotes: profile?.medical_notes ?? "",
    injuries: profile?.injuries ?? "",
    generatePlan: false,
  };

  // Bind the member id into the update server action.
  const action = updateMemberAction.bind(null, id);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={ROUTES.owner.member(id)} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader title={`Edit ${member.full_name}`} description="Update details or regenerate the workout plan" />
      </div>

      <MemberForm action={action} initial={initial} mode="edit" submitLabel="Save changes" />
    </>
  );
}
