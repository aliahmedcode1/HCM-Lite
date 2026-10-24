"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, CalendarOff, Plus, Trash2 } from "lucide-react";
import { Button, Card, Input, Select, Skeleton } from "@/components/ui";

export default function OrgPage() {
  const [org, setOrg] = useState(null)
  const [settings, setSettings] = useState(null)
  const [saved, setSaved] = useState(false)
  const [newDept, setNewDept] = useState("")
  const [newDesig, setNewDesig] = useState("")
  const [newHol, setNewHol] = useState({ holiday_date: "", name: "" })

  const load = useCallback(async () => {
    const res = await fetch("/api/org")
    if (res.ok) {
      const d = await res.json()
      setOrg(d)
      setSettings(d.settings || {})
    }
  }, [])
  useEffect(() => { load() }, [load])

  async function saveSettings(e) {
    e.preventDefault()
    await fetch("/api/org", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...settings,
        grace_minutes: Number(settings.grace_minutes),
        half_day_hours: Number(settings.half_day_hours),
        office_radius_m: Number(settings.office_radius_m || 150),
      }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function addEntity(entity, body) {
    await fetch(`/api/org/${entity}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    load()
  }

  async function delEntity(entity, id) {
    await fetch(`/api/org/${entity}?id=${id}`, { method: "DELETE" })
    load()
  }

  async function saveQuota(id, annual_quota) {
    await fetch("/api/org/leave_types", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, annual_quota: annual_quota === "" ? null : Number(annual_quota) }),
    })
    load()
  }

  if (!org) return <Skeleton className="h-96" />

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Org Setup</h1>
      <p className="mt-1 text-sm text-zinc-500">Company rules — these apply to attendance, leave and payroll</p>

      <Card className="mt-6 p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Building2 className="h-4 w-4 text-emerald-400" /> Company Settings
        </h3>
        <form onSubmit={saveSettings} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Company name" value={settings.name || ""} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
          <Input label="Office start (HH:MM)" type="time" value={(settings.office_start || "09:00").slice(0, 5)} onChange={(e) => setSettings({ ...settings, office_start: e.target.value + ":00" })} />
          <Input label="Grace minutes (late after)" type="number" value={settings.grace_minutes ?? 15} onChange={(e) => setSettings({ ...settings, grace_minutes: e.target.value })} />
          <Input label="Half-day under (hours)" type="number" value={settings.half_day_hours ?? 5} onChange={(e) => setSettings({ ...settings, half_day_hours: e.target.value })} />
          <Input label="Office latitude" value={settings.office_lat ?? ""} onChange={(e) => setSettings({ ...settings, office_lat: e.target.value })} placeholder="24.8607" />
          <Input label="Office longitude" value={settings.office_lng ?? ""} onChange={(e) => setSettings({ ...settings, office_lng: e.target.value })} placeholder="67.0011" />
          <Input label="Geofence radius (m)" type="number" value={settings.office_radius_m ?? 150} onChange={(e) => setSettings({ ...settings, office_radius_m: e.target.value })} />
          <div className="flex items-end">
            <Button type="submit" className="w-full">{saved ? "Saved ✅" : "Save Settings"}</Button>
          </div>
        </form>
        <div className="mt-4">
          <p className="mb-2 text-xs text-zinc-500">Weekend days</p>
          <div className="flex flex-wrap gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => {
              const active = (settings.weekend_days || [6, 0]).includes(i)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    const cur = settings.weekend_days || [6, 0]
                    setSettings({
                      ...settings,
                      weekend_days: active ? cur.filter((x) => x !== i) : [...cur, i],
                    })
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs cursor-pointer ${
                    active ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-zinc-500"
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-white">Departments</h3>
          <div className="mt-4 flex gap-2">
            <Input value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="e.g. Engineering" />
            <Button onClick={() => { if (newDept.trim()) { addEntity("departments", { name: newDept.trim() }); setNewDept("") } }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {org.departments.map((d) => (
              <span key={d.id} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
                {d.name}
                <button onClick={() => delEntity("departments", d.id)} className="text-zinc-600 hover:text-red-400 cursor-pointer">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-white">Designations</h3>
          <div className="mt-4 flex gap-2">
            <Input value={newDesig} onChange={(e) => setNewDesig(e.target.value)} placeholder="e.g. Frontend Developer" />
            <Button onClick={() => { if (newDesig.trim()) { addEntity("designations", { name: newDesig.trim() }); setNewDesig("") } }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {org.designations.map((d) => (
              <span key={d.id} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
                {d.name}
                <button onClick={() => delEntity("designations", d.id)} className="text-zinc-600 hover:text-red-400 cursor-pointer">
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-white">Leave Types & Quotas (per year)</h3>
          <div className="mt-4 space-y-2">
            {org.leaveTypes.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <span className="w-20 text-sm capitalize text-zinc-300">{t.name}</span>
                <Input
                  type="number"
                  defaultValue={t.annual_quota ?? ""}
                  onBlur={(e) => saveQuota(t.id, e.target.value)}
                  className="max-w-32"
                  placeholder="unlimited"
                />
                <span className="text-xs text-zinc-600">days {t.annual_quota === null ? "(unlimited)" : ""}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
            <CalendarOff className="h-4 w-4 text-emerald-400" /> Public Holidays
          </h3>
          <div className="mt-4 flex gap-2">
            <Input type="date" value={newHol.holiday_date} onChange={(e) => setNewHol({ ...newHol, holiday_date: e.target.value })} />
            <Input value={newHol.name} onChange={(e) => setNewHol({ ...newHol, name: e.target.value })} placeholder="Eid ul Fitr" />
            <Button onClick={() => { if (newHol.holiday_date && newHol.name) { addEntity("holidays", newHol); setNewHol({ holiday_date: "", name: "" }) } }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-4 space-y-1.5">
            {org.holidays.map((h) => (
              <div key={h.id} className="flex items-center gap-3 rounded-lg border border-white/5 px-3 py-2 text-sm">
                <span className="text-zinc-300">{h.name}</span>
                <span className="ml-auto text-xs text-zinc-500">{h.holiday_date}</span>
                <button onClick={() => delEntity("holidays", h.id)} className="text-zinc-600 hover:text-red-400 cursor-pointer">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
