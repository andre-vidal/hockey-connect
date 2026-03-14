import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function StatsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell title="Statistics" description="League tables, player stats, and leaderboards">
          <p className="text-sm text-gray-500">Statistics will appear here.</p>
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
