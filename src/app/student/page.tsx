import { LayoutDashboard, Sparkles, MessageSquare, FileText, Plane } from "lucide-react";
import { requireUser } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell, StatCard, type NavItem } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const nav: NavItem[] = [
  { href: "/student", label: "Overview", icon: LayoutDashboard },
  { href: "/student", label: "AI Matches", icon: Sparkles },
  { href: "/student", label: "AI Counselor", icon: MessageSquare },
  { href: "/student", label: "Applications", icon: FileText },
  { href: "/student", label: "Travel & Visa", icon: Plane },
];

export default async function StudentDashboard() {
  const user = await requireUser();
  const profile = await db.studentProfile.findUnique({
    where: { userId: user.id },
    include: { _count: { select: { matches: true, applications: true, documents: true } } },
  });

  return (
    <DashboardShell user={user} nav={nav}>
      <h1 className="text-xl font-semibold">Your journey</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Phase 1 — AI discovery. When you’re ready, hand off to a human counselor for Phase 2 execution.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="AI matches" value={profile?._count.matches ?? 0} hint="Best-fit programs" />
        <StatCard label="Applications" value={profile?._count.applications ?? 0} hint="Shortlisted → enrolled" />
        <StatCard label="Documents" value={profile?._count.documents ?? 0} hint="In your vault" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Complete your profile</CardTitle>
            <CardDescription>
              Academics, test scores, budget, and goals power the AI matching engine (Epic 2 & 3).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled variant="outline">Profile wizard — coming in Epic 2</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Talk to a human counselor</CardTitle>
            <CardDescription>
              Ready for applications, documents, visa, and travel? Hand off to our team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled>Request counselor — coming in Epic 4</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
