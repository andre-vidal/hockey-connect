import Link from "next/link";
import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary-600" />
              <span className="font-bold text-gray-900">Hockey Connect</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs">
              The complete field hockey league management platform.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-gray-900">Platform</p>
              <Link href="/leagues" className="text-gray-500 hover:text-gray-900">Leagues</Link>
              <Link href="/clubs" className="text-gray-500 hover:text-gray-900">Clubs</Link>
              <Link href="/matches" className="text-gray-500 hover:text-gray-900">Matches</Link>
              <Link href="/stats" className="text-gray-500 hover:text-gray-900">Statistics</Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-gray-900">Community</p>
              <Link href="/players" className="text-gray-500 hover:text-gray-900">Players</Link>
              <Link href="/articles" className="text-gray-500 hover:text-gray-900">News</Link>
              <Link href="/calendar" className="text-gray-500 hover:text-gray-900">Calendar</Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-gray-900">Account</p>
              <Link href="/login" className="text-gray-500 hover:text-gray-900">Sign in</Link>
              <Link href="/register" className="text-gray-500 hover:text-gray-900">Register</Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-200 pt-6 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} Hockey Connect. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
