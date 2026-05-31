/**
 * Seed data so every module is demoable (rule #4).
 * Creates one user per role, a sample student profile, and a few
 * universities / programs / scholarships across countries.
 *
 * Run: npm run db:seed
 */
import { PrismaClient, Role, DegreeLevel } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Passw0rd!";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ── Users (one per role) ──────────────────────────────────────────
  const [student, counselor, ops, superAdmin] = await Promise.all([
    prisma.user.upsert({
      where: { email: "student@inculcate.dev" },
      update: {},
      create: { email: "student@inculcate.dev", name: "Aarav Sharma", role: Role.STUDENT, passwordHash },
    }),
    prisma.user.upsert({
      where: { email: "counselor@inculcate.dev" },
      update: {},
      create: { email: "counselor@inculcate.dev", name: "Priya Nair", role: Role.COUNSELOR, passwordHash },
    }),
    prisma.user.upsert({
      where: { email: "ops@inculcate.dev" },
      update: {},
      create: { email: "ops@inculcate.dev", name: "Ravi Kumar", role: Role.OPS_ADMIN, passwordHash },
    }),
    prisma.user.upsert({
      where: { email: "admin@inculcate.dev" },
      update: {},
      create: { email: "admin@inculcate.dev", name: "Super Admin", role: Role.SUPER_ADMIN, passwordHash },
    }),
  ]);

  // ── Student profile ───────────────────────────────────────────────
  await prisma.studentProfile.upsert({
    where: { userId: student.id },
    update: {},
    create: {
      userId: student.id,
      highestQualification: "B.Tech Computer Science",
      gpa: 8.4,
      percentage: 84,
      testScores: { ielts: 7.5, gre: 320 },
      targetDegreeLevel: DegreeLevel.MASTERS,
      preferredCountries: ["United States", "Canada", "Germany"],
      preferredSubjects: ["Computer Science", "Data Science", "AI"],
      budgetMinUsd: 20000,
      budgetMaxUsd: 50000,
      workExperienceYears: 2,
      languages: ["English", "Hindi", "Telugu"],
      careerGoals: "Machine learning engineer at a product company.",
    },
  });

  // ── Universities + programs + scholarships ────────────────────────
  const universities = [
    {
      name: "University of Toronto",
      country: "Canada",
      city: "Toronto",
      worldRanking: 21,
      accreditations: ["AACSB"],
      website: "https://utoronto.ca",
      programs: [
        {
          name: "MSc Computer Science",
          degreeLevel: DegreeLevel.MASTERS,
          specialization: "Artificial Intelligence",
          tuitionFeeUsd: 42000,
          durationMonths: 24,
          intakeDates: ["Sep 2026"],
          eligibility: "Bachelor's in CS, GPA 8.0+, IELTS 7.0",
          languageRequirements: "IELTS 7.0 / TOEFL 100",
        },
      ],
    },
    {
      name: "Technical University of Munich",
      country: "Germany",
      city: "Munich",
      worldRanking: 37,
      accreditations: ["ASIIN"],
      website: "https://www.tum.de",
      programs: [
        {
          name: "MSc Data Engineering and Analytics",
          degreeLevel: DegreeLevel.MASTERS,
          specialization: "Data Science",
          tuitionFeeUsd: 3000,
          durationMonths: 24,
          intakeDates: ["Oct 2026"],
          eligibility: "Bachelor's in CS/Math, IELTS 6.5",
          languageRequirements: "IELTS 6.5 / TOEFL 88",
        },
      ],
    },
    {
      name: "Carnegie Mellon University",
      country: "United States",
      city: "Pittsburgh",
      worldRanking: 52,
      accreditations: ["ABET"],
      website: "https://www.cmu.edu",
      programs: [
        {
          name: "MS in Machine Learning",
          degreeLevel: DegreeLevel.MASTERS,
          specialization: "Machine Learning",
          tuitionFeeUsd: 49000,
          durationMonths: 20,
          intakeDates: ["Aug 2026"],
          eligibility: "Bachelor's in CS/Stats, strong math, GRE recommended",
          languageRequirements: "TOEFL 100 / IELTS 7.5",
        },
      ],
    },
  ];

  for (const u of universities) {
    const { programs, ...uni } = u;
    const university = await prisma.university.upsert({
      where: { name_country: { name: uni.name, country: uni.country } },
      update: {},
      create: uni,
    });

    for (const p of programs) {
      const program = await prisma.program.findFirst({
        where: { universityId: university.id, name: p.name },
      });
      if (!program) {
        const created = await prisma.program.create({
          data: { ...p, universityId: university.id },
        });
        await prisma.scholarship.create({
          data: {
            name: `${uni.name} Merit Scholarship`,
            scope: "program",
            country: uni.country,
            universityId: university.id,
            programId: created.id,
            eligibility: "Top 10% applicants, GPA 8.5+",
            amountUsd: 10000,
          },
        });
      }
    }
  }

  // ── Assign the demo student to the demo counselor ─────────────────
  const profile = await prisma.studentProfile.findUnique({ where: { userId: student.id } });
  if (profile) {
    await prisma.counselorAssignment.upsert({
      where: { counselorId_studentProfileId: { counselorId: counselor.id, studentProfileId: profile.id } },
      update: {},
      create: { counselorId: counselor.id, studentProfileId: profile.id },
    });
  }

  console.log("✅ Seed complete.");
  console.log("   Demo logins (password for all: %s):", DEMO_PASSWORD);
  console.log("   • student@inculcate.dev    (Student)");
  console.log("   • counselor@inculcate.dev  (Counselor)");
  console.log("   • ops@inculcate.dev        (Ops Admin)");
  console.log("   • admin@inculcate.dev      (Super Admin)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
