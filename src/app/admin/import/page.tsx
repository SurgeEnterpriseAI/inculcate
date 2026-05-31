import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { DashboardShell } from "@/components/dashboard/shell";
import { adminNav } from "@/components/dashboard/navs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CsvImport } from "@/components/admin/csv-import";

export default async function ImportPage() {
  const user = await requireRole(Role.OPS_ADMIN);
  return (
    <DashboardShell user={user} nav={adminNav}>
      <h1 className="text-xl font-semibold">Import catalog (CSV)</h1>
      <p className="mb-5 mt-1 text-sm text-[var(--muted)]">
        Bulk-load universities and their programs. Re-running is safe — existing entries are updated, not duplicated.
      </p>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Upload or paste CSV</CardTitle>
          <CardDescription>One row per program; the university is de-duplicated by name + country.</CardDescription>
        </CardHeader>
        <CardContent>
          <CsvImport />
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
