"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Home, Plane, Check } from "lucide-react";
import { upsertAccommodation, bookTravel } from "@/server/actions/logistics";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface LogiApp {
  applicationId: string;
  programName: string;
  university: string;
  uniCity: string | null;
  accommodation: { type: string; budgetUsd: number | null; city: string | null; status: string } | null;
  travel: { fromCity: string | null; toCity: string | null; departureDate: string | null; bookingRef: string | null } | null;
}

const ACC_TYPES = ["DORM", "PRIVATE", "HOMESTAY"] as const;

export function LogisticsModule({ apps }: { apps: LogiApp[] }) {
  if (apps.length === 0) return <p className="text-sm text-[var(--muted)]">No applications yet. Accommodation and travel become relevant once you accept an offer.</p>;
  return <div className="space-y-4">{apps.map((a) => <AppLogistics key={a.applicationId} app={a} />)}</div>;
}

function AppLogistics({ app }: { app: LogiApp }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [accType, setAccType] = useState(app.accommodation?.type ?? "DORM");
  const [accBudget, setAccBudget] = useState(app.accommodation?.budgetUsd?.toString() ?? "");
  const [accCity, setAccCity] = useState(app.accommodation?.city ?? app.uniCity ?? "");

  const [from, setFrom] = useState(app.travel?.fromCity ?? "");
  const [to, setTo] = useState(app.travel?.toCity ?? app.uniCity ?? "");
  const [date, setDate] = useState(app.travel?.departureDate?.slice(0, 10) ?? "");

  function saveAcc() {
    setError(null);
    start(async () => {
      const res = await upsertAccommodation(app.applicationId, { type: accType as never, budgetUsd: Number(accBudget) || undefined, city: accCity || undefined });
      if (!res.ok) setError(res.error ?? "Failed"); else router.refresh();
    });
  }
  function book() {
    setError(null);
    start(async () => {
      const res = await bookTravel(app.applicationId, { fromCity: from, toCity: to, departureDate: date });
      if (!res.ok) setError(res.error ?? "Failed"); else router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>{app.programName} — {app.university}</CardTitle></CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium"><Home className="h-4 w-4 text-[var(--brand)]" /> Accommodation {app.accommodation && <Badge>{app.accommodation.status}</Badge>}</p>
          <div className="grid grid-cols-2 gap-2">
            <div><Label htmlFor={`at-${app.applicationId}`}>Type</Label><Select id={`at-${app.applicationId}`} value={accType} onChange={(e) => setAccType(e.target.value)}>{ACC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></div>
            <div><Label htmlFor={`ab-${app.applicationId}`}>Budget/mo (USD)</Label><Input id={`ab-${app.applicationId}`} type="number" value={accBudget} onChange={(e) => setAccBudget(e.target.value)} /></div>
          </div>
          <div><Label htmlFor={`ac-${app.applicationId}`}>City</Label><Input id={`ac-${app.applicationId}`} value={accCity} onChange={(e) => setAccCity(e.target.value)} /></div>
          <Button size="sm" onClick={saveAcc} disabled={pending}>Save request</Button>
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium"><Plane className="h-4 w-4 text-[var(--brand)]" /> Travel {app.travel?.bookingRef && <Badge className="bg-green-50 text-green-700 border-green-200"><Check className="mr-1 h-3 w-3" />{app.travel.bookingRef}</Badge>}</p>
          <div className="grid grid-cols-2 gap-2">
            <div><Label htmlFor={`tf-${app.applicationId}`}>From</Label><Input id={`tf-${app.applicationId}`} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="e.g. Hyderabad" /></div>
            <div><Label htmlFor={`tt-${app.applicationId}`}>To</Label><Input id={`tt-${app.applicationId}`} value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <div><Label htmlFor={`td-${app.applicationId}`}>Departure</Label><Input id={`td-${app.applicationId}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <Button size="sm" onClick={book} disabled={pending}>{app.travel?.bookingRef ? "Re-book (stub)" : "Book flight (stub)"}</Button>
        </div>
        {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
      </CardContent>
    </Card>
  );
}
