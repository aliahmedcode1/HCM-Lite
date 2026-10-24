"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Rocket } from "lucide-react";
import { Button, Input } from "@/components/ui";

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ company: "", fullName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Setup fail hua");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="glass-card w-full max-w-md rounded-2xl p-8 text-center animate-scale-in">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
            <Rocket className="h-6 w-6 text-emerald-400" />
          </div>
          <h1 className="mt-6 text-xl font-bold text-white">Company ready! 🎉</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Your admin account is ready. Sign in to create HR logins and add employees.
          </p>
          <Button className="mt-6 w-full" size="lg" onClick={() => router.push("/login")}>
            Continue to Sign in
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-emerald-500/12 blur-[120px]" />

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 p-2 shadow-lg shadow-emerald-500/25">
            <Building2 className="h-4 w-4 text-zinc-950" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold text-white">HCM Lite</span>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-400">First-run setup</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Company + Admin account</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This happens only once — then Admin creates HR, and HR registers employees.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Input
              label="Company name"
              placeholder="NovaTech Solutions"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              required
            />
            <Input
              label="Your name (Admin)"
              placeholder="Ali Ahmed"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
            <Input
              label="Admin email"
              type="email"
              placeholder="admin@123.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <Input
              label="Password (min 6 chars)"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="new-password"
            />

            {error && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 animate-fade-in">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Create company
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
