import { requireUser } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";
import { studentNav } from "@/components/dashboard/navs";
import { ProfileWizard, type WizardInitial } from "@/components/student/profile-wizard";

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await db.studentProfile.findUnique({ where: { userId: user.id } });

  const initial: WizardInitial = {
    highestQualification: profile?.highestQualification,
    gpa: profile?.gpa,
    percentage: profile?.percentage,
    backlogs: profile?.backlogs,
    testScores: (profile?.testScores as Record<string, number> | null) ?? null,
    targetDegreeLevel: profile?.targetDegreeLevel ?? null,
    preferredCountries: profile?.preferredCountries ?? [],
    preferredSubjects: profile?.preferredSubjects ?? [],
    budgetMinUsd: profile?.budgetMinUsd,
    budgetMaxUsd: profile?.budgetMaxUsd,
    intakePreference: profile?.intakePreference,
    workExperienceYears: profile?.workExperienceYears,
    languages: profile?.languages ?? [],
    careerGoals: profile?.careerGoals,
  };

  return (
    <DashboardShell user={user} nav={studentNav}>
      <h1 className="text-xl font-semibold">My profile</h1>
      <p className="mb-5 mt-1 text-sm text-[var(--muted)]">
        This information is private and used to find your best-fit programs.
      </p>
      <div className="max-w-2xl">
        <ProfileWizard initial={initial} />
      </div>
    </DashboardShell>
  );
}
