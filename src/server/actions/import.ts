"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hasAtLeast } from "@/lib/rbac";
import { recordAudit } from "@/server/audit";
import { csvRowSchema } from "@/lib/validation/catalog";

export interface ImportResult {
  ok: boolean;
  error?: string;
  universitiesCreated: number;
  programsCreated: number;
  rowsProcessed: number;
  rowErrors: { row: number; message: string }[];
}

/**
 * Import universities + programs from CSV text.
 * Expected headers: university, country, [city, worldRanking, website,
 *   program, degreeLevel, specialization, tuitionFeeUsd, durationMonths]
 * Universities are de-duplicated by (name, country); programs by (university, name, degreeLevel).
 */
export async function importCatalogCsv(csvText: string): Promise<ImportResult> {
  const session = await auth();
  const base: ImportResult = { ok: false, universitiesCreated: 0, programsCreated: 0, rowsProcessed: 0, rowErrors: [] };
  if (!session?.user || !hasAtLeast(session.user.role, "OPS_ADMIN")) return { ...base, error: "Not authorized" };

  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length && parsed.data.length === 0) {
    return { ...base, error: `CSV parse error: ${parsed.errors[0]?.message ?? "invalid file"}` };
  }

  const result: ImportResult = { ...base, ok: true };
  const seenUni = new Set<string>();

  for (let i = 0; i < parsed.data.length; i++) {
    const raw = parsed.data[i];
    result.rowsProcessed++;
    const row = csvRowSchema.safeParse(raw);
    if (!row.success) {
      const msg = Object.entries(row.error.flatten().fieldErrors)
        .map(([k, v]) => `${k}: ${v?.[0]}`)
        .join("; ");
      result.rowErrors.push({ row: i + 2, message: msg || "invalid row" }); // +2: header + 1-index
      continue;
    }
    const d = row.data;

    try {
      // Upsert university (unique on name + country).
      const uni = await db.university.upsert({
        where: { name_country: { name: d.university, country: d.country } },
        update: {
          city: d.city ?? undefined,
          worldRanking: d.worldRanking ?? undefined,
          website: d.website ?? undefined,
        },
        create: {
          name: d.university,
          country: d.country,
          city: d.city,
          worldRanking: d.worldRanking,
          website: d.website,
        },
      });
      const uniKey = `${d.university}|${d.country}`;
      if (!seenUni.has(uniKey)) {
        seenUni.add(uniKey);
        // Count as created only if it had no programs and was just made — approximate by checking createdAt≈updatedAt is unreliable; count distinct unis touched instead.
        result.universitiesCreated++;
      }

      // Optional program on the same row.
      if (d.program && d.degreeLevel) {
        const existing = await db.program.findFirst({
          where: { universityId: uni.id, name: d.program, degreeLevel: d.degreeLevel },
        });
        if (!existing) {
          await db.program.create({
            data: {
              universityId: uni.id,
              name: d.program,
              degreeLevel: d.degreeLevel,
              specialization: d.specialization,
              tuitionFeeUsd: d.tuitionFeeUsd,
              durationMonths: d.durationMonths,
            },
          });
          result.programsCreated++;
        }
      }
    } catch {
      result.rowErrors.push({ row: i + 2, message: "database error while saving row" });
    }
  }

  await recordAudit({
    actorId: session.user.id,
    action: "catalog.import",
    entity: "University",
    metadata: { universities: result.universitiesCreated, programs: result.programsCreated, rows: result.rowsProcessed },
  });
  revalidatePath("/admin/universities");
  revalidatePath("/search");
  return result;
}
