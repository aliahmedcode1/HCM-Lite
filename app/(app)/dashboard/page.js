"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Clock3,
  FileText,
  Flame,
  LogIn,
  LogOut,
  ScrollText,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { Badge, Button, Card, Skeleton, StatCard } from "@/components/ui";

const money = (n) => 'Rs ' + Math.round(Number(n) || 0).toLocaleString()

export default function DashboardPage() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ error: true }))
  }, [])

  if (!data) return <Loading />
  if (data.error) return <p className="text-zinc-400">Could not load the dashboard — please refresh.</p>

  if (data.role === "admin") return <AdminDash data={data} />
  if (data.role === "hr") return <HrDash data={data} />
  return <EmployeeDash data={data} />
}

function Loading() {
  return (
    <div>
      <Skeleton className="h-8 w-56" />
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="mt-8 h-64" />
    </div>
  )
}

/* ============ ADMIN ============ */
function AdminDash({ data }) {
  const { kpis, byDept, gender, auditFeed } = data
  const maxDept = Math.max(1, ...byDept.map((d) => d.count))

  return (
    <div>
      <PageHead title="Admin Dashboard" sub="Company-wide numbers — live from the app" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Headcount" value={kpis.headcount} />
        <StatCard icon={TrendingUp} label="Attrition YTD" value={kpis.attrition + '%'} />
        <StatCard icon={Wallet} label="Payroll Cost" value={money(kpis.payrollCost)} />
        <StatCard icon={Wallet} label="Avg Salary (gross)" value={money(kpis.avgSalary)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-white">Headcount by Department</h3>
          <div className="mt-5 space-y-3">
            {byDept.length === 0 && <p className="text-xs text-zinc-500">Add employees to departments to see the breakdown</p>}
            {byDept.map((d) => (
              <div key={d.name}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-zinc-300">{d.name}</span>
                  <span className="text-zinc-500">{d.count}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
                    style={{ width: `${(d.count / maxDept) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Audit Feed</h3>
            <Link href="/audit" className="text-xs text-emerald-400 hover:text-emerald-300">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-2.5">
            {auditFeed.length === 0 && <p className="text-xs text-zinc-500">No actions logged yet</p>}
            {auditFeed.map((a) => (
              <div key={a.id} className="flex items-center gap-3 text-xs">
                <Badge color="zinc">{a.action}</Badge>
                <span className="text-zinc-300">{a.entity}</span>
                <span className="text-zinc-600">{a.actor_name}</span>
                <span className="ml-auto text-zinc-600">{new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ============ HR ============ */
function HrDash({ data }) {
  const { kpis, trend, topLate, leaveByType } = data
  const maxTrend = Math.max(1, ...trend.map((t) => t.total))

  return (
    <div>
      <PageHead title="HR Dashboard" sub="Today's operations — live numbers" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Headcount" value={kpis.headcount} />
        <StatCard icon={UserCheck} label="Present Today" value={kpis.present} />
        <StatCard icon={Clock3} label="Late Today" value={kpis.late} />
        <StatCard icon={ClipboardList} label="Pending Approvals" value={kpis.pendingLeaves} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4 text-center">
          <p className="text-xs text-zinc-500">On Leave Today</p>
          <p className="mt-1 text-2xl font-bold text-white">{kpis.onLeave}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-zinc-500">Pending Corrections</p>
          <p className="mt-1 text-2xl font-bold text-white">{kpis.pendingCorrections}</p>
        </Card>
        <Card className="col-span-2 flex items-center justify-between p-4">
          <div>
            <p className="text-xs text-zinc-500">Quick actions</p>
            <div className="mt-2 flex gap-2">
              <Link href="/leave"><Button size="sm" variant="secondary">Approve leave</Button></Link>
              <Link href="/employees"><Button size="sm" variant="secondary">Add employee</Button></Link>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-white">Attendance Trend (7 days)</h3>
          <div className="mt-5 flex h-36 items-end gap-2">
            {trend.map((t) => (
              <div key={t.date} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-28 w-full items-end rounded-lg bg-white/5">
                  <div
                    className="w-full rounded-lg bg-gradient-to-t from-emerald-500/80 to-teal-400/80 transition-all"
                    style={{ height: `${t.total ? (t.present / maxTrend) * 100 : 0}%` }}
                    title={`${t.present}/${t.total}`}
                  />
                </div>
                <span className="text-[10px] text-zinc-600">{t.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-white">Top Late-comers (this month)</h3>
          <div className="mt-4 space-y-2">
            {topLate.length === 0 && <p className="text-xs text-zinc-500">No one was late this month 👏</p>}
            {topLate.map((l, i) => (
              <div key={l.name} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-xs text-zinc-600">#{i + 1}</span>
                <span className="text-zinc-200">{l.name}</span>
                <span className="text-xs text-zinc-500">{l.dept}</span>
                <Badge color="amber" className="ml-auto">
                  <Flame className="h-3 w-3" /> {l.count}x
                </Badge>
              </div>
            ))}
          </div>
          {leaveByType.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold text-white">Leave by Type (month)</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {leaveByType.map((l) => (
                  <Badge key={l.type} color="cyan">{l.type}: {l.days} days</Badge>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

/* ============ EMPLOYEE ============ */
function EmployeeDash({ data }) {
  const { kpis, balances, lastPayslip, employee } = data
  const [acting, setActing] = useState(null)

  if (data.noEmployee || !kpis) {
    return (
      <div>
        <PageHead title="Dashboard" sub="Employee dashboard" />
        <Card className="p-10 text-center">
          <p className="font-semibold text-white">No employee record found</p>
          <p className="mt-2 text-sm text-zinc-500">
            This account is not linked to an employee — please confirm your registration with HR.
          </p>
        </Card>
      </div>
    )
  }

  async function punch(type) {
    setActing(type)
    const res = await fetch(`/api/attendance/${type}`, { method: "POST" })
    const d = await res.json()
    setActing(null)
    if (!res.ok) {
      alert(d.error || "Fail hua")
      return
    }
    window.location.reload()
  }

  return (
    <div>
      <PageHead
        title={`Welcome, ${employee?.full_name?.split(' ')[0] || 'there'}! 👋`}
        sub={employee ? `${employee.code} · ${employee.department || '—'}` : 'Employee dashboard'}
      />

      {/* Check-in widget */}
      <Card className="glow-emerald relative overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10" />
        <div className="relative flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Today</p>
            <p className="mt-1 text-3xl font-bold capitalize text-white">
              {kpis.todayStatus === 'no_record' ? 'Not checked in' : kpis.todayStatus.replace('_', ' ')}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Office 09:00 · Grace 15 min</p>
          </div>
          <div className="flex gap-3">
            <Button
              size="lg"
              variant={kpis.checkedIn ? "secondary" : "primary"}
              loading={acting === "check-in"}
              disabled={kpis.checkedIn}
              onClick={() => punch("check-in")}
            >
              <LogIn className="h-4 w-4" /> Check In
            </Button>
            <Button
              size="lg"
              variant={kpis.checkedOut ? "secondary" : "primary"}
              loading={acting === "check-out"}
              disabled={!kpis.checkedIn || kpis.checkedOut}
              onClick={() => punch("check-out")}
            >
              <LogOut className="h-4 w-4" /> Check Out
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Clock3} label="Hours (7 days)" value={kpis.hoursThisWeek + 'h'} />
        <StatCard icon={Flame} label="Late (7 days)" value={kpis.lateThisMonth} />
        <StatCard icon={ClipboardList} label="Leave Left (casual)" value={balances?.find((b) => b.type === 'casual')?.left ?? '—'} />
        <StatCard icon={FileText} label="Last Payslip" value={lastPayslip ? money(lastPayslip.net) : '—'} />
      </div>

      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Leave Balance ({new Date().getFullYear()})</h3>
          <Link href="/leave" className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
            Apply leave <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {balances?.map((b) => (
            <div key={b.type} className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-center">
              <p className="text-xs capitalize text-zinc-500">{b.type}</p>
              <p className="mt-1 text-2xl font-bold text-white">{b.left ?? '∞'}</p>
              <p className="text-[10px] text-zinc-600">used {b.used}</p>
            </div>
          ))}
        </div>
      </Card>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-zinc-600">
        <Sparkles className="h-3 w-3" /> Ask the AI assistant about your data or company policy — bottom-right "Ask AI"
      </p>
    </div>
  )
}

function PageHead({ title, sub }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
      <p className="mt-1 text-sm text-zinc-500">{sub}</p>
    </div>
  )
}
