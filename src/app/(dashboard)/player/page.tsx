import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArticlesWidget } from "@/components/articles/ArticlesWidget";

export default function PlayerDashboardPage() {
  return (
    <DashboardShell title="Player Dashboard" description="Your profile, stats, and upcoming matches">
      <Card>
        <CardHeader>
          <CardTitle>My Season</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Your season stats will appear here once matches are played.</p>
        </CardContent>
      </Card>
      <ArticlesWidget viewAllHref="/player/articles" articleHrefPrefix="/player/articles" limit={3} />
    </DashboardShell>
  );
}
