import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { db } from "@/lib/db";
import { hasAtLeast } from "@/lib/rbac";
import { DashboardShell } from "@/components/dashboard/shell";
import { counselorNav } from "@/components/dashboard/navs";
import { LeadPipeline, type LeadView } from "@/components/crm/lead-pipeline";

export default async function LeadsPage() {
  const user = await requireRole(Role.COUNSELOR);

  const [leads, counselors] = await Promise.all([
    db.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { studentProfile: { include: { user: { select: { name: true, email: true } } } } },
    }),
    db.user.findMany({ where: { role: "COUNSELOR" }, select: { id: true, name: true } }),
  ]);

  const counselorName = new Map(counselors.map((c) => [c.id, c.name ?? "Counselor"]));
  const view: LeadView[] = leads.map((l) => ({
    id: l.id,
    student: l.studentProfile?.user?.name ?? l.studentProfile?.user?.email ?? "Unknown",
    source: l.source,
    status: l.status,
    assignedToName: l.assignedTo ? counselorName.get(l.assignedTo) ?? "Assigned" : null,
    notes: l.notes,
  }));

  return (
    <DashboardShell user={user} nav={counselorNav}>
      <h1 className="text-xl font-semibold">Lead pipeline</h1>
      <p className="mb-5 mt-1 text-sm text-[var(--muted)]">
        Track and progress leads from first contact to conversion. Taking a lead assigns the student to you.
      </p>
      <LeadPipeline leads={view} isAdmin={hasAtLeast(user.role, "OPS_ADMIN")} />
    </DashboardShell>
  );
}
