import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listGyms } from "@/lib/services/admin";
import { PageHeader } from "@/components/shared/page-header";
import { SubscriptionStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Gyms" };

export default async function AdminGymsPage() {
  await requireRole("super_admin");
  const supabase = await createClient();
  const gyms = await listGyms(supabase);

  return (
    <>
      <PageHeader title="Gyms" description={`${gyms.length} gyms on the platform`} />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gym</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gyms.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{g.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{g.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    {g.membersUsed}
                    {g.memberLimit >= 0 ? ` / ${g.memberLimit}` : ""}
                  </TableCell>
                  <TableCell>
                    <SubscriptionStatusBadge status={g.status} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(g.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
