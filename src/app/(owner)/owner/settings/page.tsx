import { PageHeader } from "@/components/shared/page-header";
import { GymSettingsForm } from "@/components/settings/gym-settings-form";
import { SubscriptionStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadSettings } from "@/app/(owner)/actions";
import { formatPrice } from "@/lib/utils/format";

export default async function SettingsPage() {
  const { gym, subscription } = await loadSettings();

  const plan = subscription
    ? (Array.isArray(subscription.plans) ? subscription.plans[0] : subscription.plans)
    : null;

  return (
    <>
      <PageHeader title="Settings" description="Manage your gym workspace and subscription" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GymSettingsForm
            initial={{
              name: gym.name,
              contactEmail: gym.contact_email,
              contactPhone: gym.contact_phone ?? "",
              logoUrl: gym.logo_url ?? "",
            }}
          />
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plan</span>
              <Badge variant="secondary">{(plan as { name?: string })?.name ?? "—"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <SubscriptionStatusBadge status={subscription?.status ?? "trialing"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Member limit</span>
              <span className="font-medium">
                {subscription && subscription.member_limit < 0 ? "Unlimited" : subscription?.member_limit ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-medium">
                {plan ? formatPrice((plan as { price_cents?: number }).price_cents ?? 0) : "—"}
                <span className="text-muted-foreground">/mo</span>
              </span>
            </div>
            <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              Need a different limit? Contact us to change your plan. Billing integration arrives in a later phase.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
