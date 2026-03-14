import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export function DashboardShell({
  children,
  className,
  title,
  description,
  actions,
}: DashboardShellProps) {
  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
            {description && <p className="text-sm text-gray-500">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
