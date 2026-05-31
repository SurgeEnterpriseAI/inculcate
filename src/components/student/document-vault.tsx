"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, Trash2, FileText, CheckCircle2, Clock, XCircle } from "lucide-react";
import { uploadDocument, deleteDocument } from "@/server/actions/documents";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";

const TYPES = ["SOP", "LOR", "TRANSCRIPT", "PASSPORT", "FINANCIAL_PROOF", "TEST_SCORE", "RESUME", "OTHER"] as const;

export interface DocView {
  id: string;
  type: string;
  fileName: string;
  version: number;
  verification: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: string;
}

const verifyBadge = {
  PENDING: { cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: Clock, label: "Pending" },
  VERIFIED: { cls: "bg-green-50 text-green-700 border-green-200", Icon: CheckCircle2, label: "Verified" },
  REJECTED: { cls: "bg-red-50 text-red-700 border-red-200", Icon: XCircle, label: "Rejected" },
};

export function DocumentVault({ documents }: { documents: DocView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<string>("SOP");
  const fileRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Choose a file.");
    const fd = new FormData();
    fd.set("file", file);
    fd.set("type", type);
    start(async () => {
      const res = await uploadDocument(fd);
      if (!res.ok) return setError(res.error ?? "Upload failed.");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }
  function remove(id: string) {
    start(async () => { await deleteDocument(id); router.refresh(); });
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="grid items-end gap-3 rounded-xl border border-[var(--border)] bg-white p-4 sm:grid-cols-[1fr_2fr_auto]">
        <div>
          <Label htmlFor="dtype">Document type</Label>
          <Select id="dtype" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="dfile">File (max 4 MB)</Label>
          <input ref={fileRef} id="dfile" type="file" className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm hover:file:bg-slate-200" />
        </div>
        <Button type="submit" disabled={pending}><Upload className="h-4 w-4" /> {pending ? "Uploading…" : "Upload"}</Button>
        {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
      </form>

      {documents.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No documents yet. Upload your SOP, transcripts, financial proof, and more — reused across applications and visa filing.</p>
      ) : (
        <Table>
          <THead><TR><TH>Type</TH><TH>File</TH><TH>Version</TH><TH>Status</TH><TH></TH></TR></THead>
          <tbody>
            {documents.map((d) => {
              const vb = verifyBadge[d.verification];
              return (
                <TR key={d.id}>
                  <TD className="font-medium">{d.type.replace("_", " ")}</TD>
                  <TD className="flex items-center gap-2"><FileText className="h-4 w-4 text-[var(--muted)]" />{d.fileName}</TD>
                  <TD>v{d.version}</TD>
                  <TD><Badge className={vb.cls}><vb.Icon className="mr-1 h-3 w-3" />{vb.label}</Badge></TD>
                  <TD className="text-right">
                    <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener noreferrer" className="mr-2 inline-flex"><Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button></a>
                    <Button variant="ghost" size="sm" disabled={pending} onClick={() => remove(d.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
