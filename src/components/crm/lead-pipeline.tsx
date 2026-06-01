"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, StickyNote } from "lucide-react";
import { updateLeadStatus, assignLead, addLeadNote } from "@/server/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "ASSIGNED", "CONVERTED", "LOST"] as const;

export interface LeadView {
  id: string;
  student: string;
  source: string;
  status: string;
  assignedToName: string | null;
  notes: string | null;
}

export function LeadPipeline({ leads, isAdmin }: { leads: LeadView[]; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  if (leads.length === 0) return <p className="text-sm text-[var(--muted)]">No leads yet. AI-counselor handoffs and other sources appear here.</p>;

  const counts = STATUSES.map((s) => ({ s, n: leads.filter((l) => l.status === s).length }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {counts.map(({ s, n }) => (
          <div key={s} className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm">
            <span className="font-semibold">{n}</span> <span className="text-[var(--muted)]">{s}</span>
          </div>
        ))}
      </div>

      <Table>
        <THead><TR><TH>Student</TH><TH>Source</TH><TH>Status</TH><TH>Assigned</TH><TH>Actions</TH></TR></THead>
        <tbody>
          {leads.map((l) => (
            <TR key={l.id}>
              <TD className="font-medium">{l.student}{l.notes && <div className="max-w-xs truncate text-xs text-[var(--muted)]">{l.notes.split("\n").pop()}</div>}</TD>
              <TD className="text-[var(--muted)]">{l.source}</TD>
              <TD>
                <Select className="h-8 w-36" value={l.status} disabled={pending} onChange={(e) => start(async () => { await updateLeadStatus(l.id, e.target.value as never); router.refresh(); })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </TD>
              <TD>{l.assignedToName ?? <span className="text-[var(--muted)]">—</span>}</TD>
              <TD>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => { await assignLead(l.id); router.refresh(); })}>
                    <UserPlus className="h-4 w-4" /> {isAdmin ? "Assign me" : "Take"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setNoteFor(noteFor === l.id ? null : l.id); setNote(""); }}>
                    <StickyNote className="h-4 w-4" />
                  </Button>
                </div>
                {noteFor === l.id && (
                  <div className="mt-2 flex gap-2">
                    <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" className="h-8" />
                    <Button size="sm" disabled={pending || !note.trim()} onClick={() => start(async () => { await addLeadNote(l.id, note); setNote(""); setNoteFor(null); router.refresh(); })}>Save</Button>
                  </div>
                )}
              </TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
