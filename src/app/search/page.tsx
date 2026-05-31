import { Prisma, DegreeLevel } from "@prisma/client";
import { requireUser } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";
import { navFor } from "@/components/dashboard/navs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const DEGREE_LEVELS = Object.values(DegreeLevel);

type SearchParams = Promise<{ q?: string; country?: string; degreeLevel?: string; maxFee?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const sp = await searchParams;

  const q = sp.q?.trim() || "";
  const country = sp.country?.trim() || "";
  const degreeLevel = DEGREE_LEVELS.includes(sp.degreeLevel as DegreeLevel) ? (sp.degreeLevel as DegreeLevel) : "";
  const maxFee = sp.maxFee && !Number.isNaN(Number(sp.maxFee)) ? Number(sp.maxFee) : undefined;

  const where: Prisma.ProgramWhereInput = {};
  if (degreeLevel) where.degreeLevel = degreeLevel;
  if (maxFee != null) where.tuitionFeeUsd = { lte: maxFee };
  if (country) where.university = { country };
  if (q)
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { specialization: { contains: q, mode: "insensitive" } },
    ];

  const [programs, countries] = await Promise.all([
    db.program.findMany({
      where,
      include: { university: true, _count: { select: { scholarships: true } } },
      orderBy: [{ university: { worldRanking: "asc" } }, { name: "asc" }],
      take: 100,
    }),
    db.university.findMany({ distinct: ["country"], select: { country: true }, orderBy: { country: "asc" } }),
  ]);

  return (
    <DashboardShell user={user} nav={navFor(user.role)}>
      <h1 className="text-xl font-semibold">Find programs</h1>
      <p className="mb-5 mt-1 text-sm text-[var(--muted)]">
        Structured search across the catalog. AI-ranked matching arrives in Epic 3.
      </p>

      {/* Filters — plain GET form, server-rendered results */}
      <form method="get" className="mb-6 grid items-end gap-3 rounded-xl border border-[var(--border)] bg-white p-4 sm:grid-cols-5">
        <div className="sm:col-span-2">
          <Label htmlFor="q">Keyword</Label>
          <Input id="q" name="q" defaultValue={q} placeholder="e.g. Machine Learning" />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Select id="country" name="country" defaultValue={country}>
            <option value="">Any</option>
            {countries.map((c) => <option key={c.country} value={c.country}>{c.country}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="degreeLevel">Degree</Label>
          <Select id="degreeLevel" name="degreeLevel" defaultValue={degreeLevel}>
            <option value="">Any</option>
            {DEGREE_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="maxFee">Max fee (USD)</Label>
          <Input id="maxFee" name="maxFee" type="number" defaultValue={maxFee ?? ""} placeholder="50000" />
        </div>
        <div className="sm:col-span-5 flex gap-2">
          <Button type="submit">Search</Button>
          <a href="/search"><Button type="button" variant="ghost">Clear</Button></a>
        </div>
      </form>

      <p className="mb-3 text-sm text-[var(--muted)]">{programs.length} program{programs.length === 1 ? "" : "s"} found{programs.length === 100 ? " (showing first 100)" : ""}.</p>

      <div className="grid gap-3">
        {programs.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{p.name}</h3>
                  <Badge>{p.degreeLevel}</Badge>
                  {p.specialization && <Badge>{p.specialization}</Badge>}
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {p.university.name} · {p.university.country}
                  {p.university.worldRanking ? ` · World #${p.university.worldRanking}` : ""}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium">{p.tuitionFeeUsd != null ? `$${p.tuitionFeeUsd.toLocaleString()}/yr` : "Fee N/A"}</p>
                <p className="text-[var(--muted)]">
                  {p.durationMonths ? `${p.durationMonths} mo` : ""}
                  {p._count.scholarships > 0 ? ` · ${p._count.scholarships} scholarship${p._count.scholarships > 1 ? "s" : ""}` : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {programs.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-[var(--muted)]">No programs match these filters. Try widening your search.</CardContent></Card>
        )}
      </div>
    </DashboardShell>
  );
}
