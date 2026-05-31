import { requireUser } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";
import { studentNav } from "@/components/dashboard/navs";
import { Card, CardContent } from "@/components/ui/card";
import { WritingAssistant } from "@/components/student/writing-assistant";

export default async function WritingPage() {
  const user = await requireUser();
  const profile = await db.studentProfile.findUnique({
    where: { userId: user.id },
    include: { applications: { include: { program: { include: { university: true } } } } },
  });

  if (!profile) {
    return (
      <DashboardShell user={user} nav={studentNav}>
        <Card><CardContent className="py-8 text-center text-sm text-[var(--muted)]">Create your profile first to use the writing assistant.</CardContent></Card>
      </DashboardShell>
    );
  }

  const programs = profile.applications.map((a) => ({ id: a.program.id, label: `${a.program.name} — ${a.program.university.name}` }));

  return (
    <DashboardShell user={user} nav={studentNav}>
      <h1 className="text-xl font-semibold">Writing assistant</h1>
      <p className="mb-5 mt-1 text-sm text-[var(--muted)]">
        Generate a profile-grounded SOP, LOR, or essay draft, refine it, and save it to your vault. Always personalize and review with your counselor.
      </p>
      <WritingAssistant programs={programs} />
    </DashboardShell>
  );
}
