"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SearchResult {
  players: Array<{ id: string; firstName: string; lastName: string; clubId?: string }>;
  clubs: Array<{ id: string; name: string; city?: string }>;
  matches: Array<{ id: string; homeTeamName: string; awayTeamName: string; scheduledAt: string }>;
}

export function GlobalSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data) => setResults(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasResults =
    results &&
    (results.players.length > 0 || results.clubs.length > 0 || results.matches.length > 0);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search players, clubs, matches…"
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults(null);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
          )}

          {!loading && !hasResults && (
            <div className="px-4 py-3 text-sm text-gray-500">No results for &ldquo;{query}&rdquo;</div>
          )}

          {!loading && hasResults && (
            <div className="max-h-80 overflow-y-auto">
              {results!.players.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                    Players
                  </div>
                  {results!.players.map((p) => (
                    <Link
                      key={p.id}
                      href={`/players/${p.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
                    >
                      {p.firstName} {p.lastName}
                    </Link>
                  ))}
                </div>
              )}

              {results!.clubs.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                    Clubs
                  </div>
                  {results!.clubs.map((c) => (
                    <Link
                      key={c.id}
                      href={`/clubs/${c.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
                    >
                      {c.name}
                      {c.city && <span className="ml-1 text-gray-400 text-xs">· {c.city}</span>}
                    </Link>
                  ))}
                </div>
              )}

              {results!.matches.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                    Matches
                  </div>
                  {results!.matches.map((m) => (
                    <Link
                      key={m.id}
                      href={`/matches/${m.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center px-4 py-2 text-sm text-gray-800 hover:bg-gray-50"
                    >
                      {m.homeTeamName} <span className="mx-1 text-gray-400">vs</span> {m.awayTeamName}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
