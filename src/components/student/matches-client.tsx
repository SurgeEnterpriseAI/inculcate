"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check, GitCompare } from "lucide-react";
import { generateMatches, shortlistProgram } from "@/server/actions/matching";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

export interface MatchView {
  programId: string;
  fitScore: number;
  admissionProbability: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskFlags: string[];
  aiRationale: string | null;
  program: {
    name: string;
    degreeLevel: string;
    specialization: string | null;
    tuitionFeeUsd: number | null;
    durationMonths: number | null;
    university: { name: string; country: string; worldRanking: number | null };
  };
}

const riskClass: Record<MatchView["riskLevel"], string> = {
  LOW: "bg-green-50 text-green-700 border-green-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  HIGH: "bg-red-50 text-red-700 border-red-200",
};
const usd = (n?: number | null) => (n == null ? "—" : `$${n.toLocaleString()}`);

export function MatchesClient({ matches, shortlistedIds }: { matches: MatchView[]; shortlistedIds: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set(shortlistedIds));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function regenerate() {
    setError(null);
    start(async () => {
      const res = await generateMatches();
      if (!res.ok) setError(res.error ?? "Could not generate matches.");
      else router.refresh();
    });
  }
  function shortlist(programId: string) {
    start(async () => {
      const res = await shortlistProgram(programId);
      if (res.ok) setShortlisted((prev) => new Set(prev).add(programId));
    });
  }
  function toggleSelect(programId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(programId)) next.delete(programId);
      else if (next.size < 3) next.add(programId);
      return next;
    });
  }

  const compareList = matches.filter((m) => selected.has(m.programId));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          {matches.length > 0 ? `${matches.length} matches, ranked by fit. Select up to 3 to compare.` : "No matches yet."}
        </p>
        <Button onClick={regenerate} disabled={pending}>
          <Sparkles className="h-4 w-4" /> {pending ? "Generating…" : matches.length ? "Refresh matches" : "Generate matches"}
        </Button>
      </div>
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {compareList.length >= 2 && (
        <Card>
          <CardContent className="pt-4">
            <p className="mb-2 flex items-center gap-2 font-medium"><GitCompare className="h-4 w-4" /> Comparison</p>
            <Table>
              <THead><TR><TH>Program</TH><TH>Fit</TH><TH>Admission</TH><TH>Risk</TH><TH>Tuition</TH><TH>Country</TH></TR></THead>
              <tbody>
                {compareList.map((m) => (
                  <TR key={m.programId}>
                    <TD className="font-medium">{m.program.name}<div className="text-xs text-[var(--muted)]">{m.program.university.name}</div></TD>
                    <TD>{m.fitScore}%</TD>
                    <TD>{Math.round(m.admissionProbability * 100)}%</TD>
                    <TD><Badge className={riskClass[m.riskLevel]}>{m.riskLevel}</Badge></TD>
                    <TD>{usd(m.program.tuitionFeeUsd)}</TD>
                    <TD>{m.program.university.country}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {matches.map((m) => {
          const isShort = shortlisted.has(m.programId);
          return (
            <Card key={m.programId}>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{m.program.name}</h3>
                      <Badge>{m.program.degreeLevel}</Badge>
                      {m.program.specialization && <Badge>{m.program.specialization}</Badge>}
                      <Badge className={riskClass[m.riskLevel]}>{m.riskLevel} risk</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {m.program.university.name} · {m.program.university.country}
                      {m.program.university.worldRanking ? ` · World #${m.program.university.worldRanking}` : ""}
                      {m.program.tuitionFeeUsd != null ? ` · ${usd(m.program.tuitionFeeUsd)}/yr` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-center">
                    <div><div className="text-2xl font-semibold text-[var(--brand)]">{m.fitScore}%</div><div className="text-xs text-[var(--muted)]">fit</div></div>
                    <div><div className="text-2xl font-semibold">{Math.round(m.admissionProbability * 100)}%</div><div className="text-xs text-[var(--muted)]">admission</div></div>
                  </div>
                </div>

                {m.aiRationale && <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">{m.aiRationale}</p>}
                {m.riskFlags.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {m.riskFlags.map((flag, i) => <li key={i}><Badge className="bg-amber-50 text-amber-700 border-amber-200">{flag}</Badge></li>)}
                  </ul>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" variant={isShort ? "outline" : "primary"} disabled={pending || isShort} onClick={() => shortlist(m.programId)}>
                    {isShort ? <><Check className="h-4 w-4" /> Shortlisted</> : "Shortlist"}
                  </Button>
                  <label className="flex cursor-pointer items-center gap-1.5 text-sm text-[var(--muted)]">
                    <input type="checkbox" checked={selected.has(m.programId)} onChange={() => toggleSelect(m.programId)} disabled={!selected.has(m.programId) && selected.size >= 3} />
                    Compare
                  </label>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
