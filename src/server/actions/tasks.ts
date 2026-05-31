"use server";

import { revalidatePath } from "next/cache";
import { TaskStatus } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAtLeast } from "@/lib/rbac";
import { recordAudit } from "@/server/audit";

export type TaskResult = { ok: boolean; error?: string };

/** Create a task in the counselor's queue (assigned to self by default). */
export async function createTask(input: { title: string; description?: string; dueDate?: string }): Promise<TaskResult> {
  const session = await auth();
  if (!session?.user || !hasAtLeast(session.user.role, "COUNSELOR")) return { ok: false, error: "Not authorized" };

  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Title is required." };

  const due = input.dueDate ? new Date(input.dueDate) : null;
  const task = await db.task.create({
    data: {
      title: title.slice(0, 160),
      description: input.description?.slice(0, 1000) || null,
      assigneeId: session.user.id,
      dueDate: due && !Number.isNaN(due.getTime()) ? due : null,
      status: TaskStatus.TODO,
    },
  });

  await recordAudit({ actorId: session.user.id, action: "task.create", entity: "Task", entityId: task.id });
  revalidatePath("/counselor/tasks");
  revalidatePath("/counselor");
  return { ok: true };
}

/** Update a task's status (owner or admin). */
export async function updateTaskStatus(id: string, status: TaskStatus): Promise<TaskResult> {
  const session = await auth();
  if (!session?.user || !hasAtLeast(session.user.role, "COUNSELOR")) return { ok: false, error: "Not authorized" };

  const task = await db.task.findUnique({ where: { id } });
  if (!task) return { ok: false, error: "Not found" };
  if (task.assigneeId !== session.user.id && !hasAtLeast(session.user.role, "OPS_ADMIN")) return { ok: false, error: "Not authorized" };

  await db.task.update({ where: { id }, data: { status } });
  await recordAudit({ actorId: session.user.id, action: "task.status", entity: "Task", entityId: id, metadata: { status } });
  revalidatePath("/counselor/tasks");
  revalidatePath("/counselor");
  return { ok: true };
}
