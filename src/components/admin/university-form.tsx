"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUniversity, updateUniversity } from "@/server/actions/catalog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/select";

export interface UniversityFormValues {
  name?: string;
  country?: string;
  city?: string | null;
  worldRanking?: number | null;
  website?: string | null;
  accreditations?: string[];
  description?: string | null;
}

const list = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

export function UniversityForm({ id, initial }: { id?: string; initial?: UniversityFormValues }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [f, setF] = useState({
    name: initial?.name ?? "",
    country: initial?.country ?? "",
    city: initial?.city ?? "",
    worldRanking: initial?.worldRanking?.toString() ?? "",
    website: initial?.website ?? "",
    accreditations: (initial?.accreditations ?? []).join(", "),
    description: initial?.description ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  function submit() {
    setError(null);
    setSaved(false);
    const payload = {
      name: f.name,
      country: f.country,
      city: f.city,
      worldRanking: f.worldRanking,
      website: f.website,
      accreditations: list(f.accreditations),
      description: f.description,
    };
    start(async () => {
      const res = id ? await updateUniversity(id, payload) : await createUniversity(payload);
      if (!res.ok) {
        setError(res.error ?? "Could not save.");
        return;
      }
      if (id) {
        setSaved(true);
        router.refresh();
      } else {
        router.push(`/admin/universities/${res.id}`);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor="u-name">Name *</Label><Input id="u-name" value={f.name} onChange={set("name")} /></div>
        <div><Label htmlFor="u-country">Country *</Label><Input id="u-country" value={f.country} onChange={set("country")} /></div>
        <div><Label htmlFor="u-city">City</Label><Input id="u-city" value={f.city} onChange={set("city")} /></div>
        <div><Label htmlFor="u-rank">World ranking</Label><Input id="u-rank" type="number" value={f.worldRanking} onChange={set("worldRanking")} /></div>
        <div className="sm:col-span-2"><Label htmlFor="u-web">Website</Label><Input id="u-web" value={f.website} onChange={set("website")} placeholder="https://…" /></div>
        <div className="sm:col-span-2"><Label htmlFor="u-acc">Accreditations (comma-separated)</Label><Input id="u-acc" value={f.accreditations} onChange={set("accreditations")} /></div>
      </div>
      <div><Label htmlFor="u-desc">Description</Label><Textarea id="u-desc" rows={3} value={f.description} onChange={set("description")} /></div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Saved.</p>}
      <Button onClick={submit} disabled={pending}>{pending ? "Saving…" : id ? "Save changes" : "Create university"}</Button>
    </div>
  );
}
