"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  createProgram,
  deleteProgram,
  createScholarship,
  deleteScholarship,
  deleteUniversity,
} from "@/server/actions/catalog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

const DEGREE_LEVELS = ["CERTIFICATE", "DIPLOMA", "BACHELORS", "MASTERS", "MBA", "PHD"] as const;
const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
const usd = (n?: number | null) => (n == null ? "—" : `$${n.toLocaleString()}`);

interface ProgramRow {
  id: string;
  name: string;
  degreeLevel: string;
  specialization: string | null;
  tuitionFeeUsd: number | null;
}

export function ProgramManager({ universityId, programs }: { universityId: string; programs: ProgramRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", degreeLevel: "MASTERS", specialization: "", tuitionFeeUsd: "", durationMonths: "", intakeDates: "", applicationDeadline: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  function add() {
    setError(null);
    start(async () => {
      const res = await createProgram(universityId, {
        name: f.name,
        degreeLevel: f.degreeLevel,
        specialization: f.specialization,
        tuitionFeeUsd: f.tuitionFeeUsd,
        durationMonths: f.durationMonths,
        intakeDates: list(f.intakeDates),
        applicationDeadline: f.applicationDeadline,
      });
      if (!res.ok) return setError(res.error ?? "Could not add program.");
      setF({ name: "", degreeLevel: "MASTERS", specialization: "", tuitionFeeUsd: "", durationMonths: "", intakeDates: "", applicationDeadline: "" });
      router.refresh();
    });
  }
  function remove(id: string) {
    start(async () => { await deleteProgram(id, universityId); router.refresh(); });
  }

  return (
    <div className="space-y-3">
      {programs.length > 0 && (
        <Table>
          <THead><TR><TH>Program</TH><TH>Level</TH><TH>Specialization</TH><TH>Tuition</TH><TH></TH></TR></THead>
          <tbody>
            {programs.map((p) => (
              <TR key={p.id}>
                <TD className="font-medium">{p.name}</TD>
                <TD>{p.degreeLevel}</TD>
                <TD>{p.specialization ?? "—"}</TD>
                <TD>{usd(p.tuitionFeeUsd)}</TD>
                <TD><Button variant="ghost" size="sm" disabled={pending} onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
      <div className="grid gap-3 rounded-lg border border-[var(--border)] p-3 sm:grid-cols-2">
        <div><Label htmlFor="p-name">Program name *</Label><Input id="p-name" value={f.name} onChange={set("name")} /></div>
        <div><Label htmlFor="p-deg">Degree level *</Label><Select id="p-deg" value={f.degreeLevel} onChange={set("degreeLevel")}>{DEGREE_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}</Select></div>
        <div><Label htmlFor="p-spec">Specialization</Label><Input id="p-spec" value={f.specialization} onChange={set("specialization")} /></div>
        <div><Label htmlFor="p-fee">Tuition (USD)</Label><Input id="p-fee" type="number" value={f.tuitionFeeUsd} onChange={set("tuitionFeeUsd")} /></div>
        <div><Label htmlFor="p-dur">Duration (months)</Label><Input id="p-dur" type="number" value={f.durationMonths} onChange={set("durationMonths")} /></div>
        <div><Label htmlFor="p-intake">Intakes (comma-separated)</Label><Input id="p-intake" value={f.intakeDates} onChange={set("intakeDates")} placeholder="Sep 2026, Jan 2027" /></div>
        <div><Label htmlFor="p-dl">Application deadline</Label><Input id="p-dl" type="date" value={f.applicationDeadline} onChange={set("applicationDeadline")} /></div>
        <div className="flex items-end">{error && <p className="text-sm text-red-600">{error}</p>}<Button className="ml-auto" onClick={add} disabled={pending || !f.name}>Add program</Button></div>
      </div>
    </div>
  );
}

interface ScholarshipRow {
  id: string;
  name: string;
  scope: string;
  amountUsd: number | null;
}

export function ScholarshipManager({ universityId, scholarships }: { universityId: string; scholarships: ScholarshipRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", scope: "university", amountUsd: "", deadline: "", eligibility: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  function add() {
    setError(null);
    start(async () => {
      const res = await createScholarship(universityId, { name: f.name, scope: f.scope, amountUsd: f.amountUsd, deadline: f.deadline, eligibility: f.eligibility });
      if (!res.ok) return setError(res.error ?? "Could not add scholarship.");
      setF({ name: "", scope: "university", amountUsd: "", deadline: "", eligibility: "" });
      router.refresh();
    });
  }
  function remove(id: string) { start(async () => { await deleteScholarship(id, universityId); router.refresh(); }); }

  return (
    <div className="space-y-3">
      {scholarships.length > 0 && (
        <Table>
          <THead><TR><TH>Scholarship</TH><TH>Scope</TH><TH>Amount</TH><TH></TH></TR></THead>
          <tbody>
            {scholarships.map((s) => (
              <TR key={s.id}>
                <TD className="font-medium">{s.name}</TD>
                <TD>{s.scope}</TD>
                <TD>{usd(s.amountUsd)}</TD>
                <TD><Button variant="ghost" size="sm" disabled={pending} onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
      <div className="grid gap-3 rounded-lg border border-[var(--border)] p-3 sm:grid-cols-2">
        <div><Label htmlFor="s-name">Scholarship name *</Label><Input id="s-name" value={f.name} onChange={set("name")} /></div>
        <div><Label htmlFor="s-scope">Scope</Label><Select id="s-scope" value={f.scope} onChange={set("scope")}><option value="university">university</option><option value="program">program</option><option value="country">country</option></Select></div>
        <div><Label htmlFor="s-amt">Amount (USD)</Label><Input id="s-amt" type="number" value={f.amountUsd} onChange={set("amountUsd")} /></div>
        <div><Label htmlFor="s-dl">Deadline</Label><Input id="s-dl" type="date" value={f.deadline} onChange={set("deadline")} /></div>
        <div className="sm:col-span-2 flex items-end">{error && <p className="text-sm text-red-600">{error}</p>}<Button className="ml-auto" onClick={add} disabled={pending || !f.name}>Add scholarship</Button></div>
      </div>
    </div>
  );
}

export function DeleteUniversityButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  if (!confirm) return <Button variant="outline" size="sm" onClick={() => setConfirm(true)}>Delete</Button>;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[var(--muted)]">Delete this university and all its programs?</span>
      <Button variant="danger" size="sm" disabled={pending} onClick={() => start(async () => { await deleteUniversity(id); })}>Confirm delete</Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirm(false)}>Cancel</Button>
    </div>
  );
}
