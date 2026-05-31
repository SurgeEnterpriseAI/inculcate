import { RiskLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { cosineSim, getEmbeddingProvider, profileText, programText } from "@/server/ai/embedding";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface ProgramForScoring {
  id: string;
  name: string;
  degreeLevel: string;
  specialization: string | null;
  tuitionFeeUsd: number | null;
  eligibility: string | null;
  embedding: number[];
  university: { name: string; country: string; worldRanking: number | null };
}

export interface ProfileForScoring {
  gpa: number | null;
  percentage: number | null;
  backlogs: number | null;
  testScores: Record<string, number | null | undefined> | null;
  targetDegreeLevel: string | null;
  preferredCountries: string[];
  preferredSubjects: string[];
  budgetMaxUsd: number | null;
  workExperienceYears: number | null;
  careerGoals: string | null;
  highestQualification: string | null;
}

export interface ScoredMatch {
  fitScore: number; // 0-100
  admissionProbability: number; // 0-1
  riskLevel: RiskLevel;
  riskFlags: string[];
  aiRationale: string;
}

/** Pure scoring: combines synthetic semantic similarity with structured rules. */
export function scoreProgram(profile: ProfileForScoring, program: ProgramForScoring, profileEmb: number[]): ScoredMatch {
  const semantic = clamp(cosineSim(profileEmb, program.embedding), 0, 1);

  const subjects = profile.preferredSubjects ?? [];
  const haystack = `${program.name} ${program.specialization ?? ""}`.toLowerCase();
  const subjectMatch = subjects.length > 0 && subjects.some((s) => haystack.includes(s.toLowerCase()));

  const countryMatch = (profile.preferredCountries ?? []).some(
    (c) => c.toLowerCase() === program.university.country.toLowerCase(),
  );
  const degreeMatch = !!profile.targetDegreeLevel && profile.targetDegreeLevel === program.degreeLevel;

  // Budget fit
  let budgetFit = 0.6; // neutral when unknown
  if (profile.budgetMaxUsd != null && program.tuitionFeeUsd != null) {
    if (program.tuitionFeeUsd <= profile.budgetMaxUsd) budgetFit = 1;
    else if (program.tuitionFeeUsd <= profile.budgetMaxUsd * 1.25) budgetFit = 0.5;
    else budgetFit = 0;
  }

  const cSubject = subjectMatch ? 1 : subjects.length ? 0 : 0.5;
  const cCountry = countryMatch ? 1 : (profile.preferredCountries?.length ? 0.1 : 0.5);
  const cDegree = degreeMatch ? 1 : profile.targetDegreeLevel ? 0.2 : 0.5;

  const fit = semantic * 0.35 + cSubject * 0.15 + cCountry * 0.2 + cDegree * 0.15 + budgetFit * 0.15;
  const fitScore = Math.round(clamp(fit, 0, 1) * 100);

  // Admission probability
  let prob = 0.55;
  const ranking = program.university.worldRanking;
  if (ranking != null) {
    if (ranking <= 25) prob -= 0.2;
    else if (ranking <= 75) prob -= 0.1;
  }
  const gpa10 = profile.gpa ?? (profile.percentage != null ? profile.percentage / 10 : null);
  if (gpa10 != null) {
    if (gpa10 >= 8) prob += 0.15;
    else if (gpa10 >= 7) prob += 0.05;
    else if (gpa10 < 6) prob -= 0.15;
  }
  const hasTest = !!profile.testScores && Object.values(profile.testScores).some((v) => v != null);
  if (hasTest) prob += 0.1;
  if ((profile.backlogs ?? 0) > 0) prob -= 0.1;
  if ((profile.workExperienceYears ?? 0) >= 1) prob += 0.05;
  if (profile.budgetMaxUsd != null && program.tuitionFeeUsd != null && program.tuitionFeeUsd > profile.budgetMaxUsd * 1.25) prob -= 0.05;
  const admissionProbability = Math.round(clamp(prob, 0.05, 0.95) * 100) / 100;

  const riskLevel: RiskLevel = admissionProbability >= 0.66 ? "LOW" : admissionProbability >= 0.4 ? "MEDIUM" : "HIGH";

  const riskFlags: string[] = [];
  if (ranking != null && ranking <= 25) riskFlags.push("Highly competitive (top-ranked university)");
  if (gpa10 != null && gpa10 < 6.5) riskFlags.push("GPA below typical admit range");
  if (!hasTest) riskFlags.push("No standardized test score on file");
  if (profile.budgetMaxUsd != null && program.tuitionFeeUsd != null && program.tuitionFeeUsd > profile.budgetMaxUsd)
    riskFlags.push("Tuition exceeds your stated budget");
  if ((profile.backlogs ?? 0) > 0) riskFlags.push("Academic backlogs may require explanation");

  const aiRationale = buildRationale(profile, program, { subjectMatch, countryMatch, degreeMatch, budgetFit, admissionProbability });

  return { fitScore, admissionProbability, riskLevel, riskFlags, aiRationale };
}

function buildRationale(
  profile: ProfileForScoring,
  program: ProgramForScoring,
  ctx: { subjectMatch: boolean; countryMatch: boolean; degreeMatch: boolean; budgetFit: number; admissionProbability: number },
): string {
  const parts: string[] = [];
  if (ctx.subjectMatch) parts.push(`aligns with your interest in ${profile.preferredSubjects.join(", ")}`);
  if (ctx.degreeMatch) parts.push(`matches your target ${program.degreeLevel.toLowerCase()} level`);
  if (ctx.countryMatch) parts.push(`is in ${program.university.country}, one of your preferred destinations`);
  if (ctx.budgetFit >= 1 && program.tuitionFeeUsd != null) parts.push(`tuition ($${program.tuitionFeeUsd.toLocaleString()}/yr) fits your budget`);
  else if (ctx.budgetFit === 0 && program.tuitionFeeUsd != null) parts.push(`tuition ($${program.tuitionFeeUsd.toLocaleString()}/yr) is above your budget`);

  const lead = parts.length
    ? `${program.name} at ${program.university.name} ${parts.join("; ")}.`
    : `${program.name} at ${program.university.name} is a possible fit based on your profile.`;

  const outlook =
    ctx.admissionProbability >= 0.66
      ? "Your profile looks competitive for admission."
      : ctx.admissionProbability >= 0.4
        ? "Admission is realistic but not guaranteed — strengthen your application where you can."
        : "This is an ambitious choice; treat it as a reach.";

  return `${lead} ${outlook} (AI-generated suggestion — to be reviewed with your counselor; not an admission guarantee.)`;
}

export interface GenerateResult { ok: boolean; error?: string; count?: number }

/** Recompute and persist the top matches for a user's profile. */
export async function generateMatchesForUser(userId: string, topN = 25): Promise<GenerateResult> {
  const profile = await db.studentProfile.findUnique({ where: { userId } });
  if (!profile) return { ok: false, error: "Create your profile first." };

  const hasSignal =
    (profile.preferredSubjects?.length ?? 0) > 0 || !!profile.targetDegreeLevel || !!profile.careerGoals;
  if (!hasSignal) {
    return { ok: false, error: "Add your preferred subjects, target degree, or career goals to your profile first." };
  }

  const profileForScoring: ProfileForScoring = {
    gpa: profile.gpa,
    percentage: profile.percentage,
    backlogs: profile.backlogs,
    testScores: profile.testScores as Record<string, number> | null,
    targetDegreeLevel: profile.targetDegreeLevel,
    preferredCountries: profile.preferredCountries,
    preferredSubjects: profile.preferredSubjects,
    budgetMaxUsd: profile.budgetMaxUsd,
    workExperienceYears: profile.workExperienceYears,
    careerGoals: profile.careerGoals,
    highestQualification: profile.highestQualification,
  };
  const profileEmb = getEmbeddingProvider().embed(profileText(profileForScoring));

  const programs = await db.program.findMany({ include: { university: true } });
  if (programs.length === 0) return { ok: false, error: "No programs in the catalog yet." };

  const scored = programs
    .map((p) => {
      const prog: ProgramForScoring = {
        id: p.id,
        name: p.name,
        degreeLevel: p.degreeLevel,
        specialization: p.specialization,
        tuitionFeeUsd: p.tuitionFeeUsd,
        eligibility: p.eligibility,
        embedding: p.embedding ?? [],
        university: { name: p.university.name, country: p.university.country, worldRanking: p.university.worldRanking },
      };
      return { programId: p.id, ...scoreProgram(profileForScoring, prog, profileEmb) };
    })
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, topN);

  await db.$transaction([
    db.match.deleteMany({ where: { studentProfileId: profile.id } }),
    db.match.createMany({
      data: scored.map((s) => ({
        studentProfileId: profile.id,
        programId: s.programId,
        fitScore: s.fitScore,
        admissionProbability: s.admissionProbability,
        riskLevel: s.riskLevel,
        riskFlags: s.riskFlags,
        aiRationale: s.aiRationale,
      })),
      skipDuplicates: true,
    }),
  ]);

  return { ok: true, count: scored.length };
}
