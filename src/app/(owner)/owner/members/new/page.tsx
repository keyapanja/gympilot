import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireOwnerWithGym } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOwnerDashboard } from "@/lib/services/dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { MemberForm } from "@/components/members/member-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createMemberAction } from "@/app/(owner)/actions";
import { ROUTES } from "@/lib/constants";

export default async function NewMemberPage() {
  const session = await requireOwnerWithGym();
  const supabase = await createClient();
  const dash = await getOwnerDashboard(supabase, session.gymId);

  const atLimit = !dash.unlimited && dash.memberLimit > 0 && dash.totalMembers >= dash.memberLimit;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={ROUTES.owner.members} aria-label="Back to members">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader title="Add member" description="Create a profile and assign an initial workout plan" />
      </div>

      {atLimit ? (
        <Card>
          <CardContent className="space-y-3 p-8 text-center">
            <h2 className="text-lg font-semibold">You&apos;ve reached your plan&apos;s member limit</h2>
            <p className="text-sm text-muted-foreground">
              Your current plan allows {dash.memberLimit} members. Upgrade to add more.
            </p>
            <Button asChild>
              <Link href={ROUTES.owner.settings}>View subscription</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <MemberForm action={createMemberAction} mode="create" submitLabel="Add member & send invite" />
      )}
    </>
  );
}
