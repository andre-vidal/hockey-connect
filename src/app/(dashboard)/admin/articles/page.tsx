import { DashboardShell } from "@/components/layout/DashboardShell";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function AdminArticlesPage() {
  return (
    <AuthGuard requiredRoles={["league_admin"]}>
      <DashboardShell title="Articles" description="Publish and manage articles">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Article CMS coming in Phase 6</p>
            <p className="text-sm text-gray-400 mt-1">
              You&apos;ll be able to write and publish articles with role-based visibility here.
            </p>
          </CardContent>
        </Card>
      </DashboardShell>
    </AuthGuard>
  );
}
