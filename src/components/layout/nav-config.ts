import {
  BarChart3,
  Building2,
  CreditCard,
  Dumbbell,
  LayoutDashboard,
  LineChart,
  Settings,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";
import type { UserRole } from "@/types/db.types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const OWNER_NAV: NavItem[] = [
  { label: "Dashboard", href: ROUTES.owner.dashboard, icon: LayoutDashboard },
  { label: "Members", href: ROUTES.owner.members, icon: Users },
  { label: "Settings", href: ROUTES.owner.settings, icon: Settings },
];

export const MEMBER_NAV: NavItem[] = [
  { label: "Dashboard", href: ROUTES.member.dashboard, icon: LayoutDashboard },
  { label: "Workout Plan", href: ROUTES.member.workoutPlan, icon: Dumbbell },
  { label: "Progress", href: ROUTES.member.progress, icon: LineChart },
  { label: "Profile", href: ROUTES.member.profile, icon: User },
];

export const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: ROUTES.admin.dashboard, icon: LayoutDashboard },
  { label: "Gyms", href: ROUTES.admin.gyms, icon: Building2 },
  { label: "Subscriptions", href: ROUTES.admin.subscriptions, icon: CreditCard },
  { label: "Analytics", href: ROUTES.admin.analytics, icon: BarChart3 },
];

export function navForRole(role: UserRole): NavItem[] {
  switch (role) {
    case "owner":
      return OWNER_NAV;
    case "member":
      return MEMBER_NAV;
    case "super_admin":
      return ADMIN_NAV;
  }
}
