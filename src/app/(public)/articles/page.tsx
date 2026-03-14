import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default function ArticlesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-50">
        <DashboardShell title="News" description="Latest articles and announcements">
          <p className="text-sm text-gray-500">Articles will appear here.</p>
        </DashboardShell>
      </main>
      <Footer />
    </div>
  );
}
