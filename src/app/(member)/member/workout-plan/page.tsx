import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { requireMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getActivePlan } from "@/lib/services/workouts";
import { PageHeader } from "@/components/shared/page-header";
import { WorkoutPlanView } from "@/components/workout/workout-plan-view";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toggleExerciseAction } from "@/app/(member)/actions";
import { GOAL_LABELS, ROUTES } from "@/lib/constants";

export const metadata = { title: "Workout plan" };

export default async function WorkoutPlanPage() {
  const session = await requireMember();
  const supabase = await createClient();
  const plan = await getActivePlan(supabase, session.memberId);

  if (!plan) {
    return (
      <>
        <PageHeader title="Workout plan" />
        <EmptyState
          icon={Dumbbell}
          title="No plan yet"
          description="Complete onboarding to generate your personalized workout plan."
          action={
            <Button asChild>
              <Link href={ROUTES.member.onboarding}>Start onboarding</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="My workout plan"
        description={`${plan.trainingDays} days / week`}
        action={<Badge>{GOAL_LABELS[plan.goal]}</Badge>}
      />
      <p className="text-sm text-muted-foreground">
        Tick exercises as you complete them — your dashboard tracks your weekly completion.
      </p>
      <WorkoutPlanView plan={plan} toggleAction={toggleExerciseAction} />
    </>
  );
}
