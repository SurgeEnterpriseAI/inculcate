import Link from "next/link";
import { GraduationCap, Sparkles, Users, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { DASHBOARD_PATH } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function Home() {
  const session = await auth();
  const dashboardHref = session?.user ? DASHBOARD_PATH[session.user.role] : null;

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-6 w-6 text-[var(--brand)]" />
          <span>Inculcate</span>
        </div>
        <nav className="flex items-center gap-2">
          {dashboardHref ? (
            <Link href={dashboardHref}>
              <Button size="sm">Go to dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/sign-up">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-12 pt-10 text-center sm:pt-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-medium text-[var(--muted)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--brand)]" /> AI elevates, humans execute
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Study abroad, decided intelligently — delivered personally.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-[var(--muted)]">
          AI handles data-heavy discovery and matching across universities in 193 countries.
          Expert counselors handle applications, visas, and logistics. 20 years of process, scaled.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/sign-up">
            <Button size="lg">Find your best-fit programs</Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline">Sign in</Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 sm:grid-cols-3">
        {[
          { icon: Sparkles, title: "AI Discovery", body: "Profile-aware matching with fit, admission-probability, and risk scoring." },
          { icon: Users, title: "Human Execution", body: "Counselors handle applications, documents, visas, accommodation, and travel." },
          { icon: ShieldCheck, title: "Transparent & Compliant", body: "No false guarantees. Secure document vault and privacy-aware data handling." },
        ].map((f) => (
          <Card key={f.title}>
            <CardContent className="pt-5">
              <f.icon className="mb-3 h-6 w-6 text-[var(--brand)]" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{f.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
