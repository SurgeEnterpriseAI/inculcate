import {
  LayoutDashboard,
  Sparkles,
  MessageSquare,
  FileText,
  FolderLock,
  PenLine,
  ShieldCheck,
  Wallet,
  Plane,
  User,
  Users,
  ListChecks,
  Inbox,
  Building2,
  Upload,
  Search,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import type { Role } from "@prisma/client";
import type { NavItem } from "./shell";

export const studentNav: NavItem[] = [
  { href: "/student", label: "Overview", icon: LayoutDashboard },
  { href: "/student/profile", label: "My Profile", icon: User },
  { href: "/search", label: "Find Programs", icon: Search },
  { href: "/student/matches", label: "AI Matches", icon: Sparkles },
  { href: "/student/counselor", label: "AI Counselor", icon: MessageSquare },
  { href: "/student/applications", label: "Applications", icon: FileText },
  { href: "/student/documents", label: "Documents", icon: FolderLock },
  { href: "/student/writing", label: "Writing Assistant", icon: PenLine },
  { href: "/student/visa", label: "Visa", icon: ShieldCheck },
  { href: "/student/finance", label: "Finance", icon: Wallet },
  { href: "/student/logistics", label: "Accommodation & Travel", icon: Plane },
];

export const counselorNav: NavItem[] = [
  { href: "/counselor", label: "Overview", icon: LayoutDashboard },
  { href: "/counselor/applications", label: "Applications", icon: ClipboardList },
  { href: "/counselor/tasks", label: "Task Queue", icon: ListChecks },
  { href: "/counselor/leads", label: "Leads", icon: Inbox },
  { href: "/search", label: "Catalog", icon: Search },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/universities", label: "Universities", icon: Building2 },
  { href: "/admin/import", label: "Import CSV", icon: Upload },
  { href: "/search", label: "Search Catalog", icon: Search },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

/** Pick the nav appropriate to a user's role (used by shared pages like /search). */
export function navFor(role: Role): NavItem[] {
  if (role === "STUDENT") return studentNav;
  if (role === "COUNSELOR") return counselorNav;
  return adminNav; // OPS_ADMIN, SUPER_ADMIN
}
