"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock3, LogIn, LogOut, Wrench } from "lucide-react";
import { Badge, Button, Card, Input, Modal, Skeleton } from "@/components/ui";

const STATUS_COLORS = {
  present: "emerald", late: "amber", half_day: "cyan",
  missing_checkout: "amber", absent: "red", on_leave: "indigo", no_record: "zinc",
}

export default function AttendancePage() {
  const [me, setMe] = useState(null)

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then(setMe)
  }, [])

  if (!me) return <Skeleton className="h-96" />
  const isManager = me.profile?.role === "admin" || me.profile?.role === "hr"
  return isManager ? <ManagerView me={me} /> : <EmployeeView me={me} />
}

/* ================= EMPLOYEE ================= */
function EmployeeView({ me }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [cal, setCal] = useState(null)
  const [today, setToday] = useState(null)
  const [acting, setActing] = useState(null)
  const [corrModal, setCorrModal] = useState(false)
  const [corrections, setCorrections] = useState([])

  const load = useCallback(async () => {
    const [calRes, corrRes] = await Promise.all([
      fetch(`/api/attendance/calendar?month=${month}`),
      fetch("/api/attendance/corrections"),
    ])
    if (calRes.ok) {
      const d = await calRes.json()
      setCal(d)
      const t = new Date().toISOString().slice(0, 10)
      setToday(d.attendance?.find((a) => a.work_date === t) || null)
    }
    if (corrRes.ok) setCorrections((await corrRes.json()).corrections)
  }, [month])

  useEffect(() => { load() }, [load])

  async function punch(type) {
    setActing(type)
    const res = await fetch(`/api/attendance/${type}`, { method: "POST" })
    const d = await res.json()
    setActing(null)
    if (!res.ok) {
      alert(d.error)
      return
    }
    load()
  }

  const checkedIn = !!today?.check_in
  const checkedOut = !!today?.check_out

  // Calendar grid
  const [y, m] = month.split("-").map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const firstDay = new Date(y, m - 1, 1).getDay()
  const attByDate = {}
  for (const a of cal?.attendance || []) attByDate[a.work_date] = a
  const leaveDates = new Set()
  for (const l of cal?.leaves || []) {
    const s = new Date(l.start_date)
    const e = new Date(l.end_date)
    for (let d = s; d <= e; d.setDate(d.getDate() + 1)) leaveDates.add(d.toISOString().slice(0, 10))
  }
  const holidayDates = new Set((cal?.holidays || []).map((h) => h.holiday_date))
  const weekend = cal?.weekendDays || [6, 0]

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">My Attendance</h1>
      <p className="mt-1 text-sm text-zinc-500">Check in/out and your monthly record</p>

      <Card className="glow-emerald mt-6 p-6">
        <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500">Today · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
            <p className="mt-1.5 text-2xl font-bold capitalize text-white">
              {today ? today.status.replace("_", " ") : "Not checked in"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {today?.check_in ? `In: ${new Date(today.check_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ""}
              {today?.check_out ? ` · Out: ${new Date(today.check_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ""}
              {today?.worked_hours ? ` · ${today.worked_hours}h` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant={checkedIn ? "secondary" : "primary"} loading={acting === "check-in"} disabled={checkedIn} onClick={() => punch("check-in")}>
              <LogIn className="h-4 w-4" /> Check In
            </Button>
            <Button variant={checkedOut ? "secondary" : "primary"} loading={acting === "check-out"} disabled={!checkedIn || checkedOut} onClick={() => punch("check-out")}>
              <LogOut className="h-4 w-4" /> Check Out
            </Button>
            <Button variant="ghost" onClick={() => setCorrModal(true)}>
              <Wrench className="h-4 w-4" /> Request Correction
            </Button>
          </div>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Calendar</h3>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white focus:outline-none [&::-webkit-calendar-picker-indicator]:invert"
          />
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1.5 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <span key={i} className="py-1 text-[10px] font-medium text-zinc-600">{d}</span>
          ))}
          {[...Array(firstDay)].map((_, i) => <span key={"e" + i} />)}
          {[...Array(daysInMonth)].map((_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, "0")}`
            const day = new Date(date + "T00:00:00").getDay()
            const att = attByDate[date]
            const isWeekend = weekend.includes(day)
            const isHoliday = holidayDates.has(date)
            const isLeave = leaveDates.has(date)
            const isToday = date === new Date().toISOString().slice(0, 10)
            let cls = "border-white/5 bg-white/[0.02] text-zinc-600"
            if (att) cls = att.status === "present" ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
              : att.status === "late" ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
              : "border-cyan-500/30 bg-cyan-500/15 text-cyan-300"
            else if (isLeave) cls = "border-indigo-500/30 bg-indigo-500/15 text-indigo-300"
            else if (isHoliday) cls = "border-rose-500/20 bg-rose-500/10 text-rose-300"
            else if (isWeekend) cls = "border-white/5 bg-white/[0.04] text-zinc-700"
            return (
              <div
                key={date}
                title={att ? `${att.status}${att.worked_hours ? ` · ${att.worked_hours}h` : ""}` : isHoliday ? "Holiday" : date}
                className={`relative aspect-square rounded-lg border text-xs leading-8 ${cls} ${isToday ? "ring-2 ring-emerald-400/60" : ""}`}
              >
                {i + 1}
              </div>
            )
          })}
        </div>
      </Card>

      {corrections.length > 0 && (
        <Card className="mt-6 p-6">
          <h3 className="text-sm font-semibold text-white">My Correction Requests</h3>
          <div className="mt-3 space-y-2">
            {corrections.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/5 px-3 py-2 text-sm">
                <span className="text-zinc-300">{c.work_date}</span>
                <span className="text-xs text-zinc-500">{c.reason}</span>
                <Badge color={c.status === "approved" ? "emerald" : c.status === "pending" ? "amber" : "red"} className="ml-auto">{c.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {corrModal && (
        <CorrectionModal
          onClose={() => setCorrModal(false)}
          onDone={() => { setCorrModal(false); load() }}
        />
      )}
    </div>
  )
}

function CorrectionModal({ onClose, onDone }) {
  const [work_date, setWorkDate] = useState("")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/attendance/corrections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ work_date, reason }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { setError(d.error); return }
    onDone()
  }

  return (
    <Modal open onClose={onClose} title="Attendance Correction">
      <form onSubmit={submit} className="space-y-4">
        <Input label="Date" type="date" value={work_date} onChange={(e) => setWorkDate(e.target.value)} required />
        <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Internet was down, please confirm with HR" required />
        {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Send Request</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ================= MANAGER ================= */
function ManagerView({ me }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [board, setBoard] = useState(null)
  const [corrections, setCorrections] = useState([])
  const [tab, setTab] = useState("board")
  const [myToday, setMyToday] = useState(null)
  const [punching, setPunching] = useState(null)

  const canCheckIn = !!me?.profile?.employee_id
  const todayStr = new Date().toISOString().slice(0, 10)

  const load = useCallback(async () => {
    const fetches = [
      fetch(`/api/attendance/board?date=${date}`),
      fetch("/api/attendance/corrections"),
    ]
    if (canCheckIn) fetches.push(fetch(`/api/attendance/calendar?month=${todayStr.slice(0, 7)}`))
    const [b, c, cal] = await Promise.all(fetches)
    if (b.ok) setBoard(await b.json())
    if (c.ok) setCorrections((await c.json()).corrections)
    if (cal && cal.ok) {
      const d = await cal.json()
      setMyToday(d.attendance?.find((a) => a.work_date === todayStr) || null)
    }
  }, [date, canCheckIn, todayStr])

  useEffect(() => { load() }, [load])

  async function punch(type) {
    setPunching(type)
    const res = await fetch(`/api/attendance/${type}`, { method: "POST" })
    const d = await res.json()
    setPunching(null)
    if (!res.ok) {
      alert(d.error)
      return
    }
    load()
  }

  async function decide(id, status) {
    await fetch("/api/attendance/corrections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    load()
  }

  const pending = corrections.filter((c) => c.status === "pending")

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Attendance</h1>
          <p className="mt-1 text-sm text-zinc-500">Daily board and corrections</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none [&::-webkit-calendar-picker-indicator]:invert"
        />
      </div>

      {canCheckIn && (
        <Card className="mt-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500">My check-in today</p>
              <p className="mt-1 text-lg font-bold capitalize text-white">
                {myToday ? myToday.status.replace("_", " ") : "Not checked in"}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                size="sm"
                variant={myToday?.check_in ? "secondary" : "primary"}
                loading={punching === "check-in"}
                disabled={!!myToday?.check_in}
                onClick={() => punch("check-in")}
              >
                <LogIn className="h-4 w-4" /> Check In
              </Button>
              <Button
                size="sm"
                variant={myToday?.check_out ? "secondary" : "primary"}
                loading={punching === "check-out"}
                disabled={!myToday?.check_in || !!myToday?.check_out}
                onClick={() => punch("check-out")}
              >
                <LogOut className="h-4 w-4" /> Check Out
              </Button>
            </div>
          </div>
        </Card>
      )}

      {board && (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MiniStat icon={CheckCircle2} label="Present" value={board.summary.present} color="text-emerald-400" />
          <MiniStat icon={Clock3} label="Late" value={board.summary.late} color="text-amber-400" />
          <MiniStat icon={CalendarCheck} label="Half Day" value={board.summary.halfDay} color="text-cyan-400" />
          <MiniStat icon={LogIn} label="No Record" value={board.summary.noRecord} color="text-zinc-400" />
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <TabBtn active={tab === "board"} onClick={() => setTab("board")}>Daily Board</TabBtn>
        <TabBtn active={tab === "corrections"} onClick={() => setTab("corrections")}>
          Corrections {pending.length > 0 && <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-300">{pending.length}</span>}
        </TabBtn>
      </div>

      {tab === "board" && (
        <Card className="mt-4 overflow-hidden">
          {!board ? <div className="p-6"><Skeleton className="h-40" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-5 py-4 font-medium">Employee</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4 font-medium">Check In</th>
                    <th className="px-5 py-4 font-medium">Check Out</th>
                    <th className="px-5 py-4 font-medium">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {board.board.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3">
                        <span className="font-medium text-white">{row.full_name}</span>
                        <p className="text-xs text-zinc-600">{row.code} · {row.departments?.name || "—"}</p>
                      </td>
                      <td className="px-5 py-3">
                        {row.attendance ? (
                          <Badge color={STATUS_COLORS[row.attendance.status] || "zinc"}>{row.attendance.status.replace("_", " ")}</Badge>
                        ) : (
                          <Badge color="zinc">no record</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-zinc-400">
                        {row.attendance?.check_in ? new Date(row.attendance.check_in).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-5 py-3 text-zinc-400">
                        {row.attendance?.check_out ? new Date(row.attendance.check_out).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-5 py-3 text-zinc-400">{row.attendance?.worked_hours || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "corrections" && (
        <Card className="mt-4 p-6">
          {corrections.length === 0 && <p className="text-sm text-zinc-500">No correction requests</p>}
          <div className="space-y-2">
            {corrections.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm">
                <span className="font-medium text-white">{c.employees?.full_name}</span>
                <span className="text-zinc-400">{c.work_date}</span>
                <span className="text-xs text-zinc-500">"{c.reason}"</span>
                {c.status === "pending" ? (
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" onClick={() => decide(c.id, "approved")}>Approve</Button>
                    <Button size="sm" variant="danger" onClick={() => decide(c.id, "rejected")}>Reject</Button>
                  </div>
                ) : (
                  <Badge color={c.status === "approved" ? "emerald" : "red"} className="ml-auto">{c.status}</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, color }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <Icon className={`h-5 w-5 ${color}`} />
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </Card>
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
