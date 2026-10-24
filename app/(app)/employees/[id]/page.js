"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarCheck, ClipboardList, FileText, Mail, Phone } from "lucide-react";
import { Badge, Card, Skeleton } from "@/components/ui";

const money = (n) => 'Rs ' + Math.round(Number(n) || 0).toLocaleString()

const STATUS_COLORS = {
  present: "emerald", late: "amber", half_day: "cyan",
  missing_checkout: "amber", absent: "red", on_leave: "indigo",
}

export default function Employee360() {
  const { id } = useParams()
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then((r) => r.json())
      .then(setData)
  }, [id])

  if (!data?.employee) {
    return <div className="py-20"><Skeleton className="h-8 w-64" /><Skeleton className="mt-8 h-64" /></div>
  }

  const { employee: e, attendance, leaves, payslips } = data

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Employee 360</h1>
      <p className="mt-1 text-sm text-zinc-500">Everything at a glance — profile, attendance, leave, payslips</p>

      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">{e.full_name}</h2>
              <Badge color={e.status === "active" ? "emerald" : e.status === "probation" ? "amber" : "red"}>{e.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{e.code} · {e.departments?.name || "—"} · {e.designation || "—"}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {e.email}</span>
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {e.phone || "—"}</span>
              <span>Joined {e.join_date}</span>
              {e.exit_date && <span className="text-red-400">Exited {e.exit_date}</span>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500">Gross salary (monthly)</p>
            <p className="text-2xl font-bold text-white">{money(e.basic_salary * 1.5)}</p>
            <p className="text-xs text-zinc-600">Basic {money(e.basic_salary)}</p>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <CalendarCheck className="h-4 w-4 text-emerald-400" /> Attendance (last 30)
          </h3>
          <div className="mt-4 grid grid-cols-10 gap-1.5">
            {attendance.length === 0 && <p className="col-span-10 text-xs text-zinc-500">No records</p>}
            {attendance.map((a) => (
              <div
                key={a.id}
                title={`${a.work_date} — ${a.status}${a.worked_hours ? ` (${a.worked_hours}h)` : ""}`}
                className={`aspect-square rounded-md border text-center text-[9px] leading-6 ${
                  a.status === "present" ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                  : a.status === "late" ? "border-amber-500/30 bg-amber-500/20 text-amber-300"
                  : a.status === "half_day" ? "border-cyan-500/30 bg-cyan-500/20 text-cyan-300"
                  : "border-white/10 bg-white/5 text-zinc-500"
                }`}
              >
                {a.work_date.slice(8)}
              </div>
            ))}
          </div>
          {attendance.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-zinc-500">
              <Badge color="emerald">present</Badge>
              <Badge color="amber">late</Badge>
              <Badge color="cyan">half day</Badge>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <ClipboardList className="h-4 w-4 text-emerald-400" /> Leave History
          </h3>
          <div className="mt-4 space-y-2">
            {leaves.length === 0 && <p className="text-xs text-zinc-500">No leave records</p>}
            {leaves.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
                <Badge color="cyan">{l.leave_type}</Badge>
                <span className="text-zinc-400">{l.start_date} → {l.end_date}</span>
                <span className="text-xs text-zinc-600">{l.days}d</span>
                <Badge
                  color={l.status === "approved" ? "emerald" : l.status === "pending" ? "amber" : l.status === "rejected" ? "red" : "zinc"}
                  className="ml-auto"
                >
                  {l.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {payslips?.length > 0 && (
        <Card className="mt-6 p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileText className="h-4 w-4 text-emerald-400" /> Payslips
          </h3>
          <div className="mt-4 space-y-2">
            {payslips.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-sm">
                <span className="text-zinc-300">
                  {p.payroll_runs?.period_month}/{p.payroll_runs?.period_year}
                </span>
                <span className="text-xs text-zinc-600">gross {money(p.gross)} · tax {money(p.tax)} · ded {money(p.deduction)}</span>
                <span className="ml-auto font-semibold text-white">{money(p.net)}</span>
                <Badge color={p.payroll_runs?.status === "finalized" ? "emerald" : "amber"}>
                  {p.payroll_runs?.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
