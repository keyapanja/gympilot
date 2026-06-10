import { Building2, CreditCard, TrendingUp, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPlatformDashboard } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { SubscriptionStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";

export default async function AdminDashboardPage() {
  await requireRole("super_admin");
  const supabase = await createClient();
  const data = await getPlatformDashboard(supabase);

  return (
    <>
      <PageHeader title="Platform overview" description="Activity across all gyms on GymPilot" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total gyms" value={data.totalGyms} icon={Building2} />
        <StatCard label="Total members" value={data.totalMembers} icon={Users} />
        <StatCard label="Active subscriptions" value={data.activeSubscriptions} icon={CreditCard} />
        <StatCard label="New members (30d)" value={data.newMembers30d} icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent gyms</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentGyms.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No gyms yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gym</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentGyms.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>{g.plan}</TableCell>
                    <TableCell>
                      <SubscriptionStatusBadge status={g.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(g.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
