"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { UserRole } from "@/types";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  redirectTo?: string;
}

export function AuthGuard({ children, requiredRoles, redirectTo = "/login" }: AuthGuardProps) {
  const { user, roles, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user || user.isAnonymous) {
      router.replace(redirectTo);
      return;
    }

    if (requiredRoles && requiredRoles.length > 0) {
      const hasAccess = requiredRoles.some((role) => roles.includes(role));
      if (!hasAccess) {
        router.replace("/");
      }
    }
  }, [user, roles, loading, requiredRoles, redirectTo, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!user || user.isAnonymous) return null;

  if (requiredRoles && requiredRoles.length > 0) {
    const hasAccess = requiredRoles.some((role) => roles.includes(role));
    if (!hasAccess) return null;
  }

  return <>{children}</>;
}
