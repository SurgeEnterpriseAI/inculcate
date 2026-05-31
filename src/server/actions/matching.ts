"use server";

import { revalidatePath } from "next/cache";
import { ApplicationStatus } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { recordAudit } from "@/server/audit";
import { generateMatchesForUser, type GenerateResult } from "@/server/ai/matching";

/** Recompute AI matches for the signed-in student. */
export async function generateMatches(): Promise<GenerateResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  const res = await generateMatchesForUser(session.user.id);
  if (res.ok) {
    await recordAudit({ actorId: session.user.id, action: "matches.generate", entity: "Match", metadata: { count: res.count } });
    revalidatePath("/student/matches");
    revalidatePath("/student");
  }
  return res;
}

/** Add a program to the student's shortlist (creates/keeps an Application). */
export async function shortlistProgram(programId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  const profile = await db.studentProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return { ok: false, error: "Create your profile first." };

  await db.application.upsert({
    where: { studentProfileId_programId: { studentProfileId: profile.id, programId } },
    update: {},
    create: { studentProfileId: profile.id, programId, status: ApplicationStatus.SHORTLISTED },
  });

  await recordAudit({ actorId: session.user.id, action: "application.shortlist", entity: "Application", metadata: { programId } });
  revalidatePath("/student/matches");
  revalidatePath("/student");
  return { ok: true };
}
