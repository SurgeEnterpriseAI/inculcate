import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell, StatCard } from "@/components/dashboard/shell";
import { adminNav } from "@/components/dashboard/navs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminDashboard() {
  // OPS_ADMIN and above may enter.
  const user = await requireRole(Role.OPS_ADMIN);

  const [users, universities, programs, scholarships, leads] = await Promise.all([
    db.user.count(),
    db.university.count(),
    db.program.count(),
    db.scholarship.count(),
    db.lead.count(),
  ]);

  return (
    <DashboardShell user={user} nav={adminNav}>
      <h1 className="text-xl font-semibold">Operations & admin</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Manage the knowledge base, users, and platform analytics.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Users" value={users} />
        <StatCard label="Universities" value={universities} />
        <StatCard label="Programs" value={programs} />
        <StatCard label="Scholarships" value={scholarships} />
        <StatCard label="Leads" value={leads} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Knowledge base & analytics</CardTitle>
          <CardDescription>
            CSV import, manual CRUD (Epic 2), and the conversion funnel (Epic 7) attach here.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/admin/universities"><Button>Manage universities</Button></Link>
          <Link href="/admin/import"><Button variant="outline">Import CSV</Button></Link>
          <Link href="/search"><Button variant="outline">Search catalog</Button></Link>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
