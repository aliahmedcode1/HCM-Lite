"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, ShieldCheck, UserPlus } from "lucide-react";
import { Badge, Button, Card, Input, Modal, Skeleton } from "@/components/ui";

export default function UsersPage() {
  const [users, setUsers] = useState(null)
  const [modal, setModal] = useState(false)
  const [reset, setReset] = useState(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/users")
    if (res.ok) setUsers((await res.json()).users)
  }, [])
  useEffect(() => { load() }, [load])

  async function toggleActive(u) {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, active: !u.active }),
    })
    load()
  }

  async function doReset(u) {
    if (!confirm(`Reset ${u.full_name}'s password?`)) return
    const res = await fetch("/api/users/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id }),
    })
    const d = await res.json()
    if (!res.ok) {
      alert(d.error || "Reset failed")
      return
    }
    setReset({ name: d.name, password: d.tempPassword })
    load()
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Users & HR</h1>
          <p className="mt-1 text-sm text-zinc-500">Create HR logins and deactivate accounts</p>
        </div>
        <Button onClick={() => setModal(true)}>
          <UserPlus className="h-4 w-4" /> Create HR Login
        </Button>
      </div>

      <Card className="mt-6 overflow-hidden">
        {!users ? <div className="p-6"><Skeleton className="h-32" /></div> : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-5 py-4 font-medium">Name</th>
                <th className="px-5 py-4 font-medium">Role</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3.5 font-medium text-white">{u.full_name}</td>
                  <td className="px-5 py-3.5">
                    <Badge color={u.role === "admin" ? "emerald" : u.role === "hr" ? "cyan" : "indigo"}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge color={u.active ? "emerald" : "red"}>{u.active ? "active" : "deactivated"}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => doReset(u)}>
                        Reset Password
                      </Button>
                      {u.role !== "admin" && (
                        <Button size="sm" variant={u.active ? "danger" : "secondary"} onClick={() => toggleActive(u)}>
                          {u.active ? "Deactivate" : "Activate"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {modal && <CreateHRModal onClose={() => setModal(false)} onDone={() => { setModal(false); load() }} />}

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
          <p className="mt-3 text-xs text-zinc-500">Copy kar lo — yeh ek baar dikha raha hai.</p>
          <Button className="mt-5 w-full" onClick={() => setReset(null)}>Done</Button>
        </Modal>
      )}
    </div>
  )
}

function CreateHRModal({ onClose, onDone }) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [tempPassword, setTempPassword] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { setError(d.error); return }
    setTempPassword(d.tempPassword)
  }

  return (
    <Modal open onClose={onClose} title="Create HR Login">
      {tempPassword ? (
        <div>
          <p className="text-sm text-zinc-300">
            <strong className="text-white">{fullName}</strong>'s HR account is ready. Share the temporary password (it must be changed on first sign-in):
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <code className="flex-1 break-all font-mono text-sm text-emerald-300">{tempPassword}</code>
            <button onClick={() => navigator.clipboard.writeText(tempPassword)} className="rounded-lg p-2 text-zinc-400 hover:text-white cursor-pointer">
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <Button className="mt-5 w-full" onClick={onDone}>Done</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input label="HR name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="Email (login)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>
              <ShieldCheck className="h-4 w-4" /> Create
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
