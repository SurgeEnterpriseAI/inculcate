"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Plus } from "lucide-react";
import { createLoanCase, updateLoanStatus } from "@/server/actions/finance";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

export interface CountryCost { country: string; avgTuition: number; living: number }
export interface LoanView { id: string; amountUsd: number | null; partner: string | null; status: string; notes: string | null }

const STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"] as const;
const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function FinanceModule({ countries, loans }: { countries: CountryCost[]; loans: LoanView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [country, setCountry] = useState(countries[0]?.country ?? "");
  const [years, setYears] = useState("2");
  const [amount, setAmount] = useState("");
  const [partner, setPartner] = useState("");
  const [error, setError] = useState<string | null>(null);

  const est = useMemo(() => {
    const c = countries.find((x) => x.country === country);
    const y = Math.max(1, Number(years) || 1);
    if (!c) return null;
    const tuition = c.avgTuition * y;
    const living = c.living * 12 * y;
    return { tuition, living, total: tuition + living, perMonth: c.living, avgTuition: c.avgTuition };
  }, [country, years, countries]);

  function addLoan() {
    setError(null);
    start(async () => {
      const res = await createLoanCase({ amountUsd: Number(amount) || undefined, partner: partner || undefined });
      if (!res.ok) return setError(res.error ?? "Failed");
      setAmount(""); setPartner("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="h-4 w-4" /> Cost estimator</CardTitle></CardHeader>
        <CardContent>
          <div className="grid items-end gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="f-country">Country</Label>
              <Select id="f-country" value={country} onChange={(e) => setCountry(e.target.value)}>
                {countries.map((c) => <option key={c.country} value={c.country}>{c.country}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="f-years">Program length (years)</Label>
              <Input id="f-years" type="number" min={1} max={6} value={years} onChange={(e) => setYears(e.target.value)} />
            </div>
          </div>
          {est && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--border)] p-3"><p className="text-xs text-[var(--muted)]">Tuition (est.)</p><p className="text-lg font-semibold">{usd(est.tuition)}</p><p className="text-xs text-[var(--muted)]">~{usd(est.avgTuition)}/yr avg</p></div>
              <div className="rounded-lg border border-[var(--border)] p-3"><p className="text-xs text-[var(--muted)]">Living (est.)</p><p className="text-lg font-semibold">{usd(est.living)}</p><p className="text-xs text-[var(--muted)]">~{usd(est.perMonth)}/mo</p></div>
              <div className="rounded-lg border border-[var(--brand)] bg-indigo-50 p-3"><p className="text-xs text-[var(--muted)]">Total estimate</p><p className="text-lg font-semibold text-[var(--brand)]">{usd(est.total)}</p></div>
            </div>
          )}
          <p className="mt-3 text-xs text-[var(--muted)]">Indicative synthetic estimates for planning — confirm actual figures with universities. Proof of funds typically covers tuition + one year of living costs.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Education loan / proof of funds</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div><Label htmlFor="l-amt">Loan amount (USD)</Label><Input id="l-amt" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><Label htmlFor="l-partner">Lender / partner</Label><Input id="l-partner" value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="e.g. bank or partner (stubbed)" /></div>
            <Button onClick={addLoan} disabled={pending}><Plus className="h-4 w-4" /> Add</Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {loans.length > 0 && (
            <Table>
              <THead><TR><TH>Amount</TH><TH>Lender</TH><TH>Status</TH></TR></THead>
              <tbody>
                {loans.map((l) => (
                  <TR key={l.id}>
                    <TD className="font-medium">{l.amountUsd != null ? usd(l.amountUsd) : "—"}</TD>
                    <TD>{l.partner ?? "—"}</TD>
                    <TD>
                      <Select className="h-8 w-40" value={l.status} disabled={pending} onChange={(e) => start(async () => { await updateLoanStatus(l.id, e.target.value as never); router.refresh(); })}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </Select>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
          <p className="text-xs text-[var(--muted)]">Loan partner integration is stubbed behind an interface — no financial advice is provided here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
