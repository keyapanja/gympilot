import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listGyms } from "@/lib/services/admin";
import { PageHeader } from "@/components/shared/page-header";
import { SubscriptionStatusBadge } from "@/components/shared/status-badge";
import { SubscriptionEditor } from "@/components/admin/subscription-editor";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata = { title: "Subscriptions" };

export default async function AdminSubscriptionsPage() {
  await requireRole("super_admin");
  const supabase = await createClient();
  const gyms = await listGyms(supabase);

  return (
    <>
      <PageHeader title="Subscriptions" description="Manage plans and billing status for every gym" />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gym</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {gyms.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{g.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    {g.membersUsed}
                    {g.memberLimit >= 0 ? ` / ${g.memberLimit}` : " (unlimited)"}
                  </TableCell>
                  <TableCell>
                    <SubscriptionStatusBadge status={g.status} />
                  </TableCell>
                  <TableCell>
                    <SubscriptionEditor
                      gymId={g.id}
                      gymName={g.name}
                      currentPlan={g.planKey}
                      currentStatus={g.status}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
