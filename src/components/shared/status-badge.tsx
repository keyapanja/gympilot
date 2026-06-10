import { Badge } from "@/components/ui/badge";

const MEMBER_TONE: Record<string, "success" | "warning" | "muted"> = {
  active: "success",
  invited: "warning",
  inactive: "muted",
};

const SUB_TONE: Record<string, "success" | "warning" | "danger" | "muted"> = {
  active: "success",
  trialing: "warning",
  past_due: "danger",
  canceled: "muted",
};

export function MemberStatusBadge({ status }: { status: string }) {
  return <Badge variant={MEMBER_TONE[status] ?? "muted"} className="capitalize">{status}</Badge>;
}

export function SubscriptionStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={SUB_TONE[status] ?? "muted"} className="capitalize">
      {status.replace("_", " ")}
    </Badge>
  );
}
