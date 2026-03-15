import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import Link from "next/link";

export default function RootDashboardPage() {
  return (
    <AuthGuard requiredRoles={["root"]}>
      <DashboardShell title="Root Dashboard" description="Elevated system controls">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/root/settings">
            <Card className="hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">App Settings</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Site name, maintenance mode</span>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-600 bg-gray-100">
                  <Settings className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </DashboardShell>
    </AuthGuard>
  );
}
