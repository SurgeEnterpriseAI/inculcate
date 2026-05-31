"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check } from "lucide-react";
import { createTask, updateTaskStatus } from "@/server/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

export interface TaskView {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED";
  dueDate: string | null;
}

const STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"] as const;
const statusClass: Record<TaskView["status"], string> = {
  TODO: "bg-slate-50 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  BLOCKED: "bg-amber-50 text-amber-700 border-amber-200",
  DONE: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-slate-50 text-slate-500 border-slate-200",
};

export function TaskQueue({ tasks }: { tasks: TaskView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  function add() {
    setError(null);
    start(async () => {
      const res = await createTask({ title, dueDate: due || undefined });
      if (!res.ok) return setError(res.error ?? "Failed");
      setTitle(""); setDue("");
      router.refresh();
    });
  }
  function setStatus(id: string, status: TaskView["status"]) {
    start(async () => { await updateTaskStatus(id, status); router.refresh(); });
  }

  return (
    <div className="space-y-5">
      <div className="grid items-end gap-3 rounded-xl border border-[var(--border)] bg-white p-4 sm:grid-cols-[2fr_1fr_auto]">
        <div><Label htmlFor="t-title">New task</Label><Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Collect SOP from Aarav" /></div>
        <div><Label htmlFor="t-due">Due date</Label><Input id="t-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        <Button onClick={add} disabled={pending || !title.trim()}><Plus className="h-4 w-4" /> Add task</Button>
        {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No tasks yet. Add one above to track Phase-2 work.</p>
      ) : (
        <Table>
          <THead><TR><TH>Task</TH><TH>Due</TH><TH>Status</TH><TH>Update</TH></TR></THead>
          <tbody>
            {tasks.map((t) => (
              <TR key={t.id}>
                <TD className="font-medium">{t.title}</TD>
                <TD>{t.dueDate ? t.dueDate.slice(0, 10) : "—"}</TD>
                <TD><Badge className={statusClass[t.status]}>{t.status.replace("_", " ")}</Badge></TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <Select value={t.status} disabled={pending} onChange={(e) => setStatus(t.id, e.target.value as TaskView["status"])} className="h-8 w-36">
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </Select>
                    {t.status !== "DONE" && <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus(t.id, "DONE")}><Check className="h-4 w-4" /></Button>}
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
