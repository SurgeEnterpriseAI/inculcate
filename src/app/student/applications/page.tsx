import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { requireUser } from "@/server/guards";
import { db } from "@/lib/db";
import { STATUS_CLASS, STATUS_LABEL } from "@/lib/application-status";
import { DashboardShell } from "@/components/dashboard/shell";
import { studentNav } from "@/components/dashboard/navs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { StatusControl } from "@/components/applications/status-control";

function daysLeft(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export default async function StudentApplicationsPage() {
  const user = await requireUser();
  const profile = await db.studentProfile.findUnique({
    where: { userId: user.id },
    include: { applications: { orderBy: { createdAt: "desc" }, include: { program: { include: { university: true } } } } },
  });

  const apps = profile?.applications ?? [];
  const deadlines = apps
    .filter((a) => a.program.applicationDeadline)
    .map((a) => ({ name: a.program.name, uni: a.program.university.name, date: a.program.applicationDeadline! }))
    .sort((x, y) => x.date.getTime() - y.date.getTime());

  return (
    <DashboardShell user={user} nav={studentNav}>
      <h1 className="text-xl font-semibold">My applications</h1>
      <p className="mb-5 mt-1 text-sm text-[var(--muted)]">
        Track each application through its stages. Shortlist programs from AI Matches to add them here.
      </p>

      {apps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-[var(--muted)]">No applications yet.</p>
            <Link href="/student/matches"><Button>Go to AI Matches</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Table>
            <THead><TR><TH>Program</TH><TH>University</TH><TH>Status</TH><TH>Manage</TH></TR></THead>
            <tbody>
              {apps.map((a) => (
                <TR key={a.id}>
                  <TD className="font-medium">{a.program.name}</TD>
                  <TD>{a.program.university.name} · {a.program.university.country}</TD>
                  <TD><Badge className={STATUS_CLASS[a.status]}>{STATUS_LABEL[a.status]}</Badge></TD>
                  <TD><StatusControl id={a.id} status={a.status} role={user.role} isOwner /></TD>
                </TR>
              ))}
            </tbody>
          </Table>

          <Card className="mt-6">
            <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-4 w-4" /> Deadlines</CardTitle></CardHeader>
            <CardContent>
              {deadlines.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No application deadlines recorded for your programs yet.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {deadlines.map((d, i) => {
                    const left = daysLeft(d.date);
                    return (
                      <li key={i} className="flex items-center justify-between">
                        <span>{d.name} — {d.uni}</span>
                        <span className={left < 30 ? "font-medium text-red-600" : "text-[var(--muted)]"}>
                          {d.date.toISOString().slice(0, 10)} ({left > 0 ? `${left} days left` : "passed"})
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </DashboardShell>
  );
}
