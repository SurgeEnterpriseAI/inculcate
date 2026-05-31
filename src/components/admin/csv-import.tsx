"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { importCatalogCsv, type ImportResult } from "@/server/actions/import";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/select";

const SAMPLE = `university,country,city,worldRanking,website,program,degreeLevel,specialization,tuitionFeeUsd,durationMonths
University of Melbourne,Australia,Melbourne,33,https://unimelb.edu.au,MS Information Technology,MASTERS,Software Engineering,38000,24
ETH Zurich,Switzerland,Zurich,7,https://ethz.ch,MSc Robotics,MASTERS,Robotics,1500,18
ETH Zurich,Switzerland,Zurich,7,https://ethz.ch,PhD Computer Science,PHD,Machine Learning,2000,48`;

export function CsvImport() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setText(await file.text());
  }

  function run() {
    setError(null);
    setResult(null);
    start(async () => {
      const res = await importCatalogCsv(text);
      if (!res.ok && res.error) setError(res.error);
      else { setResult(res); router.refresh(); }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
          <Upload className="h-4 w-4" /> Choose .csv file
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
        </label>
        <Button variant="ghost" size="sm" onClick={() => setText(SAMPLE)}>Load sample</Button>
      </div>

      <div>
        <Label htmlFor="csv">CSV content</Label>
        <Textarea id="csv" rows={10} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs"
          placeholder="university,country,city,worldRanking,website,program,degreeLevel,specialization,tuitionFeeUsd,durationMonths" />
        <p className="mt-1 text-xs text-[var(--muted)]">
          Required columns: <code>university</code>, <code>country</code>. degreeLevel must be one of CERTIFICATE, DIPLOMA, BACHELORS, MASTERS, MBA, PHD.
        </p>
      </div>

      {error && <p className="flex items-center gap-2 text-sm text-red-600"><AlertTriangle className="h-4 w-4" />{error}</p>}

      {result && (
        <div className="rounded-lg border border-[var(--border)] bg-slate-50 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-green-700"><CheckCircle2 className="h-4 w-4" /> Import finished</p>
          <ul className="mt-2 space-y-0.5 text-slate-700">
            <li>Rows processed: <b>{result.rowsProcessed}</b></li>
            <li>Universities created/updated: <b>{result.universitiesCreated}</b></li>
            <li>Programs created: <b>{result.programsCreated}</b></li>
            <li>Rows with errors: <b>{result.rowErrors.length}</b></li>
          </ul>
          {result.rowErrors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-red-600">View row errors</summary>
              <ul className="mt-1 list-inside list-disc text-xs text-red-600">
                {result.rowErrors.map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      <Button onClick={run} disabled={pending || !text.trim()}>{pending ? "Importing…" : "Import"}</Button>
    </div>
  );
}
