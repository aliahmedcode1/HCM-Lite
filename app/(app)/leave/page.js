"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarPlus, Check, Sparkles, X } from "lucide-react";
import { Badge, Button, Card, Input, Modal, Select, Skeleton } from "@/components/ui";

const STATUS_COLORS = { approved: "emerald", pending: "amber", rejected: "red", cancelled: "zinc" }

export default function LeavePage() {
  const [me, setMe] = useState(null)
  const [data, setData] = useState(null)
  const [modal, setModal] = useState(false)
  const [prefill, setPrefill] = useState(null)
  const [tab, setTab] = useState("all")
  const search = useSearchParams()

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then(setMe)
    const p = search.get("prefill")
    if (p) {
      try {
        setPrefill(JSON.parse(p))
        setModal(true)
      } catch {}
    }
  }, [search])

  const load = useCallback(async () => {
    const res = await fetch("/api/leave" + (tab === "pending" ? "?status=pending" : ""))
    if (res.ok) setData(await res.json())
  }, [tab])

  useEffect(() => { load() }, [load])

  if (!me || !data) return <Skeleton className="h-96" />
  const isManager = me.profile?.role === "admin" || me.profile?.role === "hr"

  async function decide(id, status) {
    let comment = ""
    if (status === "rejected") {
      comment = prompt("Rejection reason (optional):") || ""
    } else {
      comment = prompt("Approval comment (optional):") || ""
    }
    await fetch(`/api/leave/${id}/decision`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, comment }),
    })
    load()
  }

  async function cancel(id) {
    if (!confirm("Cancel this leave request?")) return
    await fetch("/api/leave", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    load()
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{isManager ? "Leave Management" : "My Leave"}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isManager ? "Approvals inbox and history" : "Balance, apply and history"}
          </p>
        </div>
        {!isManager && (
          <Button onClick={() => { setPrefill(null); setModal(true) }}>
            <CalendarPlus className="h-4 w-4" /> Apply Leave
          </Button>
        )}
      </div>

      {/* Balances (employee) */}
      {data.balances && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.balances.map((b) => (
            <Card key={b.type} className="p-4 text-center">
              <p className="text-xs capitalize text-zinc-500">{b.type}</p>
              <p className="mt-1 text-2xl font-bold text-white">{b.left ?? "∞"}</p>
              <p className="text-[10px] text-zinc-600">used {b.used}{b.quota !== null ? ` / ${b.quota}` : ""}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-2">
        <TabBtn active={tab === "all"} onClick={() => setTab("all")}>All</TabBtn>
        <TabBtn active={tab === "pending"} onClick={() => setTab("pending")}>
          Pending {isManager && data.leaves?.filter((l) => l.status === "pending").length > 0 && (
            <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-300">
              {data.leaves.filter((l) => l.status === "pending").length}
            </span>
          )}
        </TabBtn>
      </div>

      <Card className="mt-4 overflow-hidden">
        {!data.leaves || data.leaves.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">No leave requests</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
                  {isManager && <th className="px-5 py-4 font-medium">Employee</th>}
                  <th className="px-5 py-4 font-medium">Type</th>
                  <th className="px-5 py-4 font-medium">Dates</th>
                  <th className="px-5 py-4 font-medium">Days</th>
                  <th className="px-5 py-4 font-medium">Reason</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody>
                {data.leaves.map((l) => (
                  <tr key={l.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    {isManager && (
                      <td className="px-5 py-3">
                        <span className="font-medium text-white">{l.employees?.full_name}</span>
                        <p className="text-xs text-zinc-600">{l.employees?.departments?.name || "—"}</p>
                      </td>
                    )}
                    <td className="px-5 py-3"><Badge color="cyan">{l.leave_type}</Badge></td>
                    <td className="px-5 py-3 text-zinc-400">{l.start_date} → {l.end_date}</td>
                    <td className="px-5 py-3 text-zinc-300">{l.days}</td>
                    <td className="max-w-40 truncate px-5 py-3 text-xs text-zinc-500">{l.reason || "—"}</td>
                    <td className="px-5 py-3">
                      <Badge color={STATUS_COLORS[l.status]}>{l.status}</Badge>
                      {l.decision_comment && <p className="mt-1 text-[10px] text-zinc-600">"{l.decision_comment}"</p>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isManager && l.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => decide(l.id, "approved")}><Check className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="danger" onClick={() => decide(l.id, "rejected")}><X className="h-3.5 w-3.5" /></Button>
                        </div>
                      )}
                      {!isManager && l.status === "pending" && (
                        <Button size="sm" variant="ghost" onClick={() => cancel(l.id)}>Cancel</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal && (
        <ApplyModal
          prefill={prefill}
          onClose={() => setModal(false)}
          onDone={() => { setModal(false); load() }}
        />
      )}
    </div>
  )
}

function ApplyModal({ prefill, onClose, onDone }) {
  const [form, setForm] = useState({
    leave_type: prefill?.type || "casual",
    start_date: prefill?.start_date || "",
    end_date: prefill?.end_date || "",
    reason: prefill?.reason || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [ok, setOk] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError("")
    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { setError(d.error || "Fail hua"); return }
    setOk(true)
    setTimeout(onDone, 900)
  }

  return (
    <Modal open onClose={onClose} title="Apply for Leave">
      {prefill && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" /> AI pre-filled the form — review and confirm
        </div>
      )}
      {ok ? (
        <p className="py-6 text-center text-sm text-emerald-300">Leave request submitted ✅</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Select label="Leave type" value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })}>
            <option value="casual">Casual</option>
            <option value="sick">Sick</option>
            <option value="annual">Annual</option>
            <option value="unpaid">Unpaid</option>
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            <Input label="End date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
          </div>
          <Input label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. family wedding" />
          <p className="text-[11px] text-zinc-600">Only working days count (weekends and holidays are skipped)</p>
          {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>Submit Request</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function TabBtn({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm transition-colors cursor-pointer ${
        active ? "bg-white/10 font-medium text-white" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  )
}
