"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertPartnerUniversity } from "@/server/actions/crm";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/select";

export interface PartnerValues {
  commissionRate?: number | null;
  contactEmail?: string | null;
  agreementNotes?: string | null;
}

export function PartnerForm({ universityId, initial }: { universityId: string; initial?: PartnerValues }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commission, setCommission] = useState(initial?.commissionRate?.toString() ?? "");
  const [email, setEmail] = useState(initial?.contactEmail ?? "");
  const [notes, setNotes] = useState(initial?.agreementNotes ?? "");

  function save() {
    setError(null); setSaved(false);
    start(async () => {
      const res = await upsertPartnerUniversity(universityId, {
        commissionRate: commission === "" ? undefined : Number(commission),
        contactEmail: email || undefined,
        agreementNotes: notes || undefined,
      });
      if (!res.ok) setError(res.error ?? "Failed");
      else { setSaved(true); router.refresh(); }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor="p-comm">Commission rate (%)</Label><Input id="p-comm" type="number" step="0.5" value={commission} onChange={(e) => setCommission(e.target.value)} /></div>
        <div><Label htmlFor="p-email">Partner contact email</Label><Input id="p-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      </div>
      <div><Label htmlFor="p-notes">Agreement notes</Label><Textarea id="p-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Saved.</p>}
      <Button onClick={save} disabled={pending}>{pending ? "Saving…" : "Save partner agreement"}</Button>
    </div>
  );
}
