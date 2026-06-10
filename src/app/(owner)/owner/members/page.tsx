import Link from "next/link";
import { Suspense } from "react";
import { UserPlus, Users } from "lucide-react";
import { requireOwnerWithGym } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listMembers } from "@/lib/services/members";
import { getOwnerDashboard } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { MemberSearch } from "@/components/members/member-search";
import { MemberRowActions } from "@/components/members/member-row-actions";
import { MemberStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GOAL_LABELS, ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/utils/format";
import { removeMemberAction, resendInviteAction } from "@/app/(owner)/actions";
import type { FitnessGoal } from "@/types/db.types";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requireOwnerWithGym();
  const supabase = await createClient();
  const { q, status } = await searchParams;

  const [members, dash] = await Promise.all([
    listMembers(supabase, session.gymId, { q, status }),
    getOwnerDashboard(supabase, session.gymId),
  ]);

  const limitLabel = dash.unlimited ? `${dash.totalMembers} members` : `${dash.totalMembers}/${dash.memberLimit}`;

  return (
    <>
      <PageHeader
        title="Members"
        description={`${limitLabel} • manage your roster`}
        action={
          <Button asChild>
            <Link href={ROUTES.owner.newMember}>
              <UserPlus className="h-4 w-4" /> Add member
            </Link>
          </Button>
        }
      />

      <Suspense>
        <MemberSearch />
      </Suspense>

      <Card>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title={q || status ? "No members match your filters" : "No members yet"}
                description={q || status ? "Try clearing your search or filter." : "Add your first member to get started."}
                action={
                  !q && !status ? (
                    <Button asChild>
                      <Link href={ROUTES.owner.newMember}>Add member</Link>
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Goal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Added</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link href={ROUTES.owner.member(m.id)} className="font-medium hover:underline">
                        {m.full_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {m.goal ? GOAL_LABELS[m.goal as FitnessGoal] : "—"}
                    </TableCell>
                    <TableCell>
                      <MemberStatusBadge status={m.status} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {formatDate(m.created_at)}
                    </TableCell>
                    <TableCell>
                      <MemberRowActions
                        memberId={m.id}
                        removeAction={removeMemberAction}
                        resendAction={resendInviteAction}
                      />
                    </TableCell>
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
