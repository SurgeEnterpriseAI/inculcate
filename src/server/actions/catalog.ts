"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAtLeast } from "@/lib/rbac";
import { recordAudit } from "@/server/audit";
import { universitySchema, programSchema, scholarshipSchema } from "@/lib/validation/catalog";

export type ActionResult = { ok: boolean; error?: string; issues?: Record<string, string[] | undefined>; id?: string };

/** Authorize an OPS_ADMIN+ actor for a mutating catalog action. */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user || !hasAtLeast(session.user.role, "OPS_ADMIN")) return null;
  return session.user;
}

// ── Universities ──────────────────────────────────────────────────────

export async function createUniversity(input: unknown): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Not authorized" };
  const parsed = universitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Validation failed", issues: parsed.error.flatten().fieldErrors };

  try {
    const uni = await db.university.create({ data: parsed.data });
    await recordAudit({ actorId: actor.id, action: "university.create", entity: "University", entityId: uni.id, metadata: { name: uni.name } });
    revalidatePath("/admin/universities");
    return { ok: true, id: uni.id };
  } catch (e) {
    return { ok: false, error: "A university with this name + country may already exist." };
  }
}

export async function updateUniversity(id: string, input: unknown): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Not authorized" };
  const parsed = universitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Validation failed", issues: parsed.error.flatten().fieldErrors };

  await db.university.update({ where: { id }, data: parsed.data });
  await recordAudit({ actorId: actor.id, action: "university.update", entity: "University", entityId: id });
  revalidatePath("/admin/universities");
  revalidatePath(`/admin/universities/${id}`);
  return { ok: true, id };
}

export async function deleteUniversity(id: string): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Not authorized" };
  await db.university.delete({ where: { id } });
  await recordAudit({ actorId: actor.id, action: "university.delete", entity: "University", entityId: id });
  revalidatePath("/admin/universities");
  redirect("/admin/universities");
}

// ── Programs ──────────────────────────────────────────────────────────

export async function createProgram(universityId: string, input: unknown): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Not authorized" };
  const parsed = programSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Validation failed", issues: parsed.error.flatten().fieldErrors };

  const prog = await db.program.create({ data: { ...parsed.data, universityId } });
  await recordAudit({ actorId: actor.id, action: "program.create", entity: "Program", entityId: prog.id, metadata: { universityId } });
  revalidatePath(`/admin/universities/${universityId}`);
  return { ok: true, id: prog.id };
}

export async function deleteProgram(id: string, universityId: string): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Not authorized" };
  await db.program.delete({ where: { id } });
  await recordAudit({ actorId: actor.id, action: "program.delete", entity: "Program", entityId: id });
  revalidatePath(`/admin/universities/${universityId}`);
  return { ok: true };
}

// ── Scholarships ──────────────────────────────────────────────────────

export async function createScholarship(universityId: string, input: unknown): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Not authorized" };
  const parsed = scholarshipSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Validation failed", issues: parsed.error.flatten().fieldErrors };

  const sch = await db.scholarship.create({ data: { ...parsed.data, universityId } });
  await recordAudit({ actorId: actor.id, action: "scholarship.create", entity: "Scholarship", entityId: sch.id });
  revalidatePath(`/admin/universities/${universityId}`);
  return { ok: true, id: sch.id };
}

export async function deleteScholarship(id: string, universityId: string): Promise<ActionResult> {
  const actor = await requireAdmin();
  if (!actor) return { ok: false, error: "Not authorized" };
  await db.scholarship.delete({ where: { id } });
  await recordAudit({ actorId: actor.id, action: "scholarship.delete", entity: "Scholarship", entityId: id });
  revalidatePath(`/admin/universities/${universityId}`);
  return { ok: true };
}
