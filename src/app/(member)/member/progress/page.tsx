import { TrendingDown, TrendingUp } from "lucide-react";
import { requireMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listProgress, progressSummary } from "@/lib/services/progress";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressForm } from "@/components/progress/progress-form";
import { ProgressHistory } from "@/components/progress/progress-history";
import { WeightChart, MeasurementChart } from "@/components/charts/progress-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addProgressAction } from "@/app/(member)/actions";

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  const session = await requireMember();
  const supabase = await createClient();
  const [entries, summary] = await Promise.all([
    listProgress(supabase, session.memberId),
    progressSummary(supabase, session.memberId),
  ]);

  const down = summary.change != null && summary.change < 0;

  return (
    <>
      <PageHeader title="Progress" description="Track your weight and measurements" action={<ProgressForm action={addProgressAction} />} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-sm text-muted-foreground">Latest weight</p>
            <p className="text-2xl font-bold">{summary.latest != null ? `${summary.latest} kg` : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-sm text-muted-foreground">Change since start</p>
            <p className="flex items-center gap-1.5 text-2xl font-bold">
              {summary.change != null ? (
                <>
                  {down ? <TrendingDown className="h-5 w-5 text-emerald-600" /> : <TrendingUp className="h-5 w-5 text-amber-600" />}
                  {summary.change > 0 ? "+" : ""}
                  {summary.change} kg
                </>
              ) : (
                "—"
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-sm text-muted-foreground">Entries logged</p>
            <p className="text-2xl font-bold">{summary.points}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightChart data={entries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Body measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <MeasurementChart data={entries} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No entries yet. Log your first one above.</p>
          ) : (
            <ProgressHistory entries={entries} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
