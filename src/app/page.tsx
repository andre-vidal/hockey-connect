import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Users, Calendar, BarChart2, Shield, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20 px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              Field Hockey,<br />Managed Perfectly
            </h1>
            <p className="text-lg md:text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Real-time match tracking, league management, player statistics, and everything your field hockey community needs — in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-white text-primary-700 hover:bg-primary-50 font-semibold">
                  Get started free
                </Button>
              </Link>
              <Link href="/leagues">
                <Button size="lg" variant="outline" className="bg-primary-600 border-white text-white hover:bg-primary-700">
                  Browse leagues
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Everything you need to run a league
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Zap, title: "Live Match Engine", desc: "Real-time score tracking, timer management, and event logging for match officials." },
                { icon: Trophy, title: "League Management", desc: "Full CRUD for leagues, tournaments, standings, and season management." },
                { icon: Users, title: "Player Profiles", desc: "Comprehensive player management with stats, squad workflows, and CSV import." },
                { icon: Calendar, title: "Match Scheduling", desc: "Schedule matches, assign officials, and view everything in a unified calendar." },
                { icon: BarChart2, title: "Stats & Leaderboards", desc: "Automatic stat aggregation with public leaderboards and player comparisons." },
                { icon: Shield, title: "Role-Based Access", desc: "Five user roles with granular permissions for admins, officials, teams, and players." },
              ].map((f) => (
                <Card key={f.title} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6 flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                      <f.icon className="h-5 w-5 text-primary-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">{f.title}</h3>
                    <p className="text-sm text-gray-500">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to grow field hockey?</h2>
            <p className="text-gray-500 mb-8">Join leagues already using Hockey Connect to manage their competitions.</p>
            <Link href="/register">
              <Button size="lg">Create your account</Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
