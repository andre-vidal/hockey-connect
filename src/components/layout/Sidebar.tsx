"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Trophy,
  Users,
  Calendar,
  FileText,
  Settings,
  Shield,
  ClipboardList,
  UserCog,
  Swords,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const rootOnlyNav: NavItem[] = [
  { label: "Root Dashboard", href: "/root", icon: LayoutDashboard },
  { label: "Settings", href: "/root/settings", icon: Settings },
];

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Leagues", href: "/admin/leagues", icon: Trophy },
  { label: "Tournaments", href: "/admin/tournaments", icon: Swords },
  { label: "Clubs", href: "/admin/clubs", icon: Shield },
  { label: "Officials", href: "/admin/officials", icon: UserCog },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Matches", href: "/admin/matches", icon: Calendar },
  { label: "Articles", href: "/admin/articles", icon: FileText },
];

const officialNav: NavItem[] = [
  { label: "Dashboard", href: "/official", icon: LayoutDashboard },
  { label: "My Matches", href: "/official/matches", icon: Swords },
  { label: "Calendar", href: "/official/calendar", icon: Calendar },
  { label: "Articles", href: "/official/articles", icon: FileText },
];

const teamNav: NavItem[] = [
  { label: "Dashboard", href: "/team", icon: LayoutDashboard },
  { label: "Players", href: "/team/players", icon: Users },
  { label: "Squads", href: "/team/squads", icon: ClipboardList },
  { label: "Matches", href: "/team/matches", icon: Swords },
  { label: "Calendar", href: "/team/calendar", icon: Calendar },
  { label: "Articles", href: "/team/articles", icon: FileText },
];

const playerNav: NavItem[] = [
  { label: "Dashboard", href: "/player", icon: LayoutDashboard },
  { label: "My Profile", href: "/player/profile", icon: Users },
  { label: "My Matches", href: "/player/matches", icon: Swords },
  { label: "Calendar", href: "/player/calendar", icon: Calendar },
  { label: "Articles", href: "/player/articles", icon: FileText },
];

function NavList({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin" && item.href !== "/official" && item.href !== "/team" && item.href !== "/player" && item.href !== "/root" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar() {
  const { primaryRole } = useRole();
  const pathname = usePathname();

  const isRoot = primaryRole === "root";

  const mainNav = isRoot
    ? adminNav
    : primaryRole === "league_admin"
    ? adminNav
    : primaryRole === "match_official"
    ? officialNav
    : primaryRole === "team_admin"
    ? teamNav
    : playerNav;

  const roleLabel = isRoot
    ? "Root"
    : primaryRole === "league_admin"
    ? "League Admin"
    : primaryRole === "match_official"
    ? "Match Official"
    : primaryRole === "team_admin"
    ? "Team Admin"
    : "Player";

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-gray-200 bg-white min-h-screen">
      <div className="p-4 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{roleLabel}</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <NavList items={mainNav} pathname={pathname} />
        {isRoot && (
          <>
            <div className="pt-4 pb-1">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Root</p>
            </div>
            <NavList items={rootOnlyNav} pathname={pathname} />
          </>
        )}
      </nav>
    </aside>
  );
}
