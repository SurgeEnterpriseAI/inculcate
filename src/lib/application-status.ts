import type { ApplicationStatus, Role } from "@prisma/client";

/** Allowed forward transitions for the application lifecycle. */
export const TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  SHORTLISTED: ["APPLYING", "WITHDRAWN"],
  APPLYING: ["SUBMITTED", "WITHDRAWN"],
  SUBMITTED: ["OFFER", "REJECTED", "WITHDRAWN"],
  OFFER: ["ACCEPTED", "REJECTED", "WITHDRAWN"],
  ACCEPTED: ["VISA", "WITHDRAWN"],
  VISA: ["ENROLLED", "WITHDRAWN"],
  ENROLLED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  SHORTLISTED: "Shortlisted",
  APPLYING: "Applying",
  SUBMITTED: "Submitted",
  OFFER: "Offer received",
  ACCEPTED: "Offer accepted",
  VISA: "Visa in progress",
  ENROLLED: "Enrolled",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const STATUS_CLASS: Record<ApplicationStatus, string> = {
  SHORTLISTED: "bg-slate-50 text-slate-700 border-slate-200",
  APPLYING: "bg-blue-50 text-blue-700 border-blue-200",
  SUBMITTED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  OFFER: "bg-green-50 text-green-700 border-green-200",
  ACCEPTED: "bg-green-50 text-green-700 border-green-200",
  VISA: "bg-amber-50 text-amber-700 border-amber-200",
  ENROLLED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  WITHDRAWN: "bg-slate-50 text-slate-500 border-slate-200",
};

/**
 * Which transitions a given role may perform.
 * Students self-serve only the early steps (start applying / withdraw);
 * counselors & admins drive the rest of Phase-2 execution.
 */
export function allowedNextStatuses(role: Role, from: ApplicationStatus, isOwner: boolean): ApplicationStatus[] {
  const all = TRANSITIONS[from] ?? [];
  if (role === "STUDENT") {
    if (!isOwner) return [];
    return all.filter((s) => s === "APPLYING" || s === "WITHDRAWN");
  }
  // COUNSELOR, OPS_ADMIN, SUPER_ADMIN
  return all;
}

export function canTransition(role: Role, from: ApplicationStatus, to: ApplicationStatus, isOwner: boolean): boolean {
  return allowedNextStatuses(role, from, isOwner).includes(to);
}
