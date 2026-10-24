"use client";

import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { Badge, Button, Card, Input, Skeleton } from "@/components/ui";

export default function ProfilePage() {
  const [me, setMe] = useState(null)
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => {
      setMe(d)
      setPhone(d.employee?.phone || "")
      setAddress(d.employee?.address || "")
    })
  }, [])

  async function save(e) {
    e.preventDefault()
    await fetch(`/api/employees/${me.employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, address }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!me?.employee) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        {!me ? <Skeleton className="mt-6 h-48" /> : (
          <Card className="mt-6 p-8 text-center">
            <Briefcase className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-500">
              You don't have an employee record (Admin/HR account). Only employees have profiles.
            </p>
          </Card>
        )}
      </div>
    )
  }

  const e = me.employee

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">My Profile</h1>
      <p className="mt-1 text-sm text-zinc-500">You can edit phone and address — other changes go through HR</p>

      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">{e.full_name}</h2>
            <p className="mt-1 text-sm text-zinc-500">{e.code} · {e.departments?.name || "—"} · {e.designation || "—"}</p>
          </div>
          <div className="flex gap-2">
            <Badge color="indigo">{e.status}</Badge>
            <Badge color="zinc">Joined {e.join_date}</Badge>
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-white/5 pt-6 sm:grid-cols-2">
          <div>
            <p className="text-xs text-zinc-500">Email</p>
            <p className="mt-1 text-sm text-zinc-200">{e.email}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Department</p>
            <p className="mt-1 text-sm text-zinc-200">{e.departments?.name || "—"}</p>
          </div>
        </div>

        <form onSubmit={save} className="mt-6 grid gap-4 border-t border-white/5 pt-6 sm:grid-cols-2">
          <Input label="Phone" value={phone} onChange={(ev) => setPhone(ev.target.value)} />
          <Input label="Address" value={address} onChange={(ev) => setAddress(ev.target.value)} />
          <div className="sm:col-span-2">
            <Button type="submit">{saved ? "Saved ✅" : "Save Changes"}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
