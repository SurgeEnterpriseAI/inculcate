import Link from "next/link";
import { requireUser } from "@/server/guards";
import { db } from "@/lib/db";
import { profileCompleteness } from "@/lib/validation/profile";
import { DashboardShell, StatCard } from "@/components/dashboard/shell";
import { studentNav } from "@/components/dashboard/navs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function StudentDashboard() {
  const user = await requireUser();
  const profile = await db.studentProfile.findUnique({
    where: { userId: user.id },
    include: { _count: { select: { matches: true, applications: true, documents: true } } },
  });

  const completeness = profileCompleteness(
    profile
      ? {
          highestQualification: profile.highestQualification,
          gpa: profile.gpa,
          percentage: profile.percentage,
          targetDegreeLevel: profile.targetDegreeLevel,
          preferredCountries: profile.preferredCountries,
          preferredSubjects: profile.preferredSubjects,
          budgetMaxUsd: profile.budgetMaxUsd,
          careerGoals: profile.careerGoals,
          testScores: profile.testScores as Record<string, number> | null,
        }
      : null,
  );

  return (
    <DashboardShell user={user} nav={studentNav}>
      <h1 className="text-xl font-semibold">Your journey</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Phase 1 — AI discovery. When you’re ready, hand off to a human counselor for Phase 2 execution.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        <StatCard label="Profile complete" value={`${completeness}%`} hint="Powers matching" />
        <StatCard label="AI matches" value={profile?._count.matches ?? 0} hint="Best-fit programs" />
        <StatCard label="Applications" value={profile?._count.applications ?? 0} hint="Shortlisted → enrolled" />
        <StatCard label="Documents" value={profile?._count.documents ?? 0} hint="In your vault" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{completeness === 100 ? "Profile complete" : "Complete your profile"}</CardTitle>
            <CardDescription>
              Academics, test scores, budget, and goals power the AI matching engine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/student/profile">
              <Button>{completeness > 0 ? "Edit profile" : "Start profile wizard"}</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Find programs</CardTitle>
            <CardDescription>Browse universities and programs across 193 countries with filters.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/search">
              <Button variant="outline">Search the catalog</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
