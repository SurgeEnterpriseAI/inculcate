"use server";

import { revalidatePath } from "next/cache";
import { TaskStatus } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAtLeast } from "@/lib/rbac";
import { recordAudit } from "@/server/audit";

export type FinanceResult = { ok: boolean; error?: string };

export async function createLoanCase(input: { amountUsd?: number; partner?: string; notes?: string }): Promise<FinanceResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };
  const profile = await db.studentProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return { ok: false, error: "Create your profile first." };

  await db.loanCase.create({
    data: {
      studentProfileId: profile.id,
      amountUsd: input.amountUsd && input.amountUsd > 0 ? Math.round(input.amountUsd) : null,
      partner: input.partner?.slice(0, 120) || null,
      notes: input.notes?.slice(0, 500) || null,
      status: TaskStatus.TODO,
    },
  });
  await recordAudit({ actorId: session.user.id, action: "loan.create", entity: "LoanCase" });
  revalidatePath("/student/finance");
  return { ok: true };
}

export async function updateLoanStatus(id: string, status: TaskStatus): Promise<FinanceResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };
  const loan = await db.loanCase.findUnique({ where: { id }, include: { studentProfile: true } });
  if (!loan) return { ok: false, error: "Not found" };
  const isOwner = loan.studentProfile.userId === session.user.id;
  if (!isOwner && !hasAtLeast(session.user.role, "COUNSELOR")) return { ok: false, error: "Not authorized" };

  await db.loanCase.update({ where: { id }, data: { status } });
  revalidatePath("/student/finance");
  return { ok: true };
}
