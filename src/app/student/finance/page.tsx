import { requireUser } from "@/server/guards";
import { db } from "@/lib/db";
import { monthlyLivingCost } from "@/lib/cost-of-living";
import { DashboardShell } from "@/components/dashboard/shell";
import { studentNav } from "@/components/dashboard/navs";
import { Card, CardContent } from "@/components/ui/card";
import { FinanceModule, type CountryCost, type LoanView } from "@/components/student/finance-module";

export default async function FinancePage() {
  const user = await requireUser();
  const profile = await db.studentProfile.findUnique({
    where: { userId: user.id },
    include: { loanCases: { orderBy: { createdAt: "desc" } } },
  });

  if (!profile) {
    return (
      <DashboardShell user={user} nav={studentNav}>
        <Card><CardContent className="py-8 text-center text-sm text-[var(--muted)]">Create your profile first.</CardContent></Card>
      </DashboardShell>
    );
  }

  // Average tuition per country from the catalog.
  const programs = await db.program.findMany({ select: { tuitionFeeUsd: true, university: { select: { country: true } } } });
  const agg = new Map<string, { sum: number; n: number }>();
  for (const p of programs) {
    if (p.tuitionFeeUsd == null) continue;
    const c = p.university.country;
    const cur = agg.get(c) ?? { sum: 0, n: 0 };
    cur.sum += p.tuitionFeeUsd;
    cur.n += 1;
    agg.set(c, cur);
  }
  const countries: CountryCost[] = [...agg.entries()]
    .map(([country, { sum, n }]) => ({ country, avgTuition: Math.round(sum / n), living: monthlyLivingCost(country) }))
    .sort((a, b) => a.country.localeCompare(b.country));

  const loans: LoanView[] = profile.loanCases.map((l) => ({ id: l.id, amountUsd: l.amountUsd, partner: l.partner, status: l.status, notes: l.notes }));

  return (
    <DashboardShell user={user} nav={studentNav}>
      <h1 className="text-xl font-semibold">Finance & funding</h1>
      <p className="mb-5 mt-1 text-sm text-[var(--muted)]">
        Estimate total costs by country and track education-loan / proof-of-funds planning.
      </p>
      <FinanceModule countries={countries} loans={loans} />
    </DashboardShell>
  );
}
