import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validation/auth";
import { recordAudit } from "@/server/audit";

/**
 * Public self-registration — always creates a STUDENT.
 * Counselor/admin accounts are provisioned by a Super Admin (later epic),
 * never via this endpoint, so role can't be escalated from the client.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: Role.STUDENT,
      studentProfile: { create: {} }, // empty profile; wizard fills it (Epic 2)
    },
  });

  await recordAudit({
    actorId: user.id,
    action: "user.register",
    entity: "User",
    entityId: user.id,
    metadata: { role: Role.STUDENT },
    ipAddress: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
}
