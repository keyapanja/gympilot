import Link from "next/link";
import { Activity, UserPlus, Users, UserCheck } from "lucide-react";
import { requireOwnerWithGym } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOwnerDashboard } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { MemberLimitMeter } from "@/components/dashboard/member-limit-meter";
import { MemberStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GOAL_LABELS, ROUTES } from "@/lib/constants";
import { formatDate, relativeTime } from "@/lib/utils/format";
import type { FitnessGoal } from "@/types/db.types";

export default async function OwnerDashboardPage() {
  const session = await requireOwnerWithGym();
  const supabase = await createClient();
  const data = await getOwnerDashboard(supabase, session.gymId);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your gym at a glance"
        action={
          <Button asChild>
            <Link href={ROUTES.owner.newMember}>
              <UserPlus className="h-4 w-4" /> Add member
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total members" value={data.totalMembers} icon={Users} />
        <StatCard label="Active members" value={data.activeMembers} icon={UserCheck} />
        <StatCard label="Pending invites" value={data.invitedMembers} icon={UserPlus} />
        <StatCard label="New (30 days)" value={data.recentSignups} icon={Activity} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <MemberLimitMeter used={data.totalMembers} limit={data.memberLimit} unlimited={data.unlimited} />
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent members</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={ROUTES.owner.members}>View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentMembers.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Users}
                  title="No members yet"
                  description="Add your first member to assign a workout plan."
                  action={
                    <Button asChild>
                      <Link href={ROUTES.owner.newMember}>Add member</Link>
                    </Button>
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Goal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentMembers.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Link href={ROUTES.owner.member(m.id)} className="font-medium hover:underline">
                          {m.full_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{m.email}</p>
                      </TableCell>
                      <TableCell>{m.goal ? GOAL_LABELS[m.goal as FitnessGoal] : "—"}</TableCell>
                      <TableCell>
                        <MemberStatusBadge status={m.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(m.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No progress updates yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="font-medium">{a.name}</span>{" "}
                    {a.weight != null ? `logged weight ${a.weight} kg` : "logged progress"}
                  </span>
                  <span className="text-muted-foreground">{relativeTime(a.when)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
