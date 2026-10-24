"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText, Lock, Play, Printer } from "lucide-react";
import { Badge, Button, Card, Modal, Select, Skeleton } from "@/components/ui";

const money = (n) => 'Rs ' + Math.round(Number(n) || 0).toLocaleString()
const MONTHS = [...Array(12)].map((_, i) => i + 1)

export default function PayrollPage() {
  const [me, setMe] = useState(null)
  useEffect(() => { fetch("/api/me").then((r) => r.json()).then(setMe) }, [])
  if (!me) return <Skeleton className="h-96" />
  const isManager = me.profile?.role === "admin" || me.profile?.role === "hr"
  return isManager ? <ManagerView role={me.profile.role} /> : <EmployeeView />
}

function ManagerView({ role }) {
  const [runs, setRuns] = useState(null)
  const [modal, setModal] = useState(false)
  const [openRun, setOpenRun] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch("/api/payroll")
    if (res.ok) setRuns((await res.json()).runs)
  }, [])
  useEffect(() => { load() }, [load])

  async function createDraft(month, year) {
    setBusy(true)
    const res = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, year }),
    })
    const d = await res.json()
    setBusy(false)
    if (!res.ok) { alert(d.error); return }
    setModal(false)
    load()
    viewRun(d.runId)
  }

  async function viewRun(id) {
    const res = await fetch(`/api/payroll/payslips?run_id=${id}`)
    if (res.ok) setOpenRun(await res.json())
  }

  async function finalize(id) {
    if (!confirm("Finalize? The month will be locked — no further changes will be possible.")) return
    const res = await fetch(`/api/payroll/${id}/finalize`, { method: "PATCH" })
    const d = await res.json()
    if (!res.ok) { alert(d.error); return }
    setOpenRun(null)
    load()
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Payroll Lite</h1>
          <p className="mt-1 text-sm text-zinc-500">Monthly run — gross 1.5×basic, tax slab, deductions</p>
        </div>
        <Button onClick={() => setModal(true)}>
          <Play className="h-4 w-4" /> Create Draft
        </Button>
      </div>

      <Card className="mt-6 overflow-hidden">
        {!runs ? <div className="p-6"><Skeleton className="h-32" /></div>
        : runs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <FileText className="h-8 w-8 text-zinc-600" />
            <p className="mt-3 font-semibold text-white">No payroll runs yet</p>
            <p className="mt-1 text-sm text-zinc-500">Select a month to create a draft</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-5 py-4 font-medium">Period</th>
                <th className="px-5 py-4 font-medium">Total Gross</th>
                <th className="px-5 py-4 font-medium">Total Net</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-5 py-3.5 font-medium text-white">{r.period_month}/{r.period_year}</td>
                  <td className="px-5 py-3.5 text-zinc-300">{money(r.total_gross)}</td>
                  <td className="px-5 py-3.5 text-zinc-300">{money(r.total_net)}</td>
                  <td className="px-5 py-3.5">
                    <Badge color={r.status === "finalized" ? "emerald" : "amber"}>{r.status}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => viewRun(r.id)}>Review</Button>
                      {role === "admin" && r.status === "draft" && (
                        <Button size="sm" onClick={() => finalize(r.id)}><Lock className="h-3.5 w-3.5" /> Finalize</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {role === "hr" && (
        <p className="mt-4 text-xs text-zinc-600">Note: HR prepares the draft — only Admin can finalize.</p>
      )}

      {modal && <DraftModal busy={busy} onClose={() => setModal(false)} onCreate={createDraft} />}

      {openRun && (
        <Modal open onClose={() => setOpenRun(null)} title={`Payslips — ${openRun.run.period_month}/${openRun.run.period_year} (${openRun.run.status})`}>
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase text-zinc-500">
                  <th className="py-2">Employee</th>
                  <th className="py-2">Gross</th>
                  <th className="py-2">Ded.</th>
                  <th className="py-2">Tax</th>
                  <th className="py-2 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {openRun.payslips.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 text-zinc-200">{p.employees?.full_name}</td>
                    <td className="py-2.5 text-zinc-400">{money(p.gross)}</td>
                    <td className="py-2.5 text-zinc-400">{money(p.deduction)}</td>
                    <td className="py-2.5 text-zinc-400">{money(p.tax)}</td>
                    <td className="py-2.5 text-right font-semibold text-white">{money(p.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Deductions: absent + unpaid + 0.5×half-days · Employees apne payslip "My Payslips" se PDF download kar sakte hain
          </p>
        </Modal>
      )}
    </div>
  )
}

function DraftModal({ busy, onClose, onCreate }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() === 0 ? 12 : now.getMonth())
  const [year, setYear] = useState(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear())

  return (
    <Modal open onClose={onClose} title="Create Payroll Draft">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </div>
        <p className="text-xs text-zinc-600">
          Har employee ka: gross = 1.5 × basic, per-day deduction (absent + unpaid + 0.5×half), tax slab, prorate joiners.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={busy} onClick={() => onCreate(month, year)}>Generate Draft</Button>
        </div>
      </div>
    </Modal>
  )
}

/* ============ EMPLOYEE ============ */
function EmployeeView() {
  const [slips, setSlips] = useState(null)
  const [view, setView] = useState(null)

  useEffect(() => {
    fetch("/api/payroll/payslips").then((r) => r.json()).then((d) => setSlips(d.payslips || []))
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">My Payslips</h1>
      <p className="mt-1 text-sm text-zinc-500">PDF download — use "Save as PDF" in the print dialog</p>

      <Card className="mt-6 overflow-hidden">
        {!slips ? <div className="p-6"><Skeleton className="h-24" /></div>
        : slips.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <FileText className="h-8 w-8 text-zinc-600" />
            <p className="mt-3 font-semibold text-white">No payslips yet</p>
            <p className="mt-1 text-sm text-zinc-500">Your payslips will appear here once payroll is processed</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-5 py-4 font-medium">Period</th>
                <th className="px-5 py-4 font-medium">Gross</th>
                <th className="px-5 py-4 font-medium">Net</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {slips.map((p) => (
                <tr key={p.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3.5 font-medium text-white">
                    {p.payroll_runs?.period_month}/{p.payroll_runs?.period_year}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-300">{money(p.gross)}</td>
                  <td className="px-5 py-3.5 font-semibold text-emerald-300">{money(p.net)}</td>
                  <td className="px-5 py-3.5">
                    <Badge color={p.payroll_runs?.status === "finalized" ? "emerald" : "amber"}>
                      {p.payroll_runs?.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button size="sm" variant="secondary" onClick={() => setView(p)}>
                      <Printer className="h-3.5 w-3.5" /> Payslip
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {view && <PayslipPrint slip={view} onClose={() => setView(null)} />}
    </div>
  )
}

function PayslipPrint({ slip, onClose }) {
  const rows = [
    ["Basic", slip.basic], ["HRA (40%)", slip.hra], ["Medical (10%)", slip.medical],
    ["Gross", slip.gross], ["Working days", slip.working_days], ["Payable days", slip.payable_days],
    ["Absent", slip.absent_days], ["Half days", slip.half_days], ["Unpaid leave", slip.unpaid_leave_days],
    ["Deduction", -slip.deduction], ["Tax (monthly)", -slip.tax], ["Net Pay", slip.net],
  ]
  return (
    <Modal open onClose={onClose} title={`Payslip ${slip.payroll_runs?.period_month}/${slip.payroll_runs?.period_year}`}>
      <div id="payslip-print" className="rounded-xl border border-white/10 bg-white p-6 text-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div>
            <p className="text-lg font-bold">Payslip</p>
            <p className="text-xs text-zinc-500">{slip.payroll_runs?.period_month}/{slip.payroll_runs?.period_year} · {slip.payroll_runs?.status}</p>
          </div>
          <p className="text-sm font-semibold text-emerald-700">HCM Lite</p>
        </div>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {rows.map(([label, val]) => (
              <tr key={label} className={label === "Net Pay" ? "border-t-2 border-zinc-800 font-bold" : ""}>
                <td className="py-1.5 text-zinc-600">{label}</td>
                <td className="py-1.5 text-right">{money(Math.abs(val))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-[10px] text-zinc-400">Generated by HCM Lite · illustrative tax slab</p>
      </div>
      <Button className="mt-4 w-full" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Print / Save as PDF
      </Button>
    </Modal>
  )
}
