import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";
import { adminNav } from "@/components/dashboard/navs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UniversityForm } from "@/components/admin/university-form";
import { ProgramManager, ScholarshipManager, DeleteUniversityButton } from "@/components/admin/catalog-managers";

export default async function UniversityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(Role.OPS_ADMIN);
  const uni = await db.university.findUnique({
    where: { id },
    include: {
      programs: { orderBy: { name: "asc" } },
      scholarships: { orderBy: { name: "asc" } },
    },
  });
  if (!uni) notFound();

  return (
    <DashboardShell user={user} nav={adminNav}>
      <Link href="/admin/universities" className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> All universities
      </Link>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">{uni.name}</h1>
        <DeleteUniversityButton id={uni.id} />
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">{uni.country}{uni.city ? ` · ${uni.city}` : ""}</p>

      <div className="mt-5 grid gap-5">
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent>
            <UniversityForm
              id={uni.id}
              initial={{
                name: uni.name,
                country: uni.country,
                city: uni.city,
                worldRanking: uni.worldRanking,
                website: uni.website,
                accreditations: uni.accreditations,
                description: uni.description,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Programs ({uni.programs.length})</CardTitle></CardHeader>
          <CardContent>
            <ProgramManager
              universityId={uni.id}
              programs={uni.programs.map((p) => ({ id: p.id, name: p.name, degreeLevel: p.degreeLevel, specialization: p.specialization, tuitionFeeUsd: p.tuitionFeeUsd }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Scholarships ({uni.scholarships.length})</CardTitle></CardHeader>
          <CardContent>
            <ScholarshipManager
              universityId={uni.id}
              scholarships={uni.scholarships.map((s) => ({ id: s.id, name: s.name, scope: s.scope, amountUsd: s.amountUsd }))}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
