import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 font-semibold">
        <GraduationCap className="h-6 w-6 text-[var(--brand)]" />
        <span>Inculcate</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
