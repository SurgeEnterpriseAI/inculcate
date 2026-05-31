import Link from "next/link";
import { requireUser } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";
import { studentNav } from "@/components/dashboard/navs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchesClient, type MatchView } from "@/components/student/matches-client";

export default async function MatchesPage() {
  const user = await requireUser();
  const profile = await db.studentProfile.findUnique({
    where: { userId: user.id },
    include: {
      matches: {
        orderBy: { fitScore: "desc" },
        include: { program: { include: { university: true } } },
      },
      applications: { select: { programId: true } },
    },
  });

  if (!profile) {
    return (
      <DashboardShell user={user} nav={studentNav}>
        <Card><CardContent className="py-8 text-center text-sm text-[var(--muted)]">Create your profile first to get AI matches.</CardContent></Card>
      </DashboardShell>
    );
  }

  const hasProfileSignal =
    profile.preferredSubjects.length > 0 || !!profile.targetDegreeLevel || !!profile.careerGoals;

  const matches: MatchView[] = profile.matches.map((m) => ({
    programId: m.programId,
    fitScore: m.fitScore,
    admissionProbability: m.admissionProbability,
    riskLevel: m.riskLevel,
    riskFlags: m.riskFlags,
    aiRationale: m.aiRationale,
    program: {
      name: m.program.name,
      degreeLevel: m.program.degreeLevel,
      specialization: m.program.specialization,
      tuitionFeeUsd: m.program.tuitionFeeUsd,
      durationMonths: m.program.durationMonths,
      university: { name: m.program.university.name, country: m.program.university.country, worldRanking: m.program.university.worldRanking },
    },
  }));
  const shortlistedIds = profile.applications.map((a) => a.programId);

  return (
    <DashboardShell user={user} nav={studentNav}>
      <h1 className="text-xl font-semibold">AI Matches</h1>
      <p className="mb-1 mt-1 text-sm text-[var(--muted)]">
        Best-fit programs scored on subject fit, location, budget, and your academics — with an admission-probability and risk read.
      </p>
      <p className="mb-5 text-xs text-[var(--muted)]">
        AI suggestions are decision support, not admission guarantees, and are meant to be reviewed with a counselor.
      </p>

      {!hasProfileSignal ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-[var(--muted)]">Add your preferred subjects, target degree, or career goals so we can match you.</p>
            <Link href="/student/profile"><Button>Complete your profile</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <MatchesClient matches={matches} shortlistedIds={shortlistedIds} />
      )}
    </DashboardShell>
  );
}
