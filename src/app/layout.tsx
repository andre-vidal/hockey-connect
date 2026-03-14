import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { MaintenanceProvider } from "@/providers/MaintenanceProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hockey Connect",
  description: "The complete field hockey league management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <MaintenanceProvider>
            {children}
          </MaintenanceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
