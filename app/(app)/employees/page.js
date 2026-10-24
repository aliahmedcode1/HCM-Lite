"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Copy, KeyRound, Search, UserPlus } from "lucide-react";
import { Badge, Button, Card, Input, Modal, Select, Skeleton } from "@/components/ui";

const money = (n) => 'Rs ' + Math.round(Number(n) || 0).toLocaleString()

export default function EmployeesPage() {
  const [data, setData] = useState(null)
  const [org, setOrg] = useState(null)
  const [q, setQ] = useState("")
  const [dept, setDept] = useState("")
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [reset, setReset] = useState(null) // { name, password }

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (dept) params.set("dept", dept)
    params.set("page", page)
    const res = await fetch(`/api/employees?${params}`)
    if (res.ok) setData(await res.json())
  }, [q, dept, page])

  useEffect(() => {
    fetch("/api/org").then((r) => r.json()).then(setOrg)
  }, [])

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, q])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1

  async function doReset(emp) {
    if (!confirm(`Reset ${emp.full_name}'s password?`)) return
    const res = await fetch("/api/users/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: emp.id }),
    })
    const d = await res.json()
    if (!res.ok) {
      alert(d.error || "Reset failed")
      return
    }
    setReset({ name: d.name, password: d.tempPassword })
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Employees</h1>
          <p className="mt-1 text-sm text-zinc-500">{data ? `${data.total} total` : "Loading..."}</p>
        </div>
        <Button onClick={() => setModal(true)}>
          <UserPlus className="h-4 w-4" /> Register Employee
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
            placeholder="Search name, email, code..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-400/50 focus:outline-none"
          />
        </div>
        <select
          value={dept}
          onChange={(e) => { setDept(e.target.value); setPage(1) }}
          className="cursor-pointer rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none [&>option]:bg-zinc-900"
        >
          <option value="">All departments</option>
          {org?.departments?.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      <Card className="mt-6 overflow-hidden">
        {!data ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : data.employees.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="font-semibold text-white">No employees yet</p>
            <p className="mt-1 text-sm text-zinc-500">Register an employee — their login is created automatically</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-4 font-medium">Employee</th>
                  <th className="px-5 py-4 font-medium">Department</th>
                  <th className="px-5 py-4 font-medium">Joined</th>
                  <th className="px-5 py-4 font-medium">Gross Salary</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((e) => (
                  <tr key={e.id} className="group border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    <td className="px-5 py-3.5">
                      <Link href={`/employees/${e.id}`} className="font-medium text-white hover:text-emerald-300">
                        {e.full_name}
                      </Link>
                      <p className="text-xs text-zinc-600">{e.code} · {e.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-zinc-300">{e.departments?.name || "—"}</td>
                    <td className="px-5 py-3.5 text-zinc-500">{e.join_date}</td>
                    <td className="px-5 py-3.5 text-zinc-300">{money(e.basic_salary * 1.5)}</td>
                    <td className="px-5 py-3.5">
                      <Badge color={e.status === "active" ? "emerald" : e.status === "probation" ? "amber" : "red"}>
                        {e.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => doReset(e)}
                        title="Reset password"
                        className="rounded-lg p-2 text-zinc-600 transition-all hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-zinc-500">Page {page} / {totalPages}</span>
          <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {modal && (
        <RegisterModal
          org={org}
          onClose={() => setModal(false)}
          onDone={() => {
            setModal(false)
            load()
          }}
        />
      )}

      {reset && (
        <Modal open onClose={() => setReset(null)} title="Password Reset ✅">
          <p className="text-sm text-zinc-300">
            <strong className="text-white">{reset.name}</strong>&apos;s new temporary password:
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <code className="flex-1 break-all font-mono text-sm text-emerald-300">{reset.password}</code>
            <button
              onClick={() => navigator.clipboard.writeText(reset.password)}
              className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Yeh ek baar dikha raha hai — copy kar lo. Employee pehli login par change karega.
          </p>
          <Button className="mt-5 w-full" onClick={() => setReset(null)}>Done</Button>
        </Modal>
      )}
    </div>
  )
}

function RegisterModal({ org, onClose, onDone }) {
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", gender: "male",
    department_id: "", designation: "", join_date: new Date().toISOString().slice(0, 10),
    status: "active", basic_salary: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [created, setCreated] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError("")
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, basic_salary: Number(form.basic_salary) }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.tempPassword) {
      setCreated({ name: form.full_name, password: data.tempPassword })
      return
    }
    if (!res.ok) {
      setError(data.error || "Fail hua")
      return
    }
    onDone()
  }

  if (created) {
    return (
      <Modal open onClose={onClose} title="Employee Registered ✅">
        <p className="text-sm text-zinc-300">
          <strong className="text-white">{created.name}</strong>'s account is ready.
          Share this temporary password with the employee — it must be changed on first sign-in:
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <code className="flex-1 break-all font-mono text-sm text-emerald-300">{created.password}</code>
          <button
            onClick={() => navigator.clipboard.writeText(created.password)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white cursor-pointer"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <Button className="mt-5 w-full" onClick={onDone}>Done</Button>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title="Register Employee">
      <form onSubmit={submit} className="space-y-4">
        <Input label="Full name *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
        <Input label="Email (login banega) *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Department *" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} required>
            <option value="">Select...</option>
            {org?.departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Input label="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Frontend Dev" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Join date *" type="date" value={form.join_date} onChange={(e) => setForm({ ...form, join_date: e.target.value })} required />
          <Input label="Basic salary (Rs) *" type="number" min="1" value={form.basic_salary} onChange={(e) => setForm({ ...form, basic_salary: e.target.value })} required />
        </div>
        <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="active">Active</option>
          <option value="probation">Probation</option>
        </Select>

        {error && (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Register + Create Login</Button>
        </div>
      </form>
    </Modal>
  )
}
