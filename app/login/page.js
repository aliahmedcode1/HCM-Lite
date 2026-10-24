"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [company, setCompany] = useState(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => {
        setNeedsSetup(d.needsSetup);
        if (!d.needsSetup) {
          fetch("/api/me")
            .then((r) => (r.ok ? r.json() : null))
            .then((me) => me?.company && setCompany(me.company));
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Invalid email or password" : error.message);
      setLoading(false);
      return;
    }
    const res = await fetch("/api/me");
    const me = await res.json();
    if (me.profile && me.profile.must_change_password) {
      router.push("/change-password");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-emerald-500/12 blur-[120px]" />

      <div className="relative w-full max-w-md animate-fade-up">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 p-2 shadow-lg shadow-emerald-500/25">
            <Building2 className="h-4 w-4 text-zinc-950" strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <span className="block text-xl font-bold text-white">{company || "HCM Lite"}</span>
            <span className="block text-[11px] uppercase tracking-widest text-zinc-500">AI-assisted HR</span>
          </div>
        </Link>

        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-zinc-400">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 animate-fade-in">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign in
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          {needsSetup && (
            <p className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-center text-sm text-emerald-300">
              System is empty —{" "}
              <Link href="/setup" className="font-semibold underline">
                set up the company first
              </Link>
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          HCM Lite · Admin, HR & Employee logins
        </p>
      </div>
    </div>
  );
}
