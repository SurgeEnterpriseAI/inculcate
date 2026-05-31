"use server";

import { revalidatePath } from "next/cache";
import { Prisma, VisaStatus } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAtLeast } from "@/lib/rbac";
import { recordAudit } from "@/server/audit";
import { visaChecklist, type ChecklistItem } from "@/lib/visa-checklists";

export type VisaResult = { ok: boolean; error?: string };

/** Authorize: the owning student, or any counselor/admin. */
async function authorizeForApplication(applicationId: string) {
  const session = await auth();
  if (!session?.user) return null;
  const app = await db.application.findUnique({ where: { id: applicationId }, include: { studentProfile: true, program: { include: { university: true } } } });
  if (!app) return null;
  const isOwner = app.studentProfile.userId === session.user.id;
  if (!isOwner && !hasAtLeast(session.user.role, "COUNSELOR")) return null;
  return { session, app };
}

export async function startVisaCase(applicationId: string): Promise<VisaResult> {
  const ctx = await authorizeForApplication(applicationId);
  if (!ctx) return { ok: false, error: "Not authorized" };

  const existing = await db.visaCase.findUnique({ where: { applicationId } });
  if (existing) return { ok: true };

  const country = ctx.app.program.university.country;
  await db.visaCase.create({
    data: {
      applicationId,
      studentProfileId: ctx.app.studentProfileId,
      country,
      status: VisaStatus.PREPARING,
      checklist: visaChecklist(country) as unknown as Prisma.InputJsonValue,
    },
  });
  await recordAudit({ actorId: ctx.session.user.id, action: "visa.start", entity: "VisaCase", entityId: applicationId, metadata: { country } });
  revalidatePath("/student/visa");
  return { ok: true };
}

async function authorizeForVisaCase(visaCaseId: string) {
  const session = await auth();
  if (!session?.user) return null;
  const vc = await db.visaCase.findUnique({ where: { id: visaCaseId }, include: { studentProfile: true } });
  if (!vc) return null;
  const isOwner = vc.studentProfile.userId === session.user.id;
  if (!isOwner && !hasAtLeast(session.user.role, "COUNSELOR")) return null;
  return { session, vc };
}

export async function toggleChecklistItem(visaCaseId: string, index: number): Promise<VisaResult> {
  const ctx = await authorizeForVisaCase(visaCaseId);
  if (!ctx) return { ok: false, error: "Not authorized" };

  const checklist = (ctx.vc.checklist as unknown as ChecklistItem[]) ?? [];
  if (index < 0 || index >= checklist.length) return { ok: false, error: "Invalid item" };
  checklist[index].done = !checklist[index].done;

  await db.visaCase.update({ where: { id: visaCaseId }, data: { checklist: checklist as unknown as Prisma.InputJsonValue } });
  revalidatePath("/student/visa");
  return { ok: true };
}

export async function updateVisaStatus(visaCaseId: string, status: VisaStatus): Promise<VisaResult> {
  const ctx = await authorizeForVisaCase(visaCaseId);
  if (!ctx) return { ok: false, error: "Not authorized" };
  await db.visaCase.update({ where: { id: visaCaseId }, data: { status } });
  await recordAudit({ actorId: ctx.session.user.id, action: "visa.status", entity: "VisaCase", entityId: visaCaseId, metadata: { status } });
  revalidatePath("/student/visa");
  return { ok: true };
}
