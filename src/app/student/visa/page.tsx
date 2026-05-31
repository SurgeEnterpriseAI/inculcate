import { requireUser } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";
import { studentNav } from "@/components/dashboard/navs";
import { Card, CardContent } from "@/components/ui/card";
import { VisaManager, type VisaApp } from "@/components/student/visa-manager";

interface ChecklistItem { item: string; required: boolean; done: boolean }

export default async function VisaPage() {
  const user = await requireUser();
  const profile = await db.studentProfile.findUnique({
    where: { userId: user.id },
    include: {
      applications: {
        orderBy: { createdAt: "desc" },
        include: { program: { include: { university: true } }, visaCase: true },
      },
    },
  });

  if (!profile) {
    return (
      <DashboardShell user={user} nav={studentNav}>
        <Card><CardContent className="py-8 text-center text-sm text-[var(--muted)]">Create your profile first.</CardContent></Card>
      </DashboardShell>
    );
  }

  const apps: VisaApp[] = profile.applications.map((a) => ({
    applicationId: a.id,
    programName: a.program.name,
    university: a.program.university.name,
    country: a.program.university.country,
    visaCase: a.visaCase
      ? { id: a.visaCase.id, status: a.visaCase.status, checklist: (a.visaCase.checklist as unknown as ChecklistItem[]) ?? [] }
      : null,
  }));

  return (
    <DashboardShell user={user} nav={studentNav}>
      <h1 className="text-xl font-semibold">Visa preparation</h1>
      <p className="mb-5 mt-1 text-sm text-[var(--muted)]">
        Country-specific document checklists and status tracking, managed with your counselor.
      </p>
      <VisaManager apps={apps} />
    </DashboardShell>
  );
}
