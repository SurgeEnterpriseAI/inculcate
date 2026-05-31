/**
 * Synthetic SOP / LOR / essay generator — NO external API key required.
 *
 * Produces a profile-grounded first draft and supports rule-based refinement.
 * Every output is explicitly flagged as an AI draft that must be reviewed and
 * personalized by the student and their counselor. Swappable: implement
 * WritingProvider against the Claude API and return it from getWritingProvider().
 */

export type WritingKind = "SOP" | "LOR" | "ESSAY";

export interface WritingProfile {
  name: string;
  highestQualification: string | null;
  gpa: number | null;
  preferredSubjects: string[];
  careerGoals: string | null;
  workExperienceYears: number | null;
}

export interface GenerateInput {
  kind: WritingKind;
  profile: WritingProfile;
  programName?: string;
  universityName?: string;
  tone?: "formal" | "warm";
}

const DISCLAIMER =
  "\n\n— AI-generated first draft. Personalize it with specifics, verify all claims, and review with your counselor before submitting.";

function subjectsPhrase(p: WritingProfile): string {
  return p.preferredSubjects.length ? p.preferredSubjects.join(" and ") : "my field";
}

export function generateDraft(input: GenerateInput): string {
  const { profile: p, kind } = input;
  const program = input.programName ?? "this program";
  const uni = input.universityName ? ` at ${input.universityName}` : "";
  const subjects = subjectsPhrase(p);
  const qual = p.highestQualification ?? "my undergraduate degree";
  const exp = (p.workExperienceYears ?? 0) >= 1 ? `${p.workExperienceYears} year(s) of professional experience` : "hands-on project experience";
  const goals = p.careerGoals?.trim() || `to build a meaningful career in ${subjects}`;

  if (kind === "LOR") {
    return (
      `To the Admissions Committee,\n\n` +
      `It is my pleasure to recommend ${p.name} for ${program}${uni}. ` +
      `I have known ${p.name} in an academic capacity and have consistently been impressed by their command of ${subjects} and their work ethic.\n\n` +
      `${p.name} completed ${qual}${p.gpa ? ` with a strong GPA of ${p.gpa}/10` : ""} and brings ${exp}. ` +
      `They combine analytical rigor with genuine curiosity, and they collaborate well with peers.\n\n` +
      `Given their goal — ${goals} — I am confident ${p.name} will thrive in ${program} and contribute meaningfully to your cohort. ` +
      `I recommend them without reservation.\n\nSincerely,\n[Recommender name, title, institution]` +
      DISCLAIMER
    );
  }

  if (kind === "ESSAY") {
    return (
      `Why ${program}${uni}?\n\n` +
      `My interest in ${subjects} began during ${qual}, where I discovered how the field connects theory to real-world impact. ` +
      `Since then I have pursued ${exp}, which sharpened both my technical skills and my sense of purpose.\n\n` +
      `${program} stands out because of its focus and rigor. It aligns directly with my goal ${goals}, ` +
      `and I am eager to learn alongside faculty and peers who share this ambition.` +
      DISCLAIMER
    );
  }

  // SOP
  return (
    `Statement of Purpose\n\n` +
    `Introduction\n` +
    `I am applying to ${program}${uni} to deepen my expertise in ${subjects}. ` +
    `My ambition — ${goals} — has shaped every academic and professional choice I have made.\n\n` +
    `Academic background\n` +
    `I completed ${qual}${p.gpa ? `, maintaining a GPA of ${p.gpa}/10` : ""}. ` +
    `Coursework and projects in ${subjects} gave me a strong foundation and revealed the questions I most want to pursue.\n\n` +
    `Experience\n` +
    `Beyond the classroom, I have gained ${exp}, applying what I learned to practical problems and learning to work in teams under real constraints.\n\n` +
    `Why this program\n` +
    `${program} is the right next step: its curriculum and faculty match my interests in ${subjects}, and it offers the depth I need to reach my goals.\n\n` +
    `Conclusion\n` +
    `I am confident that my preparation, motivation, and clarity of purpose make me a strong fit, and I look forward to contributing to and growing within your community.` +
    DISCLAIMER
  );
}

/** Rule-based refinement (synthetic). */
export function refineDraft(text: string, instruction: string): string {
  const body = text.replace(DISCLAIMER, "").trim();
  const instr = instruction.toLowerCase();

  let out = body;
  if (/short|concise|trim|brief/.test(instr)) {
    const sentences = body.split(/(?<=[.!?])\s+/);
    out = sentences.slice(0, Math.max(3, Math.ceil(sentences.length * 0.6))).join(" ");
  } else if (/long|expand|detail|elaborate/.test(instr)) {
    out = body + `\n\nIn addition, I have actively sought opportunities to apply my skills — through projects, collaboration, and self-directed learning — which has reinforced both my competence and my commitment to this path.`;
  } else if (/formal/.test(instr)) {
    out = body.replace(/\bI'm\b/g, "I am").replace(/\bdon't\b/g, "do not").replace(/\bit's\b/g, "it is").replace(/\bI've\b/g, "I have");
  } else {
    out = `${body}\n\n[Refinement note: applied "${instruction.trim().slice(0, 80)}". Edit for specifics and voice.]`;
  }
  return out + DISCLAIMER;
}

export function getWritingProvider() {
  // Swap to a Claude-backed provider here when an API key is configured.
  return { name: "synthetic-writing", generateDraft, refineDraft };
}
