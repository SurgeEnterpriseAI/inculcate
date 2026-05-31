/** Country-specific student-visa document checklists (synthetic, indicative). */

export interface ChecklistItem {
  item: string;
  required: boolean;
  done: boolean;
}

const COMMON: string[] = [
  "Valid passport (6+ months validity)",
  "University admission / offer letter",
  "Proof of funds / financial statements",
  "Academic transcripts & certificates",
  "English proficiency score (IELTS/TOEFL)",
  "Completed visa application form",
  "Visa fee payment receipt",
  "Passport-size photographs",
];

const BY_COUNTRY: Record<string, string[]> = {
  "United States": ["Form I-20 (F-1)", "SEVIS fee receipt", "DS-160 confirmation", "Visa interview appointment"],
  "United Kingdom": ["CAS letter", "TB test certificate", "IHS surcharge payment", "ATAS certificate (if applicable)"],
  Canada: ["Letter of acceptance from a DLI", "GIC (proof of funds)", "Upfront medical exam", "Biometrics appointment"],
  Australia: ["Confirmation of Enrolment (CoE)", "Genuine Temporary Entrant (GTE) statement", "OSHC health cover", "Biometrics"],
  Germany: ["Blocked account confirmation", "Health insurance proof", "University admission (Zulassung)"],
  Ireland: ["Letter of acceptance", "Proof of fees paid", "Private medical insurance"],
  "New Zealand": ["Offer of place", "Evidence of funds", "Medical & chest X-ray certificate"],
  Singapore: ["In-Principle Approval (IPA)", "Student's Pass application (SOLAR)", "Medical examination"],
};

export function visaChecklist(country: string): ChecklistItem[] {
  const extras = BY_COUNTRY[country] ?? [];
  return [...COMMON, ...extras].map((item) => ({ item, required: true, done: false }));
}

export const VISA_STATUSES = ["NOT_STARTED", "PREPARING", "SUBMITTED", "INTERVIEW_SCHEDULED", "APPROVED", "REJECTED"] as const;

export const VISA_STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  PREPARING: "Preparing documents",
  SUBMITTED: "Application submitted",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
