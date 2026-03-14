import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function ClubsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell title="Clubs" description="Browse registered clubs">
          <p className="text-sm text-gray-500">Clubs will appear here.</p>
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
