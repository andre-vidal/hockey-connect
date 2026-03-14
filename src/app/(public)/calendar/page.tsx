import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function CalendarPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell title="Calendar" description="Upcoming events and match schedule">
          <p className="text-sm text-gray-500">Calendar will appear here.</p>
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
