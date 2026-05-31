"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { DocumentType, VerificationStatus } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAtLeast } from "@/lib/rbac";
import { recordAudit } from "@/server/audit";
import { getStorageProvider } from "@/server/storage";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const VALID_TYPES = new Set(Object.values(DocumentType));

export type DocResult = { ok: boolean; error?: string };

/** Upload a document into the student's vault (FormData: file, type). */
export async function uploadDocument(formData: FormData): Promise<DocResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  const profile = await db.studentProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return { ok: false, error: "Create your profile first." };

  const file = formData.get("file");
  const typeStr = String(formData.get("type") ?? "");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a file to upload." };
  if (file.size > MAX_BYTES) return { ok: false, error: "File exceeds the 4 MB limit." };
  if (!VALID_TYPES.has(typeStr as DocumentType)) return { ok: false, error: "Invalid document type." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "document";
  const key = `${profile.id}/${randomUUID()}-${safeName}`;

  await getStorageProvider().put(key, buffer, file.type || "application/octet-stream");

  const version = (await db.document.count({ where: { studentProfileId: profile.id, type: typeStr as DocumentType } })) + 1;
  const doc = await db.document.create({
    data: {
      studentProfileId: profile.id,
      type: typeStr as DocumentType,
      fileName: safeName,
      storageKey: key,
      version,
      verification: VerificationStatus.PENDING,
    },
  });

  await recordAudit({ actorId: session.user.id, action: "document.upload", entity: "Document", entityId: doc.id, metadata: { type: typeStr } });
  revalidatePath("/student/documents");
  return { ok: true };
}

/** Delete a document (owner or admin). */
export async function deleteDocument(id: string): Promise<DocResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Not authenticated" };

  const doc = await db.document.findUnique({ where: { id }, include: { studentProfile: true } });
  if (!doc) return { ok: false, error: "Not found" };
  const isOwner = doc.studentProfile.userId === session.user.id;
  if (!isOwner && !hasAtLeast(session.user.role, "OPS_ADMIN")) return { ok: false, error: "Not authorized" };

  await getStorageProvider().delete(doc.storageKey);
  await db.document.delete({ where: { id } });
  await recordAudit({ actorId: session.user.id, action: "document.delete", entity: "Document", entityId: id });
  revalidatePath("/student/documents");
  return { ok: true };
}

/** Counselor/admin verifies (or rejects) a document. */
export async function setDocumentVerification(id: string, status: VerificationStatus): Promise<DocResult> {
  const session = await auth();
  if (!session?.user || !hasAtLeast(session.user.role, "COUNSELOR")) return { ok: false, error: "Not authorized" };

  await db.document.update({ where: { id }, data: { verification: status, verifiedById: session.user.id } });
  await recordAudit({ actorId: session.user.id, action: "document.verify", entity: "Document", entityId: id, metadata: { status } });
  revalidatePath("/student/documents");
  revalidatePath("/counselor");
  return { ok: true };
}
