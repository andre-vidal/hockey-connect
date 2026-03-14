"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/lib/firebase/config";

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const maintenanceRef = ref(rtdb, "maintenance/enabled");

    const unsubscribe = onValue(maintenanceRef, (snapshot) => {
      const enabled = snapshot.val() === true;

      if (enabled && pathname !== "/maintenance") {
        router.replace("/maintenance");
      } else if (!enabled && pathname === "/maintenance") {
        router.replace("/");
      }
    });

    return unsubscribe;
  }, [pathname, router]);

  return <>{children}</>;
}
