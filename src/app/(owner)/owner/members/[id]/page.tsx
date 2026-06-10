import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireOwnerWithGym } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getMember } from "@/lib/services/members";
import { getActivePlan } from "@/lib/services/workouts";
import { listProgress } from "@/lib/services/progress";
import { MemberStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkoutPlanView } from "@/components/workout/workout-plan-view";
import { WeightChart, MeasurementChart } from "@/components/charts/progress-charts";
import { EmptyState } from "@/components/shared/empty-state";
import { Dumbbell } from "lucide-react";
import { EXPERIENCE_LABELS, GENDER_LABELS, GOAL_LABELS, ROUTES } from "@/lib/constants";
import { calculateBmi } from "@/lib/utils/bmi";
import { formatDate } from "@/lib/utils/format";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireOwnerWithGym();
  const supabase = await createClient();
  const { id } = await params;

  let result;
  try {
    result = await getMember(supabase, session.gymId, id);
  } catch {
    notFound();
  }
  const { member, profile } = result;
  const [plan, progress] = await Promise.all([getActivePlan(supabase, id), listProgress(supabase, id)]);
  const bmi = calculateBmi(profile?.height_cm, profile?.weight_kg);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={ROUTES.owner.members} aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{member.full_name}</h1>
              <MemberStatusBadge status={member.status} />
            </div>
            <p className="text-sm text-muted-foreground">{member.email}</p>
          </div>
        </div>
        <Button asChild>
          <Link href={ROUTES.owner.editMember(id)}>
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="plan">Workout Plan</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fitness profile</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <Info label="Goal" value={profile ? GOAL_LABELS[profile.goal] : "—"} />
                <Info label="Experience" value={profile ? EXPERIENCE_LABELS[profile.experience] : "—"} />
                <Info label="Gender" value={profile ? GENDER_LABELS[profile.gender] : "—"} />
                <Info label="Age" value={profile?.age ?? "—"} />
                <Info label="Height" value={profile?.height_cm ? `${profile.height_cm} cm` : "—"} />
                <Info label="Weight" value={profile?.weight_kg ? `${profile.weight_kg} kg` : "—"} />
                <Info label="Training days" value={`${profile?.training_days ?? "—"}/week`} />
                <Info
                  label="BMI"
                  value={bmi ? `${bmi.bmi} (${bmi.category})` : "—"}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes & preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Preferred days</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {profile?.preferred_days?.length
                      ? profile.preferred_days.map((d) => <Badge key={d} variant="secondary">{d}</Badge>)
                      : "—"}
                  </div>
                </div>
                <Info label="Medical notes" value={profile?.medical_notes || "None"} block />
                <Info label="Injuries" value={profile?.injuries || "None"} block />
                <Info label="Member since" value={formatDate(member.created_at)} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Plan */}
        <TabsContent value="plan">
          {plan ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge>{GOAL_LABELS[plan.goal]}</Badge>
                <span className="text-sm text-muted-foreground">{plan.trainingDays} days / week · {plan.title}</span>
              </div>
              <WorkoutPlanView plan={plan} readOnly />
            </div>
          ) : (
            <EmptyState
              icon={Dumbbell}
              title="No active plan"
              description="Edit the member and enable plan generation to assign one."
              action={
                <Button asChild>
                  <Link href={ROUTES.owner.editMember(id)}>Edit member</Link>
                </Button>
              }
            />
          )}
        </TabsContent>

        {/* Progress */}
        <TabsContent value="progress">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weight</CardTitle>
              </CardHeader>
              <CardContent>
                <WeightChart data={progress} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Body measurements</CardTitle>
              </CardHeader>
              <CardContent>
                <MeasurementChart data={progress} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Info({ label, value, block }: { label: string; value: React.ReactNode; block?: boolean }) {
  return (
    <div className={block ? "col-span-2" : ""}>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
