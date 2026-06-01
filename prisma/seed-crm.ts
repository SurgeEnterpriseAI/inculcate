/**
 * Synthetic CRM data so the funnel & analytics are meaningful (no real PII).
 * Creates demo students with profiles, applications spread across the lifecycle,
 * leads in various stages, counselor assignments, and a few partner agreements.
 * Idempotent. Run: npm run db:seed:crm
 */
import { PrismaClient, ApplicationStatus, LeadStatus, DegreeLevel } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const NAMES = ["Isha Verma", "Rohan Mehta", "Sara Khan", "Arjun Rao", "Neha Gupta", "Vikram Singh", "Ananya Iyer", "Karan Patel", "Diya Shah", "Aditya Nair", "Meera Joshi", "Rahul Das", "Pooja Reddy", "Sahil Kapoor", "Tanvi Bose"];
const SUBJECTS = [["Computer Science", "AI"], ["Data Science"], ["Business Analytics"], ["Cybersecurity"], ["Mechanical Engineering", "Robotics"], ["Finance"], ["Public Health"], ["Electrical Engineering"]];
const COUNTRIES = [["United States", "Canada"], ["United Kingdom"], ["Germany", "Netherlands"], ["Australia"], ["Canada"], ["Singapore"]];

const APP_PLAN: ApplicationStatus[] = [
  "SHORTLISTED", "SHORTLISTED", "SHORTLISTED", "SHORTLISTED",
  "APPLYING", "APPLYING", "APPLYING",
  "SUBMITTED", "SUBMITTED",
  "OFFER", "OFFER",
  "ACCEPTED",
  "VISA",
  "ENROLLED",
  "REJECTED",
];
const LEAD_PLAN: (LeadStatus | null)[] = ["NEW", "CONTACTED", "QUALIFIED", "ASSIGNED", "CONVERTED", "LOST", "NEW", "ASSIGNED", "CONVERTED", null, null, null, null, null, null];

async function main() {
  const passwordHash = await bcrypt.hash("Passw0rd!", 10);
  const counselor = await prisma.user.findUnique({ where: { email: "counselor@inculcate.dev" } });
  const programs = await prisma.program.findMany({ orderBy: { name: "asc" }, take: 80 });
  if (programs.length === 0) throw new Error("Run db:seed:catalog first.");

  let students = 0, apps = 0, leads = 0, assigns = 0;

  for (let i = 0; i < NAMES.length; i++) {
    const email = `demo.student${i + 1}@inculcate.dev`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: NAMES[i], role: "STUDENT", passwordHash },
    });
    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        highestQualification: "B.Tech / B.Sc",
        gpa: 7 + ((i * 13) % 30) / 10,
        targetDegreeLevel: DegreeLevel.MASTERS,
        preferredSubjects: SUBJECTS[i % SUBJECTS.length],
        preferredCountries: COUNTRIES[i % COUNTRIES.length],
        budgetMinUsd: 15000,
        budgetMaxUsd: 35000 + (i % 5) * 5000,
        testScores: { ielts: 6.5 + (i % 3) * 0.5 },
        careerGoals: `Build a career in ${SUBJECTS[i % SUBJECTS.length].join(" / ")}.`,
        handedOff: LEAD_PLAN[i] === "ASSIGNED" || LEAD_PLAN[i] === "CONVERTED",
      },
    });
    students++;

    // Two applications: one progressed per the plan, one shortlisted.
    const p1 = programs[i % programs.length];
    const p2 = programs[(i + 20) % programs.length];
    for (const [p, status] of [[p1, APP_PLAN[i]], [p2, "SHORTLISTED" as ApplicationStatus]] as const) {
      const existing = await prisma.application.findUnique({ where: { studentProfileId_programId: { studentProfileId: profile.id, programId: p.id } } });
      if (!existing) {
        await prisma.application.create({
          data: {
            studentProfileId: profile.id,
            programId: p.id,
            status,
            submittedAt: ["SUBMITTED", "OFFER", "ACCEPTED", "VISA", "ENROLLED", "REJECTED"].includes(status) ? new Date() : null,
          },
        });
        apps++;
      }
    }

    // Lead per plan.
    const leadStatus = LEAD_PLAN[i];
    if (leadStatus) {
      const has = await prisma.lead.findFirst({ where: { studentProfileId: profile.id } });
      if (!has) {
        const assignedTo = (leadStatus === "ASSIGNED" || leadStatus === "CONVERTED") && counselor ? counselor.id : null;
        await prisma.lead.create({
          data: {
            studentProfileId: profile.id,
            source: i % 2 === 0 ? "ai-counselor-handoff" : "website",
            status: leadStatus,
            assignedTo,
            notes: "Synthetic demo lead.",
          },
        });
        leads++;
        if (assignedTo) {
          await prisma.counselorAssignment.upsert({
            where: { counselorId_studentProfileId: { counselorId: assignedTo, studentProfileId: profile.id } },
            update: { active: true },
            create: { counselorId: assignedTo, studentProfileId: profile.id },
          });
          assigns++;
        }
      }
    }
  }

  // Partner agreements on a few universities.
  const someUnis = await prisma.university.findMany({ orderBy: { worldRanking: "asc" }, take: 6 });
  const rates = [12, 15, 10, 18, 8, 20];
  for (let i = 0; i < someUnis.length; i++) {
    await prisma.partnerUniversity.upsert({
      where: { universityId: someUnis[i].id },
      update: { commissionRate: rates[i] },
      create: { universityId: someUnis[i].id, commissionRate: rates[i], contactEmail: `partners@${someUnis[i].name.toLowerCase().replace(/[^a-z]+/g, "")}.edu` },
    });
  }

  console.log(`✅ CRM seed: ${students} students, +${apps} applications, +${leads} leads, +${assigns} assignments, ${someUnis.length} partners.`);
  console.log(`   Demo student logins: demo.student1..${NAMES.length}@inculcate.dev / Passw0rd!`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
