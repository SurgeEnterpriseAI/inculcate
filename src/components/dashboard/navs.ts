import {
  LayoutDashboard,
  Sparkles,
  MessageSquare,
  FileText,
  User,
  Users,
  ListChecks,
  Inbox,
  Building2,
  Upload,
  Search,
  BarChart3,
} from "lucide-react";
import type { Role } from "@prisma/client";
import type { NavItem } from "./shell";

export const studentNav: NavItem[] = [
  { href: "/student", label: "Overview", icon: LayoutDashboard },
  { href: "/student/profile", label: "My Profile", icon: User },
  { href: "/search", label: "Find Programs", icon: Search },
  { href: "/student", label: "AI Matches", icon: Sparkles }, // Epic 3
  { href: "/student", label: "AI Counselor", icon: MessageSquare }, // Epic 4
  { href: "/student", label: "Applications", icon: FileText }, // Epic 5
];

export const counselorNav: NavItem[] = [
  { href: "/counselor", label: "Overview", icon: LayoutDashboard },
  { href: "/counselor", label: "My Students", icon: Users }, // Epic 5/7
  { href: "/counselor", label: "Task Queue", icon: ListChecks }, // Epic 5
  { href: "/counselor", label: "Leads", icon: Inbox }, // Epic 4/7
  { href: "/search", label: "Catalog", icon: Search },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/universities", label: "Universities", icon: Building2 },
  { href: "/admin/import", label: "Import CSV", icon: Upload },
  { href: "/search", label: "Search Catalog", icon: Search },
  { href: "/admin", label: "Analytics", icon: BarChart3 }, // Epic 7
];

/** Pick the nav appropriate to a user's role (used by shared pages like /search). */
export function navFor(role: Role): NavItem[] {
  if (role === "STUDENT") return studentNav;
  if (role === "COUNSELOR") return counselorNav;
  return adminNav; // OPS_ADMIN, SUPER_ADMIN
}
