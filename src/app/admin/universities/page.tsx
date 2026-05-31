import Link from "next/link";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";
import { adminNav } from "@/components/dashboard/navs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { UniversityForm } from "@/components/admin/university-form";

export default async function UniversitiesAdminPage() {
  const user = await requireRole(Role.OPS_ADMIN);
  const universities = await db.university.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { programs: true, scholarships: true } } },
  });

  return (
    <DashboardShell user={user} nav={adminNav}>
      <h1 className="text-xl font-semibold">Universities</h1>
      <p className="mb-5 mt-1 text-sm text-[var(--muted)]">
        Maintain the knowledge base. {universities.length} universit{universities.length === 1 ? "y" : "ies"} in the catalog.
      </p>

      {universities.length > 0 ? (
        <Table>
          <THead><TR><TH>Name</TH><TH>Country</TH><TH>Ranking</TH><TH>Programs</TH><TH>Scholarships</TH></TR></THead>
          <tbody>
            {universities.map((u) => (
              <TR key={u.id}>
                <TD className="font-medium">
                  <Link href={`/admin/universities/${u.id}`} className="text-[var(--brand)] hover:underline">{u.name}</Link>
                </TD>
                <TD>{u.country}</TD>
                <TD>{u.worldRanking ?? "—"}</TD>
                <TD>{u._count.programs}</TD>
                <TD>{u._count.scholarships}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      ) : (
        <p className="text-sm text-[var(--muted)]">No universities yet — add one below or import a CSV.</p>
      )}

      <Card className="mt-6 max-w-3xl">
        <CardHeader>
          <CardTitle>Add a university</CardTitle>
          <CardDescription>You can add programs and scholarships after creating it.</CardDescription>
        </CardHeader>
        <CardContent>
          <UniversityForm />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
