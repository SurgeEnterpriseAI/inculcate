import { Role } from "@prisma/client";
import { requireRole } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";
import { counselorNav } from "@/components/dashboard/navs";
import { TaskQueue, type TaskView } from "@/components/counselor/task-queue";

export default async function TasksPage() {
  const user = await requireRole(Role.COUNSELOR);
  const tasks = await db.task.findMany({
    where: { assigneeId: user.id },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  const view: TaskView[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
  }));

  return (
    <DashboardShell user={user} nav={counselorNav}>
      <h1 className="text-xl font-semibold">Task queue</h1>
      <p className="mb-5 mt-1 text-sm text-[var(--muted)]">Your Phase-2 work items — document collection, follow-ups, submissions.</p>
      <TaskQueue tasks={view} />
    </DashboardShell>
  );
}
