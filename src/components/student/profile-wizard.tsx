"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { saveProfile } from "@/server/actions/profile";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, Textarea } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const DEGREE_LEVELS = ["CERTIFICATE", "DIPLOMA", "BACHELORS", "MASTERS", "MBA", "PHD"] as const;

export interface WizardInitial {
  highestQualification?: string | null;
  gpa?: number | null;
  percentage?: number | null;
  backlogs?: number | null;
  testScores?: Record<string, number | null | undefined> | null;
  targetDegreeLevel?: string | null;
  preferredCountries?: string[];
  preferredSubjects?: string[];
  budgetMinUsd?: number | null;
  budgetMaxUsd?: number | null;
  intakePreference?: string | null;
  workExperienceYears?: number | null;
  languages?: string[];
  careerGoals?: string | null;
}

const STEPS = ["Academics", "Test scores", "Preferences", "Background"];

// "" -> undefined; otherwise Number
const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
const str = (v: string) => (v.trim() === "" ? undefined : v.trim());
const list = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function ProfileWizard({ initial }: { initial: WizardInitial }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state as strings (controlled inputs).
  const [f, setF] = useState({
    highestQualification: initial.highestQualification ?? "",
    gpa: initial.gpa?.toString() ?? "",
    percentage: initial.percentage?.toString() ?? "",
    backlogs: initial.backlogs?.toString() ?? "",
    ielts: initial.testScores?.ielts?.toString() ?? "",
    toefl: initial.testScores?.toefl?.toString() ?? "",
    gre: initial.testScores?.gre?.toString() ?? "",
    gmat: initial.testScores?.gmat?.toString() ?? "",
    sat: initial.testScores?.sat?.toString() ?? "",
    targetDegreeLevel: initial.targetDegreeLevel ?? "",
    preferredCountries: (initial.preferredCountries ?? []).join(", "),
    preferredSubjects: (initial.preferredSubjects ?? []).join(", "),
    budgetMinUsd: initial.budgetMinUsd?.toString() ?? "",
    budgetMaxUsd: initial.budgetMaxUsd?.toString() ?? "",
    intakePreference: initial.intakePreference ?? "",
    workExperienceYears: initial.workExperienceYears?.toString() ?? "",
    languages: (initial.languages ?? []).join(", "),
    careerGoals: initial.careerGoals ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  function submit() {
    setError(null);
    const payload = {
      highestQualification: str(f.highestQualification),
      gpa: num(f.gpa),
      percentage: num(f.percentage),
      backlogs: num(f.backlogs),
      testScores: { ielts: num(f.ielts), toefl: num(f.toefl), gre: num(f.gre), gmat: num(f.gmat), sat: num(f.sat) },
      targetDegreeLevel: str(f.targetDegreeLevel),
      preferredCountries: list(f.preferredCountries),
      preferredSubjects: list(f.preferredSubjects),
      budgetMinUsd: num(f.budgetMinUsd),
      budgetMaxUsd: num(f.budgetMaxUsd),
      intakePreference: str(f.intakePreference),
      workExperienceYears: num(f.workExperienceYears),
      languages: list(f.languages),
      careerGoals: str(f.careerGoals),
    };
    startTransition(async () => {
      const res = await saveProfile(payload);
      if (res.ok) {
        setDone(true);
      } else {
        setError(res.error ?? "Could not save profile.");
      }
    });
  }

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
          <CardTitle>Profile saved</CardTitle>
          <CardDescription>Your profile powers AI matching (Epic 3). You can refine it anytime.</CardDescription>
          <div className="mt-2 flex gap-2">
            <Button onClick={() => router.push("/student")}>Back to dashboard</Button>
            <Button variant="outline" onClick={() => { setDone(false); setStep(0); }}>Edit again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile — Step {step + 1} of {STEPS.length}: {STEPS[step]}</CardTitle>
        <CardDescription>The more complete your profile, the better your matches.</CardDescription>
        <div className="mt-3 flex gap-1">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-[var(--brand)]" : "bg-slate-200"}`} />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 0 && (
          <>
            <div>
              <Label htmlFor="hq">Highest qualification</Label>
              <Input id="hq" value={f.highestQualification} onChange={set("highestQualification")} placeholder="B.Tech Computer Science" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label htmlFor="gpa">GPA (/10)</Label><Input id="gpa" type="number" step="0.1" value={f.gpa} onChange={set("gpa")} /></div>
              <div><Label htmlFor="pct">Percentage</Label><Input id="pct" type="number" value={f.percentage} onChange={set("percentage")} /></div>
              <div><Label htmlFor="bk">Backlogs</Label><Input id="bk" type="number" value={f.backlogs} onChange={set("backlogs")} /></div>
            </div>
          </>
        )}

        {step === 1 && (
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="ielts">IELTS</Label><Input id="ielts" type="number" step="0.5" value={f.ielts} onChange={set("ielts")} /></div>
            <div><Label htmlFor="toefl">TOEFL</Label><Input id="toefl" type="number" value={f.toefl} onChange={set("toefl")} /></div>
            <div><Label htmlFor="gre">GRE</Label><Input id="gre" type="number" value={f.gre} onChange={set("gre")} /></div>
            <div><Label htmlFor="gmat">GMAT</Label><Input id="gmat" type="number" value={f.gmat} onChange={set("gmat")} /></div>
            <div><Label htmlFor="sat">SAT</Label><Input id="sat" type="number" value={f.sat} onChange={set("sat")} /></div>
          </div>
        )}

        {step === 2 && (
          <>
            <div>
              <Label htmlFor="deg">Target degree level</Label>
              <Select id="deg" value={f.targetDegreeLevel} onChange={set("targetDegreeLevel")}>
                <option value="">Select…</option>
                {DEGREE_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </div>
            <div><Label htmlFor="pc">Preferred countries (comma-separated)</Label><Input id="pc" value={f.preferredCountries} onChange={set("preferredCountries")} placeholder="United States, Canada, Germany" /></div>
            <div><Label htmlFor="ps">Preferred subjects (comma-separated)</Label><Input id="ps" value={f.preferredSubjects} onChange={set("preferredSubjects")} placeholder="Computer Science, Data Science" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label htmlFor="bmin">Budget min (USD)</Label><Input id="bmin" type="number" value={f.budgetMinUsd} onChange={set("budgetMinUsd")} /></div>
              <div><Label htmlFor="bmax">Budget max (USD)</Label><Input id="bmax" type="number" value={f.budgetMaxUsd} onChange={set("budgetMaxUsd")} /></div>
              <div><Label htmlFor="intake">Intake</Label><Input id="intake" value={f.intakePreference} onChange={set("intakePreference")} placeholder="Fall 2026" /></div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="exp">Work experience (years)</Label><Input id="exp" type="number" step="0.5" value={f.workExperienceYears} onChange={set("workExperienceYears")} /></div>
              <div><Label htmlFor="lang">Languages (comma-separated)</Label><Input id="lang" value={f.languages} onChange={set("languages")} placeholder="English, Hindi" /></div>
            </div>
            <div><Label htmlFor="cg">Career goals</Label><Textarea id="cg" rows={4} value={f.careerGoals} onChange={set("careerGoals")} placeholder="e.g. Machine learning engineer at a product company." /></div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-between pt-2">
          <Button variant="outline" disabled={step === 0 || pending} onClick={() => setStep((s) => s - 1)}>Back</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
          ) : (
            <Button onClick={submit} disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
