import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Dumbbell } from "lucide-react";
import { requireMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getActivePlan, getCompletionStats } from "@/lib/services/workouts";
import { listProgress } from "@/lib/services/progress";
import { PageHeader } from "@/components/shared/page-header";
import { GoalCard, BmiCard, CompletionCard } from "@/components/member/summary-cards";
import { WeightChart } from "@/components/charts/progress-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calculateBmi } from "@/lib/utils/bmi";
import { ROUTES } from "@/lib/constants";

export default async function MemberDashboardPage() {
  const session = await requireMember();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("member_profiles")
    .select("*")
    .eq("member_id", session.memberId)
    .maybeSingle();

  const [plan, completion, progress] = await Promise.all([
    getActivePlan(supabase, session.memberId),
    getCompletionStats(supabase, session.memberId),
    listProgress(supabase, session.memberId),
  ]);

  // First-run: no plan yet → send to onboarding.
  if (!plan) redirect(ROUTES.member.onboarding);

  const bmi = calculateBmi(profile?.height_cm, profile?.weight_kg);
  const firstName = (session.profile.full_name ?? "there").split(" ")[0];

  return (
    <>
      <PageHeader title={`Hi ${firstName} 👋`} description="Here's your training snapshot" />

      <div className="grid gap-4 sm:grid-cols-3">
        {profile && <GoalCard goal={profile.goal} />}
        <BmiCard bmi={bmi?.bmi ?? null} category={bmi?.category ?? null} />
        <CompletionCard completed={completion.completed} total={completion.total} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">This week&apos;s plan</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={ROUTES.member.workoutPlan}>
                View plan <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.days.slice(0, 4).map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <Dumbbell className={d.isRest ? "h-4 w-4 text-muted-foreground" : "h-4 w-4 text-primary"} />
                  {d.title}
                </span>
                {d.isRest ? (
                  <Badge variant="muted">Rest</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">{d.exercises.length} exercises</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Weight progress</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={ROUTES.member.progress}>
                Log progress <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <WeightChart data={progress} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
