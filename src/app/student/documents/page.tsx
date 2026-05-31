import { requireUser } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";
import { studentNav } from "@/components/dashboard/navs";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentVault, type DocView } from "@/components/student/document-vault";

export default async function DocumentsPage() {
  const user = await requireUser();
  const profile = await db.studentProfile.findUnique({
    where: { userId: user.id },
    include: { documents: { orderBy: { createdAt: "desc" } } },
  });

  if (!profile) {
    return (
      <DashboardShell user={user} nav={studentNav}>
        <Card><CardContent className="py-8 text-center text-sm text-[var(--muted)]">Create your profile first to use the document vault.</CardContent></Card>
      </DashboardShell>
    );
  }

  const documents: DocView[] = profile.documents.map((d) => ({
    id: d.id,
    type: d.type,
    fileName: d.fileName,
    version: d.version,
    verification: d.verification,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <DashboardShell user={user} nav={studentNav}>
      <h1 className="text-xl font-semibold">Document vault</h1>
      <p className="mb-5 mt-1 text-sm text-[var(--muted)]">
        Securely store your documents once and reuse them across applications and visa filing. Your counselor verifies each one.
      </p>
      <DocumentVault documents={documents} />
    </DashboardShell>
  );
}
