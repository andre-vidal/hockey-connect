import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function MatchesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell title="Matches" description="Upcoming and recent matches">
          <p className="text-sm text-gray-500">Matches will appear here.</p>
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
