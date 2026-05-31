"use client";

import { useState, useTransition } from "react";
import { Wand2, RefreshCw, Save, CheckCircle2 } from "lucide-react";
import { generateWriting, refineWriting, saveWritingToVault } from "@/server/actions/writing";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";

type Kind = "SOP" | "LOR" | "ESSAY";
interface ProgramOpt { id: string; label: string }

export function WritingAssistant({ programs }: { programs: ProgramOpt[] }) {
  const [pending, start] = useTransition();
  const [kind, setKind] = useState<Kind>("SOP");
  const [programId, setProgramId] = useState<string>("");
  const [text, setText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function generate() {
    setError(null); setSaved(false);
    start(async () => {
      const res = await generateWriting({ kind, programId: programId || undefined });
      if (!res.ok || !res.text) setError(res.error ?? "Could not generate.");
      else setText(res.text);
    });
  }
  function refine() {
    if (!text.trim() || !instruction.trim()) return;
    setError(null); setSaved(false);
    start(async () => {
      const res = await refineWriting(text, instruction);
      if (!res.ok || !res.text) setError(res.error ?? "Could not refine.");
      else { setText(res.text); setInstruction(""); }
    });
  }
  function save() {
    setError(null);
    start(async () => {
      const res = await saveWritingToVault(kind, text);
      if (!res.ok) setError(res.error ?? "Could not save.");
      else setSaved(true);
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3 rounded-xl border border-[var(--border)] bg-white p-4">
        <div>
          <Label htmlFor="w-kind">Document type</Label>
          <Select id="w-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="SOP">Statement of Purpose</option>
            <option value="LOR">Letter of Recommendation</option>
            <option value="ESSAY">Application Essay</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="w-prog">Target program (optional)</Label>
          <Select id="w-prog" value={programId} onChange={(e) => setProgramId(e.target.value)}>
            <option value="">General</option>
            {programs.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </Select>
        </div>
        <Button onClick={generate} disabled={pending} className="w-full"><Wand2 className="h-4 w-4" /> {pending ? "Working…" : "Generate draft"}</Button>

        <div className="border-t border-[var(--border)] pt-3">
          <Label htmlFor="w-instr">Refine instruction</Label>
          <Select id="w-instr" value={instruction} onChange={(e) => setInstruction(e.target.value)}>
            <option value="">Choose…</option>
            <option value="make it more concise">Make it more concise</option>
            <option value="expand with more detail">Expand with more detail</option>
            <option value="make it more formal">Make it more formal</option>
          </Select>
          <Button variant="outline" onClick={refine} disabled={pending || !text || !instruction} className="mt-2 w-full"><RefreshCw className="h-4 w-4" /> Refine</Button>
        </div>

        <div className="border-t border-[var(--border)] pt-3">
          <Button onClick={save} disabled={pending || !text} className="w-full"><Save className="h-4 w-4" /> Save to vault</Button>
          {saved && <p className="mt-2 flex items-center gap-1 text-sm text-green-600"><CheckCircle2 className="h-4 w-4" /> Saved to your document vault.</p>}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-[var(--muted)]">Drafts are AI-generated starting points — personalize and review with your counselor before submitting.</p>
      </div>

      <div>
        <Label htmlFor="w-text">Draft (editable)</Label>
        <Textarea id="w-text" rows={22} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-sm" placeholder="Generate a draft, then edit and refine it here." />
      </div>
    </div>
  );
}
