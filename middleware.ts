import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Edge middleware enforces RBAC via authConfig.callbacks.authorized.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  // Run on everything except static assets and the auth API.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
