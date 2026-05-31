import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { hasAtLeast } from "@/lib/rbac";

/** Server-side: require an authenticated session or redirect to sign-in. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");
  return session.user;
}

/** Server-side: require at least `min` role or redirect to sign-in. */
export async function requireRole(min: Role) {
  const user = await requireUser();
  if (!hasAtLeast(user.role, min)) redirect("/sign-in");
  return user;
}
