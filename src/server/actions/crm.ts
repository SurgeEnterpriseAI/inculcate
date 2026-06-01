"use server";

import { revalidatePath } from "next/cache";
import { LeadStatus } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAtLeast } from "@/lib/rbac";
import { recordAudit } from "@/server/audit";

export type CrmResult = { ok: boolean; error?: string };

async function requireCounselor() {
  const session = await auth();
  if (!session?.user || !hasAtLeast(session.user.role, "COUNSELOR")) return null;
  return session.user;
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<CrmResult> {
  const actor = await requireCounselor();
  if (!actor) return { ok: false, error: "Not authorized" };
  await db.lead.update({ where: { id }, data: { status } });
  await recordAudit({ actorId: actor.id, action: "lead.status", entity: "Lead", entityId: id, metadata: { status } });
  revalidatePath("/counselor/leads");
  revalidatePath("/counselor");
  revalidatePath("/admin/analytics");
  return { ok: true };
}

/** Assign a lead to a counselor (defaults to self) and create a student assignment. */
export async function assignLead(id: string, counselorId?: string): Promise<CrmResult> {
  const actor = await requireCounselor();
  if (!actor) return { ok: false, error: "Not authorized" };

  // Only admins may assign to someone other than themselves.
  const targetId = counselorId && hasAtLeast(actor.role, "OPS_ADMIN") ? counselorId : actor.id;

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return { ok: false, error: "Not found" };

  await db.lead.update({ where: { id }, data: { assignedTo: targetId, status: LeadStatus.ASSIGNED } });

  if (lead.studentProfileId) {
    await db.counselorAssignment.upsert({
      where: { counselorId_studentProfileId: { counselorId: targetId, studentProfileId: lead.studentProfileId } },
      update: { active: true },
      create: { counselorId: targetId, studentProfileId: lead.studentProfileId },
    });
  }

  await recordAudit({ actorId: actor.id, action: "lead.assign", entity: "Lead", entityId: id, metadata: { to: targetId } });
  revalidatePath("/counselor/leads");
  revalidatePath("/counselor");
  return { ok: true };
}

export async function addLeadNote(id: string, note: string): Promise<CrmResult> {
  const actor = await requireCounselor();
  if (!actor) return { ok: false, error: "Not authorized" };
  const text = note.trim();
  if (!text) return { ok: false, error: "Empty note" };

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return { ok: false, error: "Not found" };
  const merged = [lead.notes, `• ${text}`].filter(Boolean).join("\n").slice(0, 2000);
  await db.lead.update({ where: { id }, data: { notes: merged } });
  revalidatePath("/counselor/leads");
  return { ok: true };
}

/** Admin: maintain partner-university agreement + commission. */
export async function upsertPartnerUniversity(
  universityId: string,
  input: { commissionRate?: number; contactEmail?: string; agreementNotes?: string },
): Promise<CrmResult> {
  const session = await auth();
  if (!session?.user || !hasAtLeast(session.user.role, "OPS_ADMIN")) return { ok: false, error: "Not authorized" };

  await db.partnerUniversity.upsert({
    where: { universityId },
    update: {
      commissionRate: input.commissionRate ?? null,
      contactEmail: input.contactEmail || null,
      agreementNotes: input.agreementNotes || null,
    },
    create: {
      universityId,
      commissionRate: input.commissionRate ?? null,
      contactEmail: input.contactEmail || null,
      agreementNotes: input.agreementNotes || null,
    },
  });
  await recordAudit({ actorId: session.user.id, action: "partner.upsert", entity: "PartnerUniversity", entityId: universityId });
  revalidatePath(`/admin/universities/${universityId}`);
  revalidatePath("/admin/analytics");
  return { ok: true };
}
