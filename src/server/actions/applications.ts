"use server";

import { revalidatePath } from "next/cache";
import { ApplicationStatus } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canTransition } from "@/lib/application-status";
import { recordAudit } from "@/server/audit";

export type AppResult = { ok: boolean; error?: string };

/** Move an application along its lifecycle, enforcing allowed transitions + role. */
export async function updateApplicationStatus(id: string, to: ApplicationStatus): Promise<AppResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  const app = await db.application.findUnique({ where: { id }, include: { studentProfile: true } });
  if (!app) return { ok: false, error: "Not found" };

  const isOwner = app.studentProfile.userId === session.user.id;
  // Students can only touch their own applications; staff can touch any.
  if (session.user.role === "STUDENT" && !isOwner) return { ok: false, error: "Not authorized" };
  if (!canTransition(session.user.role, app.status, to, isOwner)) {
    return { ok: false, error: `Cannot move from ${app.status} to ${to}.` };
  }

  await db.application.update({
    where: { id },
    data: {
      status: to,
      submittedAt: to === "SUBMITTED" ? new Date() : app.submittedAt,
      decisionAt: to === "OFFER" || to === "REJECTED" ? new Date() : app.decisionAt,
    },
  });

  await recordAudit({ actorId: session.user.id, action: "application.status", entity: "Application", entityId: id, metadata: { from: app.status, to } });
  revalidatePath("/student/applications");
  revalidatePath("/counselor/applications");
  revalidatePath("/student");
  revalidatePath("/counselor");
  return { ok: true };
}
