"use server";

import { revalidatePath } from "next/cache";
import { LeadStatus, MessageRole, NotificationChannel, Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { recordAudit } from "@/server/audit";
import { buildProfileCtx, getCounselorProvider, type ChatTurn, type CounselorReply } from "@/server/ai/counselor";

export interface SendResult {
  ok: boolean;
  error?: string;
  conversationId?: string;
  reply?: CounselorReply;
}

/** Send a message to the AI counselor; persists both turns and returns the reply. */
export async function sendMessage(conversationId: string | null, text: string): Promise<SendResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };
  const message = text.trim();
  if (!message) return { ok: false, error: "Empty message" };
  if (message.length > 2000) return { ok: false, error: "Message too long" };

  const profile = await db.studentProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return { ok: false, error: "Create your profile first." };

  // Resolve or create the conversation (must belong to this student).
  let convo = conversationId
    ? await db.conversation.findFirst({ where: { id: conversationId, studentProfileId: profile.id } })
    : null;
  if (!convo) convo = await db.conversation.create({ data: { studentProfileId: profile.id } });

  await db.chatMessage.create({ data: { conversationId: convo.id, role: MessageRole.USER, content: message } });

  const history: ChatTurn[] = (
    await db.chatMessage.findMany({
      where: { conversationId: convo.id },
      orderBy: { createdAt: "asc" },
      take: 20,
    })
  ).map((m) => ({ role: m.role, content: m.content }));

  const reply = await getCounselorProvider().respond({
    profile: buildProfileCtx(profile),
    history,
    message,
  });

  await db.chatMessage.create({
    data: {
      conversationId: convo.id,
      role: MessageRole.ASSISTANT,
      content: reply.content,
      metadata: {
        suggestedProgramIds: reply.suggestions.map((s) => s.programId),
        offerHandoff: reply.offerHandoff,
      } as Prisma.InputJsonValue,
    },
  });
  await db.conversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } });

  return { ok: true, conversationId: convo.id, reply };
}

/** Hand off to a human: create a Lead, notify counselor(s), mark the profile. */
export async function requestHumanHandoff(): Promise<{ ok: boolean; error?: string; message?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  const profile = await db.studentProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return { ok: false, error: "Create your profile first." };

  // Prefer an already-assigned counselor; otherwise notify all counselors.
  const assignments = await db.counselorAssignment.findMany({ where: { studentProfileId: profile.id, active: true } });
  const counselorIds = assignments.length
    ? assignments.map((a) => a.counselorId)
    : (await db.user.findMany({ where: { role: "COUNSELOR", isActive: true }, select: { id: true } })).map((u) => u.id);

  const lead = await db.lead.create({
    data: {
      studentProfileId: profile.id,
      source: "ai-counselor-handoff",
      status: LeadStatus.NEW,
      assignedTo: assignments[0]?.counselorId ?? null,
      notes: "Student requested human help from the AI counselor chat.",
    },
  });

  await db.studentProfile.update({ where: { id: profile.id }, data: { handedOff: true } });

  if (counselorIds.length) {
    await db.notification.createMany({
      data: counselorIds.map((userId) => ({
        userId,
        channel: NotificationChannel.IN_APP,
        title: "New student handoff",
        body: `${session.user.name ?? session.user.email} requested human help (lead ${lead.id}).`,
      })),
    });
  }

  await recordAudit({ actorId: session.user.id, action: "lead.handoff", entity: "Lead", entityId: lead.id });
  revalidatePath("/counselor");
  revalidatePath("/student");

  return { ok: true, message: "A counselor has been notified and will pick up your case shortly." };
}
