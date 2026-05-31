import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";
import { canAccess, DASHBOARD_PATH } from "@/lib/rbac";

/**
 * Edge-safe Auth.js config (no Node-only deps like bcrypt/prisma).
 * The Credentials provider is attached in `src/auth.ts` (Node runtime).
 * This file powers the middleware's route authorization.
 */
export const authConfig = {
  pages: {
    signIn: "/sign-in",
  },
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [], // attached in auth.ts
  callbacks: {
    // Used by middleware to gate routes by role.
    authorized({ auth, request: { nextUrl } }) {
      const role = auth?.user?.role as Role | undefined;
      const path = nextUrl.pathname;

      // Allow everything that isn't an RBAC-guarded prefix.
      if (canAccess(path, role)) return true;

      // Not allowed: signed-out users go to sign-in; wrong-role users
      // are redirected to their own dashboard.
      if (!role) return false; // triggers redirect to signIn page
      return Response.redirect(new URL(DASHBOARD_PATH[role], nextUrl));
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
