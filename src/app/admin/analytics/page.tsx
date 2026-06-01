import { Role, ApplicationStatus } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell, StatCard } from "@/components/dashboard/shell";
import { adminNav } from "@/components/dashboard/navs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

export default async function AnalyticsPage() {
  const user = await requireRole(Role.OPS_ADMIN);

  const [profiles, profilesWithApps, leadsTotal, leadsConverted, appGroups, counselors, partners] = await Promise.all([
    db.studentProfile.count(),
    db.studentProfile.count({ where: { applications: { some: {} } } }),
    db.lead.count(),
    db.lead.count({ where: { status: "CONVERTED" } }),
    db.application.groupBy({ by: ["status"], _count: { _all: true } }),
    db.user.findMany({ where: { role: "COUNSELOR" }, select: { id: true, name: true, email: true } }),
    db.partnerUniversity.findMany({ include: { university: true } }),
  ]);

  const sc = (statuses: ApplicationStatus[]) =>
    appGroups.filter((g) => statuses.includes(g.status)).reduce((s, g) => s + g._count._all, 0);

  const applicationsTotal = appGroups.reduce((s, g) => s + g._count._all, 0);
  const submittedPlus = sc(["SUBMITTED", "OFFER", "ACCEPTED", "VISA", "ENROLLED"]);
  const offerPlus = sc(["OFFER", "ACCEPTED", "VISA", "ENROLLED"]);
  const acceptedPlus = sc(["ACCEPTED", "VISA", "ENROLLED"]);
  const visaPlus = sc(["VISA", "ENROLLED"]);
  const enrolled = sc(["ENROLLED"]);

  const funnel = [
    { label: "Profiles created", n: profiles },
    { label: "Started applications", n: profilesWithApps },
    { label: "Applications submitted", n: submittedPlus },
    { label: "Offers received", n: offerPlus },
    { label: "Offers accepted", n: acceptedPlus },
    { label: "Visa stage", n: visaPlus },
    { label: "Enrolled", n: enrolled },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.n));

  const perf = await Promise.all(
    counselors.map(async (c) => {
      const [assigned, tasksDone, leadsAssigned, conv] = await Promise.all([
        db.counselorAssignment.count({ where: { counselorId: c.id, active: true } }),
        db.task.count({ where: { assigneeId: c.id, status: "DONE" } }),
        db.lead.count({ where: { assignedTo: c.id } }),
        db.lead.count({ where: { assignedTo: c.id, status: "CONVERTED" } }),
      ]);
      return { name: c.name ?? c.email, assigned, tasksDone, leadsAssigned, conv };
    }),
  );

  const avgCommission =
    partners.filter((p) => p.commissionRate != null).reduce((s, p) => s + (p.commissionRate ?? 0), 0) /
    Math.max(1, partners.filter((p) => p.commissionRate != null).length);

  return (
    <DashboardShell user={user} nav={adminNav}>
      <h1 className="text-xl font-semibold">Analytics</h1>
      <p className="mb-5 mt-1 text-sm text-[var(--muted)]">Conversion funnel, counselor performance, and partner-university tracking.</p>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Student profiles" value={profiles} />
        <StatCard label="Applications" value={applicationsTotal} />
        <StatCard label="Leads" value={leadsTotal} hint={`${leadsConverted} converted`} />
        <StatCard label="Partner universities" value={partners.length} hint={partners.length ? `~${avgCommission.toFixed(1)}% avg commission` : undefined} />
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Conversion funnel</CardTitle><CardDescription>Profile → enrolled across the journey.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {funnel.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="w-44 shrink-0 text-sm text-[var(--muted)]">{f.label}</span>
              <div className="h-6 flex-1 rounded bg-slate-100">
                <div className="flex h-6 items-center rounded bg-[var(--brand)] px-2 text-xs font-medium text-white" style={{ width: `${Math.max(6, (f.n / funnelMax) * 100)}%` }}>{f.n}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle>Counselor performance</CardTitle></CardHeader>
        <CardContent>
          {perf.length === 0 ? <p className="text-sm text-[var(--muted)]">No counselors yet.</p> : (
            <Table>
              <THead><TR><TH>Counselor</TH><TH>Assigned students</TH><TH>Tasks done</TH><TH>Leads</TH><TH>Conversions</TH></TR></THead>
              <tbody>
                {perf.map((p) => (
                  <TR key={p.name}><TD className="font-medium">{p.name}</TD><TD>{p.assigned}</TD><TD>{p.tasksDone}</TD><TD>{p.leadsAssigned}</TD><TD>{p.conv}</TD></TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle>Partner universities & commission</CardTitle></CardHeader>
        <CardContent>
          {partners.length === 0 ? <p className="text-sm text-[var(--muted)]">No partner agreements yet. Add them from a university’s detail page.</p> : (
            <Table>
              <THead><TR><TH>University</TH><TH>Country</TH><TH>Commission</TH><TH>Contact</TH></TR></THead>
              <tbody>
                {partners.map((p) => (
                  <TR key={p.id}><TD className="font-medium">{p.university.name}</TD><TD>{p.university.country}</TD><TD>{p.commissionRate != null ? `${p.commissionRate}%` : "—"}</TD><TD className="text-[var(--muted)]">{p.contactEmail ?? "—"}</TD></TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
