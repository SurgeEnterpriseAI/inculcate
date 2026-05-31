import { LayoutDashboard, Building2, GraduationCap, Users, BarChart3 } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell, StatCard, type NavItem } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const nav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin", label: "Universities", icon: Building2 },
  { href: "/admin", label: "Programs", icon: GraduationCap },
  { href: "/admin", label: "Users", icon: Users },
  { href: "/admin", label: "Analytics", icon: BarChart3 },
];

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
    <DashboardShell user={user} nav={nav}>
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
        <CardContent>
          <p className="text-sm text-[var(--muted)]">
            Audit logging is active on privileged actions. Role management is restricted to Super Admin.
          </p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
