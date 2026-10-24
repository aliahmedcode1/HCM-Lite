"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  CalendarCheck,
  ClipboardList,
  FileText,
  Users,
} from "lucide-react";
import { Button, Card } from "@/components/ui";

const modules = [
  { icon: Users, title: "Employees", desc: "Directory, Employee 360, HR registrations" },
  { icon: CalendarCheck, title: "Attendance", desc: "Web check-in/out, live daily board" },
  { icon: ClipboardList, title: "Leave", desc: "Balances, approvals, smart AI form" },
  { icon: FileText, title: "Payroll Lite", desc: "Monthly runs, tax slabs, payslips" },
  { icon: BarChart3, title: "Dashboards", desc: "Admin, HR & Employee KPIs from real data" },
  { icon: Bot, title: "AI Assistant", desc: "Chat with live data, policy Q&A" },
]

export default function Home() {
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => setNeedsSetup(d.needsSetup))
      .catch(() => {})
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[140px]" />

      <header className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 p-2 shadow-lg shadow-emerald-500/25">
            <Building2 className="h-4 w-4 text-zinc-950" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold text-white">HCM Lite</span>
        </div>
        <Link href="/login">
          <Button size="sm" variant="secondary">Sign in</Button>
        </Link>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 text-center">
        <div className="animate-fade-up rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs font-medium text-emerald-300">
          AI-assisted Human Capital Management
        </div>

        <h1 className="animate-fade-up delay-100 mt-8 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl mx-auto">
          Your entire HR day,
          <br />
          <span className="text-gradient">in one system</span>
        </h1>

        <p className="animate-fade-up delay-200 mx-auto mt-6 max-w-xl text-lg text-zinc-400">
          Employees, attendance, leave, payroll and an AI assistant — all running on live data,
          for three roles: Admin, HR and Employee.
        </p>

        <div className="animate-fade-up delay-300 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {needsSetup ? (
            <Link href="/setup">
              <Button size="lg">
                First-run Setup — Create your company
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="lg">
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <Card key={m.title} className="p-5 text-left">
              <div className="inline-flex rounded-xl bg-emerald-500/10 p-2.5">
                <m.icon className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-white">{m.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{m.desc}</p>
            </Card>
          ))}
        </div>

        <p className="mt-16 text-xs text-zinc-600">
          Next.js + Supabase + AI · Starts empty — Admin sets up, HR registers, employees work
        </p>
      </main>
    </div>
  )
}
