import { LayoutDashboard, Users, ListChecks, Inbox } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell, StatCard, type NavItem } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const nav: NavItem[] = [
  { href: "/counselor", label: "Overview", icon: LayoutDashboard },
  { href: "/counselor", label: "My Students", icon: Users },
  { href: "/counselor", label: "Task Queue", icon: ListChecks },
  { href: "/counselor", label: "Leads", icon: Inbox },
];

export default async function CounselorDashboard() {
  const user = await requireRole(Role.COUNSELOR);

  const [assignments, openTasks, newLeads] = await Promise.all([
    db.counselorAssignment.count({ where: { counselorId: user.id, active: true } }),
    db.task.count({ where: { assigneeId: user.id, status: { in: ["TODO", "IN_PROGRESS"] } } }),
    db.lead.count({ where: { status: "NEW" } }),
  ]);

  return (
    <DashboardShell user={user} nav={nav}>
      <h1 className="text-xl font-semibold">Counselor workspace</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Phase 2 — human execution. Manage assigned students, tasks, and incoming leads.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Assigned students" value={assignments} hint="Active assignments" />
        <StatCard label="Open tasks" value={openTasks} hint="To-do & in-progress" />
        <StatCard label="New leads" value={newLeads} hint="Awaiting pickup" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Lead pipeline & task queue</CardTitle>
          <CardDescription>
            Full CRM, application state machine, and notifications land in Epics 5 & 7.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted)]">
            You currently have {assignments} assigned student(s). Use this space to action handoffs from the AI counselor.
          </p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
