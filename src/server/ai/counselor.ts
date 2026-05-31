/**
 * Synthetic conversational counselor — NO external API key required.
 *
 * It performs lightweight intent detection, retrieves relevant programs from the
 * catalog using the Epic-3 embeddings (RAG), and returns grounded, templated
 * answers. It is intentionally swappable: when the Claude API is wired up,
 * implement CounselorProvider.respond() to call the model with the same retrieved
 * context, and return it from getCounselorProvider().
 */
import { db } from "@/lib/db";
import { cosineSim, embedText } from "@/server/ai/embedding";

export interface ChatTurn {
  role: "USER" | "ASSISTANT";
  content: string;
}

export interface Suggestion {
  programId: string;
  name: string;
  degreeLevel: string;
  specialization: string | null;
  university: string;
  country: string;
  tuitionFeeUsd: number | null;
}

export interface CounselorReply {
  content: string;
  suggestions: Suggestion[];
  offerHandoff: boolean;
}

export interface ProfileCtx {
  preferredSubjects: string[];
  preferredCountries: string[];
  targetDegreeLevel: string | null;
  budgetMaxUsd: number | null;
  careerGoals: string | null;
  highestQualification: string | null;
}

type Intent = "greeting" | "handoff" | "scholarship" | "cost" | "visa" | "deadline" | "recommend";

function detectIntent(msg: string): Intent {
  const m = msg.toLowerCase();
  if (/\b(human|counsell?or|advisor|agent|real person|someone|a person)\b/.test(m) && /\b(talk|speak|connect|help|contact|chat)\b/.test(m))
    return "handoff";
  if (/scholarship|funding|financial aid|grant|bursary/.test(m)) return "scholarship";
  if (/\b(cost|costs|fee|fees|tuition|budget|afford|expensive|cheap|price|pricing)\b/.test(m)) return "cost";
  if (/\bvisa|study permit|immigration|proof of funds\b/.test(m)) return "visa";
  if (/deadline|intake|when (can|should|do) i apply|application date|start date/.test(m)) return "deadline";
  if (/^\s*(hi|hello|hey+|hii+|good (morning|afternoon|evening))\b/.test(m)) return "greeting";
  return "recommend";
}

const usd = (n?: number | null) => (n == null ? "fee N/A" : `$${n.toLocaleString()}/yr`);
const HANDOFF_PROMPT = "Would you like me to connect you with a human counselor for personalized help with applications and next steps?";

async function retrieve(profile: ProfileCtx, message: string, k = 4): Promise<Suggestion[]> {
  const queryText = [message, ...(profile.preferredSubjects ?? []), profile.targetDegreeLevel ?? "", profile.careerGoals ?? ""]
    .filter(Boolean)
    .join(" ");
  const qVec = embedText(queryText);

  const programs = await db.program.findMany({ include: { university: true } });
  const mentionedCountry = (profile.preferredCountries ?? []).find((c) => message.toLowerCase().includes(c.toLowerCase()));

  const ranked = programs
    .map((p) => {
      let score = cosineSim(qVec, p.embedding ?? []);
      // Light structured boosts so retrieval respects stated preferences.
      if (profile.targetDegreeLevel && p.degreeLevel === profile.targetDegreeLevel) score += 0.05;
      if (mentionedCountry && p.university.country.toLowerCase() === mentionedCountry.toLowerCase()) score += 0.1;
      else if ((profile.preferredCountries ?? []).some((c) => c.toLowerCase() === p.university.country.toLowerCase())) score += 0.03;
      if (profile.budgetMaxUsd != null && p.tuitionFeeUsd != null && p.tuitionFeeUsd <= profile.budgetMaxUsd) score += 0.02;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return ranked.map(({ p }) => ({
    programId: p.id,
    name: p.name,
    degreeLevel: p.degreeLevel,
    specialization: p.specialization,
    university: p.university.name,
    country: p.university.country,
    tuitionFeeUsd: p.tuitionFeeUsd,
  }));
}

function listProgramsText(s: Suggestion[]): string {
  return s.map((x, i) => `${i + 1}. ${x.name} — ${x.university}, ${x.country} (${usd(x.tuitionFeeUsd)})`).join("\n");
}

export const syntheticCounselorProvider = {
  name: "synthetic-rag-counselor",
  async respond(ctx: { profile: ProfileCtx; history: ChatTurn[]; message: string }): Promise<CounselorReply> {
    const intent = detectIntent(ctx.message);
    const subjects = ctx.profile.preferredSubjects?.length ? ctx.profile.preferredSubjects.join(", ") : "your field";

    if (intent === "greeting") {
      return {
        content: `Hi! I'm your AI study-abroad counselor. Tell me what you're looking for — a country, a subject like ${subjects}, your budget, or scholarships — and I'll suggest programs from our catalog. ${HANDOFF_PROMPT}`,
        suggestions: [],
        offerHandoff: true,
      };
    }

    if (intent === "handoff") {
      return {
        content: "Absolutely — I can connect you with one of our human counselors who will guide your applications, documents, visa, and travel. Tap \"Talk to a human\" and a counselor will pick up your case.",
        suggestions: [],
        offerHandoff: true,
      };
    }

    const suggestions = await retrieve(ctx.profile, ctx.message);

    if (intent === "cost") {
      const fees = suggestions.map((s) => s.tuitionFeeUsd).filter((n): n is number => n != null);
      const range = fees.length ? `roughly $${Math.min(...fees).toLocaleString()}–$${Math.max(...fees).toLocaleString()}/yr in tuition` : "varying tuition";
      const budgetNote = ctx.profile.budgetMaxUsd != null ? ` Your stated budget is up to $${ctx.profile.budgetMaxUsd.toLocaleString()}/yr, so I've leaned toward options within reach.` : "";
      return {
        content: `Here's a cost-oriented shortlist (${range}).${budgetNote} Remember to budget for living costs too, which vary a lot by city. Many of these also have scholarships — ask me about funding.\n\n${listProgramsText(suggestions)}\n\n${HANDOFF_PROMPT}`,
        suggestions,
        offerHandoff: true,
      };
    }

    if (intent === "scholarship") {
      const uniNames = [...new Set(suggestions.map((s) => s.university))];
      const scholarships = await db.scholarship.findMany({
        where: { university: { name: { in: uniNames } } },
        include: { university: true },
        take: 5,
      });
      const schText = scholarships.length
        ? scholarships.map((s) => `• ${s.name} — ${s.university?.name ?? s.country ?? ""}${s.amountUsd ? ` (up to $${s.amountUsd.toLocaleString()})` : ""}`).join("\n")
        : "I don't see scholarships on file for those exact programs yet — broadening your country or subject may surface more.";
      return {
        content: `Funding options linked to your top matches:\n${schText}\n\nEligibility usually depends on GPA and test scores. ${HANDOFF_PROMPT}`,
        suggestions,
        offerHandoff: true,
      };
    }

    if (intent === "visa") {
      return {
        content:
          "Visa requirements depend on your destination country, but most student visas need: an admission/offer letter, proof of funds, academic and language documents, and sometimes an interview. I can't give legal advice or guarantee outcomes — this is exactly where a human counselor adds the most value, compiling your documents and prepping you. " +
          HANDOFF_PROMPT,
        suggestions,
        offerHandoff: true,
      };
    }

    if (intent === "deadline") {
      const progs = await db.program.findMany({
        where: { id: { in: suggestions.map((s) => s.programId) } },
        include: { university: true },
      });
      const lines = progs.map((p) => {
        const intakes = p.intakeDates?.length ? p.intakeDates.join(", ") : "intakes vary";
        const dl = p.applicationDeadline ? ` · deadline ${p.applicationDeadline.toISOString().slice(0, 10)}` : "";
        return `• ${p.name} (${p.university.name}): ${intakes}${dl}`;
      });
      return {
        content: `Upcoming intakes for your top matches:\n${lines.join("\n")}\n\nApply 6–9 months ahead to leave time for documents and visa. ${HANDOFF_PROMPT}`,
        suggestions,
        offerHandoff: true,
      };
    }

    // recommend / fallback
    return {
      content: `Based on your interest in ${subjects}${ctx.profile.targetDegreeLevel ? ` at the ${ctx.profile.targetDegreeLevel.toLowerCase()} level` : ""}, here are strong fits from our catalog:\n\n${listProgramsText(suggestions)}\n\nYou can shortlist any of these from your AI Matches page, or ask me about costs, scholarships, deadlines, or visas. ${HANDOFF_PROMPT}`,
      suggestions,
      offerHandoff: true,
    };
  },
};

export function getCounselorProvider() {
  // Swap to a Claude-backed provider here when an API key is configured.
  return syntheticCounselorProvider;
}

export function buildProfileCtx(p: {
  preferredSubjects: string[];
  preferredCountries: string[];
  targetDegreeLevel: string | null;
  budgetMaxUsd: number | null;
  careerGoals: string | null;
  highestQualification: string | null;
}): ProfileCtx {
  return {
    preferredSubjects: p.preferredSubjects,
    preferredCountries: p.preferredCountries,
    targetDegreeLevel: p.targetDegreeLevel,
    budgetMaxUsd: p.budgetMaxUsd,
    careerGoals: p.careerGoals,
    highestQualification: p.highestQualification,
  };
}
