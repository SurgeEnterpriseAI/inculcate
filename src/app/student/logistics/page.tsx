import { requireUser } from "@/server/guards";
import { db } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard/shell";
import { studentNav } from "@/components/dashboard/navs";
import { Card, CardContent } from "@/components/ui/card";
import { LogisticsModule, type LogiApp } from "@/components/student/logistics-module";

export default async function LogisticsPage() {
  const user = await requireUser();
  const profile = await db.studentProfile.findUnique({
    where: { userId: user.id },
    include: {
      applications: {
        orderBy: { createdAt: "desc" },
        include: { program: { include: { university: true } }, accommodationRequest: true, travelBooking: true },
      },
    },
  });

  if (!profile) {
    return (
      <DashboardShell user={user} nav={studentNav}>
        <Card><CardContent className="py-8 text-center text-sm text-[var(--muted)]">Create your profile first.</CardContent></Card>
      </DashboardShell>
    );
  }

  const apps: LogiApp[] = profile.applications.map((a) => ({
    applicationId: a.id,
    programName: a.program.name,
    university: a.program.university.name,
    uniCity: a.program.university.city,
    accommodation: a.accommodationRequest
      ? { type: a.accommodationRequest.type, budgetUsd: a.accommodationRequest.budgetUsd, city: a.accommodationRequest.city, status: a.accommodationRequest.status }
      : null,
    travel: a.travelBooking
      ? { fromCity: a.travelBooking.fromCity, toCity: a.travelBooking.toCity, departureDate: a.travelBooking.departureDate?.toISOString() ?? null, bookingRef: a.travelBooking.bookingRef }
      : null,
  }));

  return (
    <DashboardShell user={user} nav={studentNav}>
      <h1 className="text-xl font-semibold">Accommodation & travel</h1>
      <p className="mb-5 mt-1 text-sm text-[var(--muted)]">
        Request university or private accommodation and arrange travel. Booking integrations are stubbed for the demo.
      </p>
      <LogisticsModule apps={apps} />
    </DashboardShell>
  );
}
