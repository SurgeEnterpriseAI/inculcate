import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { db } from "@/lib/db";
import { STATUS_CLASS, STATUS_LABEL } from "@/lib/application-status";
import { DashboardShell } from "@/components/dashboard/shell";
import { counselorNav } from "@/components/dashboard/navs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { StatusControl } from "@/components/applications/status-control";

export default async function CounselorApplicationsPage() {
  const user = await requireRole(Role.COUNSELOR);
  const apps = await db.application.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      program: { include: { university: true } },
      studentProfile: { include: { user: { select: { name: true, email: true } } } },
    },
  });

  return (
    <DashboardShell user={user} nav={counselorNav}>
      <h1 className="text-xl font-semibold">Applications</h1>
      <p className="mb-5 mt-1 text-sm text-[var(--muted)]">
        Drive each application through Phase-2 execution. {apps.length} application{apps.length === 1 ? "" : "s"} in the pipeline.
      </p>

      {apps.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-[var(--muted)]">No applications yet. Students shortlist programs from AI Matches.</CardContent></Card>
      ) : (
        <Table>
          <THead><TR><TH>Student</TH><TH>Program</TH><TH>Status</TH><TH>Advance</TH></TR></THead>
          <tbody>
            {apps.map((a) => (
              <TR key={a.id}>
                <TD className="font-medium">{a.studentProfile.user?.name ?? a.studentProfile.user?.email ?? "—"}</TD>
                <TD>{a.program.name}<div className="text-xs text-[var(--muted)]">{a.program.university.name} · {a.program.university.country}</div></TD>
                <TD><Badge className={STATUS_CLASS[a.status]}>{STATUS_LABEL[a.status]}</Badge></TD>
                <TD><StatusControl id={a.id} status={a.status} role={user.role} isOwner={false} /></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </DashboardShell>
  );
}
