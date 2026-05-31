import type { Role } from "@prisma/client";

/**
 * Role-based access control helpers.
 * Roles are ordered by privilege; a higher rank implies the powers of lower ones
 * only where explicitly checked — we keep checks explicit rather than purely
 * hierarchical so privilege escalation is intentional.
 */
export const ROLE_RANK: Record<Role, number> = {
  STUDENT: 0,
  COUNSELOR: 1,
  OPS_ADMIN: 2,
  SUPER_ADMIN: 3,
};

/** Landing dashboard for each role after sign-in. */
export const DASHBOARD_PATH: Record<Role, string> = {
  STUDENT: "/student",
  COUNSELOR: "/counselor",
  OPS_ADMIN: "/admin",
  SUPER_ADMIN: "/admin",
};

/** Which roles may access a given top-level route prefix. */
const ROUTE_ACCESS: { prefix: string; allow: Role[] }[] = [
  { prefix: "/student", allow: ["STUDENT", "COUNSELOR", "OPS_ADMIN", "SUPER_ADMIN"] },
  { prefix: "/counselor", allow: ["COUNSELOR", "OPS_ADMIN", "SUPER_ADMIN"] },
  { prefix: "/admin", allow: ["OPS_ADMIN", "SUPER_ADMIN"] },
];

export function canAccess(path: string, role: Role | undefined): boolean {
  const rule = ROUTE_ACCESS.find((r) => path === r.prefix || path.startsWith(r.prefix + "/"));
  if (!rule) return true; // public / unguarded route
  return role !== undefined && rule.allow.includes(role);
}

export function hasAtLeast(role: Role | undefined, min: Role): boolean {
  return role !== undefined && ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Routes that require any authenticated user. */
export function isProtectedRoute(path: string): boolean {
  return ROUTE_ACCESS.some((r) => path === r.prefix || path.startsWith(r.prefix + "/"));
}
