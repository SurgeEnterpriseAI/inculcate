import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAtLeast } from "@/lib/rbac";
import { getStorageProvider } from "@/server/storage";

/** Stream a vault document to its owner (or a counselor/admin). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const doc = await db.document.findUnique({ where: { id }, include: { studentProfile: true } });
  if (!doc) return new Response("Not found", { status: 404 });

  const isOwner = doc.studentProfile.userId === session.user.id;
  if (!isOwner && !hasAtLeast(session.user.role, "COUNSELOR")) return new Response("Forbidden", { status: 403 });

  const obj = await getStorageProvider().get(doc.storageKey);
  if (!obj) return new Response("File missing", { status: 404 });

  return new Response(new Uint8Array(obj.data), {
    headers: {
      "Content-Type": obj.mimeType,
      "Content-Disposition": `inline; filename="${doc.fileName}"`,
      "Content-Length": String(obj.size),
      "Cache-Control": "private, no-store",
    },
  });
}
