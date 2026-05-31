"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { DocumentType, VerificationStatus } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { recordAudit } from "@/server/audit";
import { getStorageProvider } from "@/server/storage";
import { generateDraft, refineDraft, type WritingKind, type WritingProfile } from "@/server/ai/writing";

export type WritingResult = { ok: boolean; error?: string; text?: string };

async function loadWritingProfile() {
  const session = await auth();
  if (!session?.user) return null;
  const profile = await db.studentProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return null;
  const wp: WritingProfile = {
    name: session.user.name ?? "the applicant",
    highestQualification: profile.highestQualification,
    gpa: profile.gpa,
    preferredSubjects: profile.preferredSubjects,
    careerGoals: profile.careerGoals,
    workExperienceYears: profile.workExperienceYears,
  };
  return { session, profile, wp };
}

export async function generateWriting(input: { kind: WritingKind; programId?: string; tone?: "formal" | "warm" }): Promise<WritingResult> {
  const ctx = await loadWritingProfile();
  if (!ctx) return { ok: false, error: "Create your profile first." };

  let programName: string | undefined;
  let universityName: string | undefined;
  if (input.programId) {
    const p = await db.program.findUnique({ where: { id: input.programId }, include: { university: true } });
    if (p) {
      programName = p.name;
      universityName = p.university.name;
    }
  }

  const text = generateDraft({ kind: input.kind, profile: ctx.wp, programName, universityName, tone: input.tone });
  await recordAudit({ actorId: ctx.session.user.id, action: "writing.generate", entity: "Document", metadata: { kind: input.kind } });
  return { ok: true, text };
}

export async function refineWriting(text: string, instruction: string): Promise<WritingResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };
  if (!text.trim() || !instruction.trim()) return { ok: false, error: "Provide a draft and an instruction." };
  return { ok: true, text: refineDraft(text, instruction) };
}

export async function saveWritingToVault(kind: WritingKind, text: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await loadWritingProfile();
  if (!ctx) return { ok: false, error: "Create your profile first." };
  if (!text.trim()) return { ok: false, error: "Nothing to save." };

  const type = kind === "SOP" ? DocumentType.SOP : kind === "LOR" ? DocumentType.LOR : DocumentType.OTHER;
  const fileName = `${kind.toLowerCase()}-draft.txt`;
  const key = `${ctx.profile.id}/${randomUUID()}-${fileName}`;
  await getStorageProvider().put(key, Buffer.from(text, "utf8"), "text/plain");

  const version = (await db.document.count({ where: { studentProfileId: ctx.profile.id, type } })) + 1;
  await db.document.create({
    data: { studentProfileId: ctx.profile.id, type, fileName, storageKey: key, version, verification: VerificationStatus.PENDING },
  });
  await recordAudit({ actorId: ctx.session.user.id, action: "writing.save", entity: "Document", metadata: { kind } });
  revalidatePath("/student/documents");
  return { ok: true };
}
