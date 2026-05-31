"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { profileSchema } from "@/lib/validation/profile";
import { recordAudit } from "@/server/audit";

export type ActionResult = {
  ok: boolean;
  error?: string;
  issues?: Record<string, string[] | undefined>;
};

/** Save (create or update) the signed-in student's profile. */
export async function saveProfile(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", issues: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  const hasScores = d.testScores && Object.values(d.testScores).some((v) => v != null);
  const data = {
    highestQualification: d.highestQualification ?? null,
    gpa: d.gpa ?? null,
    percentage: d.percentage ?? null,
    backlogs: d.backlogs ?? null,
    testScores: hasScores ? (d.testScores as Prisma.InputJsonValue) : Prisma.JsonNull,
    targetDegreeLevel: d.targetDegreeLevel ?? null,
    preferredCountries: d.preferredCountries,
    preferredSubjects: d.preferredSubjects,
    budgetMinUsd: d.budgetMinUsd ?? null,
    budgetMaxUsd: d.budgetMaxUsd ?? null,
    intakePreference: d.intakePreference ?? null,
    workExperienceYears: d.workExperienceYears ?? null,
    languages: d.languages,
    careerGoals: d.careerGoals ?? null,
  };

  await db.studentProfile.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  await recordAudit({
    actorId: session.user.id,
    action: "profile.update",
    entity: "StudentProfile",
    entityId: session.user.id,
  });

  revalidatePath("/student");
  revalidatePath("/student/profile");
  return { ok: true };
}
