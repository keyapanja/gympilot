import Link from "next/link";
import { ArrowRight, BarChart3, Dumbbell, Mail, MessageSquare, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { PricingTable } from "@/components/marketing/pricing-table";
import { ContactForm } from "@/components/marketing/contact-form";
import { ROUTES } from "@/lib/constants";

const HOW_IT_WORKS = [
  { step: "1", title: "Create your workspace", body: "Register as a gym owner and your private workspace is ready instantly." },
  { step: "2", title: "Add members", body: "Capture each member's goal, experience, and body stats in one form." },
  { step: "3", title: "Auto-assign plans", body: "The rule-based engine matches a structured workout plan to each member." },
  { step: "4", title: "Track progress", body: "Members log weight and measurements; everyone sees the trend." },
];

const FAQ = [
  {
    q: "What happens when I hit my member limit?",
    a: "Member creation is blocked automatically once you reach your plan's limit. Upgrade any time to add more.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes — plans can be upgraded or downgraded. Your member limit updates immediately to match the new tier.",
  },
  {
    q: "Do members pay anything?",
    a: "No. Members access their plans and progress for free; gym owners hold the subscription.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <Badge variant="secondary" className="gap-1">
              <Dumbbell className="h-3.5 w-3.5" /> Digital coaching for gyms
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Personalized workout guidance for <span className="text-primary">every gym member</span>.
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              GymPilot helps gym owners create a workspace, add members, assign structured workout plans, and track
              progress — without a personal trainer for every member.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href={ROUTES.register}>
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/#pricing">See pricing</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 pt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Member management</span>
              <span className="flex items-center gap-2"><Dumbbell className="h-4 w-4 text-primary" /> Auto workout plans</span>
              <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Progress tracking</span>
            </div>
          </div>

          {/* Hero mock card */}
          <div className="relative">
            <div className="rounded-3xl border bg-card p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-semibold">This week&apos;s plan</p>
                <Badge>Fat Loss</Badge>
              </div>
              <div className="space-y-3">
                {[
                  { d: "Day 1 — Upper Body", e: "4 exercises" },
                  { d: "Day 2 — Rest", e: "Recovery" },
                  { d: "Day 3 — Lower Body", e: "5 exercises" },
                ].map((row) => (
                  <div key={row.d} className="flex items-center justify-between rounded-xl border bg-background p-4">
                    <span className="text-sm font-medium">{row.d}</span>
                    <span className="text-xs text-muted-foreground">{row.e}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-primary/5 p-4">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Workout completion</span>
                  <span className="font-medium">8/12</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full w-2/3 bg-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-16 lg:py-24">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Everything your gym needs to coach at scale</h2>
          <p className="mt-3 text-muted-foreground">
            Engagement, retention, and an additional revenue stream — built into one platform.
          </p>
        </div>
        <FeatureGrid />

        {/* How it works */}
        <div className="mt-20">
          <h3 className="mb-8 text-center text-2xl font-bold">How it works</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((f) => (
              <Card key={f.step}>
                <CardContent className="space-y-2 p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                    {f.step}
                  </span>
                  <h4 className="font-semibold">{f.title}</h4>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-muted/30 py-16 lg:py-24">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Simple pricing that scales with your gym</h2>
            <p className="mt-3 text-muted-foreground">Start on Starter, upgrade as your member base grows.</p>
          </div>
          <PricingTable />

          {/* FAQ */}
          <div className="mx-auto mt-16 max-w-3xl">
            <h3 className="mb-6 text-center text-2xl font-bold">Frequently asked questions</h3>
            <div className="space-y-4">
              {FAQ.map((item) => (
                <Card key={item.q}>
                  <CardContent className="space-y-1.5 p-6">
                    <h4 className="font-semibold">{item.q}</h4>
                    <p className="text-sm text-muted-foreground">{item.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="container py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Talk to our team</h2>
            <p className="text-muted-foreground">
              Questions about plans, onboarding, or enterprise limits? Send us a message and we&apos;ll get back to you.
            </p>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Mail className="h-4 w-4" />
                </span>
                hello@gympilot.app
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Phone className="h-4 w-4" />
                </span>
                +1 (555) 010-2030
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MessageSquare className="h-4 w-4" />
                </span>
                Typical response within 1 business day
              </li>
            </ul>
          </div>
          <ContactForm />
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-16">
        <div className="rounded-3xl bg-primary px-8 py-12 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to give every member a plan?</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/90">
            Create your gym workspace in minutes and add your first members today.
          </p>
          <Button size="lg" variant="secondary" className="mt-6" asChild>
            <Link href={ROUTES.register}>Get started free</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
