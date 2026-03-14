import { RegisterForm } from "@/components/auth/RegisterForm";
import { Shield } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <Shield className="h-8 w-8 text-primary-600" />
        <span className="text-2xl font-bold text-gray-900">Hockey Connect</span>
      </Link>
      <RegisterForm />
    </div>
  );
}
