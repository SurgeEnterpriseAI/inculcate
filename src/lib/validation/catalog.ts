import { z } from "zod";
import { DegreeLevel } from "@prisma/client";

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

export const universitySchema = z.object({
  name: z.string().min(2, "Name is required").max(160),
  country: z.string().min(2, "Country is required").max(80),
  city: z.preprocess(emptyToUndef, z.string().max(80).optional()),
  worldRanking: z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional()),
  accreditations: z.array(z.string().min(1)).max(20).default([]),
  website: z.preprocess(emptyToUndef, z.string().url("Must be a valid URL").optional()),
  description: z.preprocess(emptyToUndef, z.string().max(2000).optional()),
});
export type UniversityInput = z.infer<typeof universitySchema>;

export const programSchema = z.object({
  name: z.string().min(2, "Name is required").max(160),
  degreeLevel: z.nativeEnum(DegreeLevel),
  specialization: z.preprocess(emptyToUndef, z.string().max(120).optional()),
  tuitionFeeUsd: z.preprocess(emptyToUndef, z.coerce.number().int().min(0).optional()),
  durationMonths: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(120).optional()),
  intakeDates: z.array(z.string().min(1)).max(12).default([]),
  applicationDeadline: z.preprocess(emptyToUndef, z.coerce.date().optional()),
  eligibility: z.preprocess(emptyToUndef, z.string().max(1000).optional()),
  languageRequirements: z.preprocess(emptyToUndef, z.string().max(300).optional()),
});
export type ProgramInput = z.infer<typeof programSchema>;

export const scholarshipSchema = z.object({
  name: z.string().min(2, "Name is required").max(160),
  scope: z.enum(["program", "university", "country"]),
  country: z.preprocess(emptyToUndef, z.string().max(80).optional()),
  eligibility: z.preprocess(emptyToUndef, z.string().max(1000).optional()),
  amountUsd: z.preprocess(emptyToUndef, z.coerce.number().int().min(0).optional()),
  deadline: z.preprocess(emptyToUndef, z.coerce.date().optional()),
});
export type ScholarshipInput = z.infer<typeof scholarshipSchema>;

/** One row of the university+program CSV importer. */
export const csvRowSchema = z.object({
  university: z.string().min(2),
  country: z.string().min(2),
  city: z.string().optional(),
  worldRanking: z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional()),
  website: z.preprocess(emptyToUndef, z.string().url().optional()),
  program: z.string().optional(),
  degreeLevel: z.preprocess(emptyToUndef, z.nativeEnum(DegreeLevel).optional()),
  specialization: z.string().optional(),
  tuitionFeeUsd: z.preprocess(emptyToUndef, z.coerce.number().int().min(0).optional()),
  durationMonths: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).optional()),
});
export type CsvRow = z.infer<typeof csvRowSchema>;
