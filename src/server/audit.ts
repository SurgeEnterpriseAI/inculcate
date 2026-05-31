import { db } from "@/lib/db";

/**
 * Append-only audit log for privileged actions (rule: audit logging on
 * counselor/admin actions). Never throws into the caller's happy path —
 * a failed audit write is logged but does not break the action.
 */
export async function recordAudit(input: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata: (input.metadata as object) ?? undefined,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", { action: input.action, err });
  }
}
