import Link from "next/link";
import { GraduationCap } from "lucide-react";
import type { Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export interface NavItem {
  href: string;
  label: string;
  // lucide icon component
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_LABEL: Record<Role, string> = {
  STUDENT: "Student",
  COUNSELOR: "Counselor",
  OPS_ADMIN: "Operations Admin",
  SUPER_ADMIN: "Super Admin",
};

export function DashboardShell({
  user,
  nav,
  children,
}: {
  user: { name?: string | null; email?: string | null; role: Role };
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-[var(--border)] bg-white p-4 md:block">
        <Link href="/" className="mb-6 flex items-center gap-2 font-semibold">
          <GraduationCap className="h-6 w-6 text-[var(--brand)]" />
          <span>Inculcate</span>
        </Link>
        <nav className="space-y-1">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <item.icon className="h-4 w-4 text-[var(--muted)]" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            <Badge>{ROLE_LABEL[user.role]}</Badge>
            <span className="text-sm text-[var(--muted)]">{user.name ?? user.email}</span>
          </div>
          <SignOutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}
