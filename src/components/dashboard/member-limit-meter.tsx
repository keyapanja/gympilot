import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";

export function MemberLimitMeter({
  used,
  limit,
  unlimited,
}: {
  used: number;
  limit: number;
  unlimited: boolean;
}) {
  const pct = unlimited || limit <= 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const near = pct >= 80 && !unlimited;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Member limit usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold">
            {used}
            <span className="text-base font-normal text-muted-foreground">
              {unlimited ? " members" : ` / ${limit}`}
            </span>
          </span>
          {!unlimited && (
            <span className={cn("text-sm font-medium", near ? "text-amber-600" : "text-muted-foreground")}>{pct}%</span>
          )}
        </div>
        {!unlimited && <Progress value={pct} className={cn(near && "[&>div]:bg-amber-500")} />}
        {near && <p className="text-xs text-amber-600">You&apos;re close to your plan limit. Consider upgrading.</p>}
        {unlimited && <p className="text-xs text-muted-foreground">Unlimited members on your plan.</p>}
      </CardContent>
    </Card>
  );
}
