"use server";

import { revalidatePath } from "next/cache";
import { AccommodationType, TaskStatus } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAtLeast } from "@/lib/rbac";
import { recordAudit } from "@/server/audit";
import { getFlightProvider } from "@/server/integrations/flights";

export type LogiResult = { ok: boolean; error?: string };

async function authorizeApp(applicationId: string) {
  const session = await auth();
  if (!session?.user) return null;
  const app = await db.application.findUnique({ where: { id: applicationId }, include: { studentProfile: true } });
  if (!app) return null;
  const isOwner = app.studentProfile.userId === session.user.id;
  if (!isOwner && !hasAtLeast(session.user.role, "COUNSELOR")) return null;
  return { session, app };
}

export async function upsertAccommodation(
  applicationId: string,
  input: { type: AccommodationType; budgetUsd?: number; city?: string },
): Promise<LogiResult> {
  const ctx = await authorizeApp(applicationId);
  if (!ctx) return { ok: false, error: "Not authorized" };

  await db.accommodationRequest.upsert({
    where: { applicationId },
    update: { type: input.type, budgetUsd: input.budgetUsd ?? null, city: input.city || null },
    create: { applicationId, type: input.type, budgetUsd: input.budgetUsd ?? null, city: input.city || null, status: TaskStatus.TODO },
  });
  await recordAudit({ actorId: ctx.session.user.id, action: "accommodation.upsert", entity: "AccommodationRequest", entityId: applicationId });
  revalidatePath("/student/logistics");
  return { ok: true };
}

export async function bookTravel(
  applicationId: string,
  input: { fromCity: string; toCity: string; departureDate: string },
): Promise<LogiResult> {
  const ctx = await authorizeApp(applicationId);
  if (!ctx) return { ok: false, error: "Not authorized" };
  if (!input.fromCity.trim() || !input.toCity.trim() || !input.departureDate) return { ok: false, error: "Fill all travel fields." };

  const booking = await getFlightProvider().book(input);
  const dep = new Date(input.departureDate);

  await db.travelBooking.upsert({
    where: { applicationId },
    update: { fromCity: input.fromCity, toCity: input.toCity, departureDate: dep, bookingRef: booking.bookingRef, status: TaskStatus.DONE },
    create: { applicationId, fromCity: input.fromCity, toCity: input.toCity, departureDate: dep, bookingRef: booking.bookingRef, status: TaskStatus.DONE },
  });
  await recordAudit({ actorId: ctx.session.user.id, action: "travel.book", entity: "TravelBooking", entityId: applicationId, metadata: { bookingRef: booking.bookingRef } });
  revalidatePath("/student/logistics");
  return { ok: true };
}
