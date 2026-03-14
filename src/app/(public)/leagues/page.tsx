import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function LeaguesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell title="Leagues" description="Browse all active leagues and competitions">
          <p className="text-sm text-gray-500">Leagues will appear here.</p>
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
