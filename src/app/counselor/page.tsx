import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell, StatCard } from "@/components/dashboard/shell";
import { counselorNav } from "@/components/dashboard/navs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

export default async function CounselorDashboard() {
  const user = await requireRole(Role.COUNSELOR);

  const [assignments, openTasks, newLeads, recentLeads, unread] = await Promise.all([
    db.counselorAssignment.count({ where: { counselorId: user.id, active: true } }),
    db.task.count({ where: { assigneeId: user.id, status: { in: ["TODO", "IN_PROGRESS"] } } }),
    db.lead.count({ where: { status: "NEW" } }),
    db.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { studentProfile: { include: { user: { select: { name: true, email: true } } } } },
    }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return (
    <DashboardShell user={user} nav={counselorNav}>
      <h1 className="text-xl font-semibold">Counselor workspace</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Phase 2 — human execution. Manage assigned students, tasks, and incoming leads.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-4">
        <StatCard label="Assigned students" value={assignments} hint="Active assignments" />
        <StatCard label="Open tasks" value={openTasks} hint="To-do & in-progress" />
        <StatCard label="New leads" value={newLeads} hint="Awaiting pickup" />
        <StatCard label="Notifications" value={unread} hint="Unread" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent leads</CardTitle>
          <CardDescription>Handoffs from the AI counselor and other sources. Full CRM lands in Epic 7.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLeads.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No leads yet. Student handoffs from the AI counselor will appear here.</p>
          ) : (
            <Table>
              <THead><TR><TH>Student</TH><TH>Source</TH><TH>Status</TH><TH>Notes</TH></TR></THead>
              <tbody>
                {recentLeads.map((l) => (
                  <TR key={l.id}>
                    <TD className="font-medium">{l.studentProfile?.user?.name ?? l.studentProfile?.user?.email ?? "—"}</TD>
                    <TD>{l.source}</TD>
                    <TD><Badge>{l.status}</Badge></TD>
                    <TD className="max-w-xs truncate text-[var(--muted)]">{l.notes ?? ""}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
