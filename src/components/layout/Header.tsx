"use client";

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { useRole } from "@/hooks/useRole";
import { logOut } from "@/lib/firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Shield } from "lucide-react";

export function Header() {
  const { user, profile } = useAuth();
  const { primaryRole } = useRole();
  console.log(primaryRole);

  const getDashboardPath = () => {
    switch (primaryRole) {
      case "root": return "/root";
      case "league_admin": return "/admin";
      case "match_official": return "/official";
      case "club_admin": return "/team";
      case "team_admin": return "/team";
      case "player": return "/player";
      default: return "/";
    }
  };

  const initials = profile?.displayName
    ? profile.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary-600" />
          <span className="text-xl font-bold text-gray-900">Hockey Connect</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/leagues" className="hover:text-gray-900">Leagues</Link>
          <Link href="/clubs" className="hover:text-gray-900">Clubs</Link>
          <Link href="/players" className="hover:text-gray-900">Players</Link>
          <Link href="/matches" className="hover:text-gray-900">Matches</Link>
          <Link href="/articles" className="hover:text-gray-900">News</Link>
        </nav>

        <div className="flex items-center gap-3">
          {user && !user.isAnonymous ? (
            <>
              <Link href={getDashboardPath()}>
                <Button variant="outline" size="sm">Dashboard</Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2">
                    <Avatar className="h-9 w-9 cursor-pointer">
                      <AvatarImage src={profile?.photoURL || undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold">{profile?.displayName || "User"}</span>
                      <span className="text-xs text-gray-500 font-normal">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={getDashboardPath()}>Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logOut();
                      await fetch("/api/auth/session", { method: "DELETE" });
                      window.location.href = "/login";
                    }}
                    className="text-red-600"
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
