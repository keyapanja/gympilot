import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { memberGrowth, listSubscriptions } from "@/lib/services/admin";
import { getPlatformDashboard } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleBarChart } from "@/components/charts/bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  await requireRole("super_admin");
  const supabase = await createClient();
  const [stats, growth, subs] = await Promise.all([
    getPlatformDashboard(supabase),
    memberGrowth(supabase),
    listSubscriptions(supabase),
  ]);

  const growthData = growth.map((g) => ({ label: g.month.slice(5), value: g.count }));

  // Plan distribution
  const planCounts = subs.reduce<Record<string, number>>((acc, s) => {
    acc[s.plan] = (acc[s.plan] ?? 0) + 1;
    return acc;
  }, {});
  const planData = Object.entries(planCounts).map(([label, value]) => ({ label, value }));

  return (
    <>
      <PageHeader title="Analytics" description="Growth and plan distribution across the platform" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Active subscriptions" value={stats.activeSubscriptions} />
        <Stat label="Trialing" value={stats.trialingSubscriptions} />
        <Stat label="Total members" value={stats.totalMembers} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New members per month</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={growthData} valueName="New members" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscriptions by plan</CardTitle>
          </CardHeader>
          <CardContent>
            {planData.length ? (
              <SimpleBarChart data={planData} valueName="Gyms" />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">No subscriptions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
