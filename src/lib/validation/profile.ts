import { z } from "zod";
import { DegreeLevel } from "@prisma/client";

const optNum = z.coerce.number().finite().nonnegative().optional().nullable();

export const testScoresSchema = z
  .object({
    ielts: optNum,
    toefl: optNum,
    gre: optNum,
    gmat: optNum,
    sat: optNum,
  })
  .partial();

export const profileSchema = z.object({
  highestQualification: z.string().max(120).optional().nullable(),
  gpa: z.coerce.number().min(0).max(10).optional().nullable(),
  percentage: z.coerce.number().min(0).max(100).optional().nullable(),
  backlogs: z.coerce.number().int().min(0).max(100).optional().nullable(),
  testScores: testScoresSchema.optional().nullable(),
  targetDegreeLevel: z.nativeEnum(DegreeLevel).optional().nullable(),
  preferredCountries: z.array(z.string().min(1)).max(30).default([]),
  preferredSubjects: z.array(z.string().min(1)).max(30).default([]),
  budgetMinUsd: z.coerce.number().int().min(0).optional().nullable(),
  budgetMaxUsd: z.coerce.number().int().min(0).optional().nullable(),
  intakePreference: z.string().max(60).optional().nullable(),
  workExperienceYears: z.coerce.number().min(0).max(60).optional().nullable(),
  languages: z.array(z.string().min(1)).max(20).default([]),
  careerGoals: z.string().max(2000).optional().nullable(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Field weights for a simple profile-completeness percentage (used on the dashboard). */
export function profileCompleteness(p: Partial<ProfileInput> | null | undefined): number {
  if (!p) return 0;
  const checks = [
    !!p.highestQualification,
    p.gpa != null || p.percentage != null,
    !!p.targetDegreeLevel,
    (p.preferredCountries?.length ?? 0) > 0,
    (p.preferredSubjects?.length ?? 0) > 0,
    p.budgetMaxUsd != null,
    !!p.careerGoals,
    !!p.testScores && Object.values(p.testScores).some((v) => v != null),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
