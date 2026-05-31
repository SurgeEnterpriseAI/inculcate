import { requireUser } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";
import { studentNav } from "@/components/dashboard/navs";
import { Card, CardContent } from "@/components/ui/card";
import { CounselorChat } from "@/components/student/counselor-chat";

export default async function CounselorChatPage() {
  const user = await requireUser();
  const profile = await db.studentProfile.findUnique({
    where: { userId: user.id },
    include: { conversations: { orderBy: { updatedAt: "desc" }, take: 1, include: { messages: { orderBy: { createdAt: "asc" } } } } },
  });

  if (!profile) {
    return (
      <DashboardShell user={user} nav={studentNav}>
        <Card><CardContent className="py-8 text-center text-sm text-[var(--muted)]">Create your profile first to chat with the AI counselor.</CardContent></Card>
      </DashboardShell>
    );
  }

  const convo = profile.conversations[0] ?? null;
  const initialMessages = (convo?.messages ?? []).map((m) => ({ role: m.role, content: m.content }));

  return (
    <DashboardShell user={user} nav={studentNav}>
      <h1 className="text-xl font-semibold">AI Counselor</h1>
      <p className="mb-5 mt-1 text-sm text-[var(--muted)]">
        Profile-aware guidance grounded in our catalog. When you’re ready, hand off to a human counselor for Phase 2.
      </p>
      <CounselorChat initialMessages={initialMessages} conversationId={convo?.id ?? null} alreadyHandedOff={profile.handedOff} />
    </DashboardShell>
  );
}
