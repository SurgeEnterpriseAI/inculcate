"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Square, CheckSquare } from "lucide-react";
import { startVisaCase, toggleChecklistItem, updateVisaStatus } from "@/server/actions/visa";
import { VISA_STATUSES, VISA_STATUS_LABEL } from "@/lib/visa-checklists";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChecklistItem { item: string; required: boolean; done: boolean }
export interface VisaApp {
  applicationId: string;
  programName: string;
  university: string;
  country: string;
  visaCase: { id: string; status: string; checklist: ChecklistItem[] } | null;
}

export function VisaManager({ apps }: { apps: VisaApp[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (apps.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No applications yet. Shortlist programs and apply to begin visa preparation.</p>;
  }

  return (
    <div className="space-y-4">
      {apps.map((a) => (
        <Card key={a.applicationId}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--brand)]" /> {a.programName} — {a.university}</CardTitle>
              <Badge>{a.country}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {!a.visaCase ? (
              <Button disabled={pending} onClick={() => start(async () => { await startVisaCase(a.applicationId); router.refresh(); })}>
                Start visa case
              </Button>
            ) : (
              <VisaCaseBody vc={a.visaCase} pending={pending} onChange={() => router.refresh()} start={start} />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function VisaCaseBody({
  vc,
  pending,
  start,
  onChange,
}: {
  vc: { id: string; status: string; checklist: ChecklistItem[] };
  pending: boolean;
  start: (cb: () => Promise<void>) => void;
  onChange: () => void;
}) {
  const done = vc.checklist.filter((c) => c.done).length;
  const pct = vc.checklist.length ? Math.round((done / vc.checklist.length) * 100) : 0;
  const [status, setStatus] = useState(vc.status);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-[var(--muted)]">Status</span>
        <Select
          className="h-9 w-56"
          value={status}
          disabled={pending}
          onChange={(e) => {
            const s = e.target.value;
            setStatus(s);
            start(async () => { await updateVisaStatus(vc.id, s as never); onChange(); });
          }}
        >
          {VISA_STATUSES.map((s) => <option key={s} value={s}>{VISA_STATUS_LABEL[s]}</option>)}
        </Select>
        <span className="text-sm text-[var(--muted)]">{done}/{vc.checklist.length} docs ({pct}%)</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-[var(--brand)]" style={{ width: `${pct}%` }} /></div>
      <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
        {vc.checklist.map((c, i) => (
          <li key={i}>
            <button
              disabled={pending}
              onClick={() => start(async () => { await toggleChecklistItem(vc.id, i); onChange(); })}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              {c.done ? <CheckSquare className="h-4 w-4 text-green-600" /> : <Square className="h-4 w-4 text-slate-400" />}
              <span className={c.done ? "text-slate-400 line-through" : ""}>{c.item}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-[var(--muted)]">Indicative checklist — your counselor confirms exact requirements. Not legal advice; no visa outcome is guaranteed.</p>
    </div>
  );
}
