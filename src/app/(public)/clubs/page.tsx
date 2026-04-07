"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Club } from "@/types";
import { MapPin, Globe } from "lucide-react";

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clubs")
      .then((r) => r.json())
      .then((data) => setClubs(data.clubs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell title="Clubs" description="Browse registered clubs">
          {loading && <p className="text-sm text-gray-400">Loading…</p>}
          {!loading && clubs.length === 0 && (
            <p className="text-sm text-gray-500">No clubs found.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {clubs.map((club) => (
              <div
                key={club.id}
                className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col items-center text-center gap-3"
              >
                {club.logoUrl ? (
                  <Image
                    src={club.logoUrl}
                    alt={club.name}
                    width={128}
                    height={128}
                    className="rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
                    style={{ backgroundColor: club.primaryColor || "#16a34a" }}
                  >
                    {club.shortName?.[0] ?? club.name[0]}
                  </div>
                )}
                <div className="min-w-0 w-full">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {club.name}
                  </h3>
                  {club.shortName && (
                    <p className="text-xs text-gray-400">{club.shortName}</p>
                  )}
                  <div className="mt-1 space-y-0.5">
                    {(club.city || club.country) && (
                      <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[club.city, club.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {club.website && (
                      <a
                        href={club.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-600 hover:underline flex items-center justify-center gap-1"
                      >
                        <Globe className="h-3 w-3" />
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
