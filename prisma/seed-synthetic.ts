/**
 * Synthetic catalog generator + embedding backfill (no external APIs).
 * Idempotent: universities are upserted by (name, country); programs created
 * if absent. Also backfills embeddings for ANY program missing one (covers
 * data created before Epic 3). Run: npm run db:seed:catalog
 */
import { PrismaClient, DegreeLevel } from "@prisma/client";
import { embedText, programText } from "../src/server/ai/embedding";

const prisma = new PrismaClient();

// Country → annual-tuition multiplier (rough, for synthetic realism).
const TIER: Record<string, number> = {
  "United States": 1.5, "United Kingdom": 1.2, Canada: 1.0, Australia: 1.1,
  Singapore: 1.1, Switzerland: 0.4, Germany: 0.1, Netherlands: 0.5, Ireland: 0.7,
  France: 0.4, Sweden: 0.3, "New Zealand": 0.9, Italy: 0.3, Spain: 0.3, "United Arab Emirates": 0.8, Japan: 0.5,
};

const UNIS: { name: string; country: string; city: string; worldRanking: number; website: string }[] = [
  { name: "Stanford University", country: "United States", city: "Stanford", worldRanking: 3, website: "https://stanford.edu" },
  { name: "Massachusetts Institute of Technology", country: "United States", city: "Cambridge", worldRanking: 1, website: "https://mit.edu" },
  { name: "University of California, Berkeley", country: "United States", city: "Berkeley", worldRanking: 10, website: "https://berkeley.edu" },
  { name: "Georgia Institute of Technology", country: "United States", city: "Atlanta", worldRanking: 44, website: "https://gatech.edu" },
  { name: "University of Texas at Austin", country: "United States", city: "Austin", worldRanking: 58, website: "https://utexas.edu" },
  { name: "Purdue University", country: "United States", city: "West Lafayette", worldRanking: 89, website: "https://purdue.edu" },
  { name: "University of Oxford", country: "United Kingdom", city: "Oxford", worldRanking: 4, website: "https://ox.ac.uk" },
  { name: "Imperial College London", country: "United Kingdom", city: "London", worldRanking: 6, website: "https://imperial.ac.uk" },
  { name: "University of Edinburgh", country: "United Kingdom", city: "Edinburgh", worldRanking: 22, website: "https://ed.ac.uk" },
  { name: "University of Manchester", country: "United Kingdom", city: "Manchester", worldRanking: 32, website: "https://manchester.ac.uk" },
  { name: "University of British Columbia", country: "Canada", city: "Vancouver", worldRanking: 34, website: "https://ubc.ca" },
  { name: "McGill University", country: "Canada", city: "Montreal", worldRanking: 30, website: "https://mcgill.ca" },
  { name: "University of Waterloo", country: "Canada", city: "Waterloo", worldRanking: 112, website: "https://uwaterloo.ca" },
  { name: "University of Sydney", country: "Australia", city: "Sydney", worldRanking: 19, website: "https://sydney.edu.au" },
  { name: "Australian National University", country: "Australia", city: "Canberra", worldRanking: 30, website: "https://anu.edu.au" },
  { name: "University of Queensland", country: "Australia", city: "Brisbane", worldRanking: 40, website: "https://uq.edu.au" },
  { name: "National University of Singapore", country: "Singapore", city: "Singapore", worldRanking: 8, website: "https://nus.edu.sg" },
  { name: "Nanyang Technological University", country: "Singapore", city: "Singapore", worldRanking: 26, website: "https://ntu.edu.sg" },
  { name: "EPFL", country: "Switzerland", city: "Lausanne", worldRanking: 14, website: "https://epfl.ch" },
  { name: "RWTH Aachen University", country: "Germany", city: "Aachen", worldRanking: 99, website: "https://rwth-aachen.de" },
  { name: "Technical University of Berlin", country: "Germany", city: "Berlin", worldRanking: 154, website: "https://tu.berlin" },
  { name: "Delft University of Technology", country: "Netherlands", city: "Delft", worldRanking: 47, website: "https://tudelft.nl" },
  { name: "University of Amsterdam", country: "Netherlands", city: "Amsterdam", worldRanking: 53, website: "https://uva.nl" },
  { name: "Trinity College Dublin", country: "Ireland", city: "Dublin", worldRanking: 87, website: "https://tcd.ie" },
  { name: "Université PSL", country: "France", city: "Paris", worldRanking: 24, website: "https://psl.eu" },
  { name: "KTH Royal Institute of Technology", country: "Sweden", city: "Stockholm", worldRanking: 73, website: "https://kth.se" },
  { name: "University of Auckland", country: "New Zealand", city: "Auckland", worldRanking: 65, website: "https://auckland.ac.nz" },
  { name: "Politecnico di Milano", country: "Italy", city: "Milan", worldRanking: 111, website: "https://polimi.it" },
  { name: "Universitat de Barcelona", country: "Spain", city: "Barcelona", worldRanking: 164, website: "https://ub.edu" },
  { name: "Khalifa University", country: "United Arab Emirates", city: "Abu Dhabi", worldRanking: 230, website: "https://ku.ac.ae" },
  { name: "University of Tokyo", country: "Japan", city: "Tokyo", worldRanking: 28, website: "https://u-tokyo.ac.jp" },
];

// Program tracks (specialization-level granularity). baseFee = annual USD before tier multiplier.
const TRACKS: { name: string; degreeLevel: DegreeLevel; specialization: string; baseFee: number; eligibility: string }[] = [
  { name: "MS Computer Science", degreeLevel: DegreeLevel.MASTERS, specialization: "Artificial Intelligence", baseFee: 40000, eligibility: "Bachelor's in CS/related, GPA 8.0+, strong programming" },
  { name: "MS Data Science", degreeLevel: DegreeLevel.MASTERS, specialization: "Data Science", baseFee: 38000, eligibility: "Bachelor's with statistics/math, GPA 7.5+" },
  { name: "MS Machine Learning", degreeLevel: DegreeLevel.MASTERS, specialization: "Machine Learning", baseFee: 42000, eligibility: "Quantitative bachelor's, GRE recommended" },
  { name: "MS Cybersecurity", degreeLevel: DegreeLevel.MASTERS, specialization: "Cybersecurity", baseFee: 37000, eligibility: "Bachelor's in CS/IT, networking fundamentals" },
  { name: "MS Information Technology", degreeLevel: DegreeLevel.MASTERS, specialization: "Software Engineering", baseFee: 35000, eligibility: "Bachelor's in computing or equivalent experience" },
  { name: "MBA", degreeLevel: DegreeLevel.MBA, specialization: "General Management", baseFee: 60000, eligibility: "Bachelor's, 2+ years work experience, GMAT/GRE" },
  { name: "MS Business Analytics", degreeLevel: DegreeLevel.MASTERS, specialization: "Business Analytics", baseFee: 45000, eligibility: "Bachelor's, quantitative aptitude" },
  { name: "MS Mechanical Engineering", degreeLevel: DegreeLevel.MASTERS, specialization: "Robotics", baseFee: 36000, eligibility: "Bachelor's in mechanical/related engineering" },
  { name: "MS Electrical Engineering", degreeLevel: DegreeLevel.MASTERS, specialization: "Embedded Systems", baseFee: 36000, eligibility: "Bachelor's in EE/ECE" },
  { name: "MS Public Health", degreeLevel: DegreeLevel.MASTERS, specialization: "Epidemiology", baseFee: 33000, eligibility: "Bachelor's in life sciences/health" },
  { name: "MS Finance", degreeLevel: DegreeLevel.MASTERS, specialization: "Quantitative Finance", baseFee: 48000, eligibility: "Bachelor's, strong mathematics" },
  { name: "PhD Computer Science", degreeLevel: DegreeLevel.PHD, specialization: "Machine Learning", baseFee: 5000, eligibility: "Master's preferred, research experience, publications a plus" },
];

const round1000 = (n: number) => Math.max(1000, Math.round(n / 1000) * 1000);

async function main() {
  let unisTouched = 0;
  let programsCreated = 0;

  for (let i = 0; i < UNIS.length; i++) {
    const u = UNIS[i];
    const uni = await prisma.university.upsert({
      where: { name_country: { name: u.name, country: u.country } },
      update: { city: u.city, worldRanking: u.worldRanking, website: u.website },
      create: { name: u.name, country: u.country, city: u.city, worldRanking: u.worldRanking, website: u.website, accreditations: [] },
    });
    unisTouched++;

    // Assign 3 deterministic tracks per university (by index, wrapping).
    const mult = TIER[u.country] ?? 0.8;
    const trackIdx = [i % TRACKS.length, (i + 4) % TRACKS.length, (i + 8) % TRACKS.length];
    for (const ti of trackIdx) {
      const t = TRACKS[ti];
      const existing = await prisma.program.findFirst({ where: { universityId: uni.id, name: t.name, degreeLevel: t.degreeLevel } });
      if (existing) continue;
      const tuitionFeeUsd = round1000(t.baseFee * mult);
      const embedding = embedText(programText({ name: t.name, specialization: t.specialization, degreeLevel: t.degreeLevel, eligibility: t.eligibility, university: { name: u.name, country: u.country } }));
      const prog = await prisma.program.create({
        data: {
          universityId: uni.id,
          name: t.name,
          degreeLevel: t.degreeLevel,
          specialization: t.specialization,
          tuitionFeeUsd,
          durationMonths: t.degreeLevel === DegreeLevel.PHD ? 48 : t.degreeLevel === DegreeLevel.MBA ? 21 : 24,
          intakeDates: ["Sep 2026", "Jan 2027"],
          eligibility: t.eligibility,
          languageRequirements: "IELTS 6.5+ / TOEFL 90+",
          embedding,
        },
      });
      programsCreated++;
      // One merit scholarship per program (every other program, for variety).
      if (programsCreated % 2 === 0) {
        await prisma.scholarship.create({
          data: { name: `${u.name} Merit Award`, scope: "program", country: u.country, universityId: uni.id, programId: prog.id, eligibility: "Top applicants by GPA", amountUsd: round1000(tuitionFeeUsd * 0.25) },
        });
      }
    }
  }

  // Backfill embeddings for any program missing one (pre-Epic-3 data).
  const all = await prisma.program.findMany({ include: { university: true } });
  let backfilled = 0;
  for (const p of all) {
    if (p.embedding && p.embedding.length > 0) continue;
    const embedding = embedText(programText({ name: p.name, specialization: p.specialization, degreeLevel: p.degreeLevel, eligibility: p.eligibility, university: { name: p.university.name, country: p.university.country } }));
    await prisma.program.update({ where: { id: p.id }, data: { embedding } });
    backfilled++;
  }

  const totals = { universities: await prisma.university.count(), programs: await prisma.program.count(), scholarships: await prisma.scholarship.count() };
  console.log(`✅ Synthetic catalog ready.`);
  console.log(`   Universities touched: ${unisTouched}, programs created: ${programsCreated}, embeddings backfilled: ${backfilled}`);
  console.log(`   Catalog totals → universities: ${totals.universities}, programs: ${totals.programs}, scholarships: ${totals.scholarships}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
