"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, Send } from "lucide-react";
import { Badge, Button, Card, Input, Skeleton } from "@/components/ui";

export default function AnnouncementsPage() {
  const [me, setMe] = useState(null)
  const [items, setItems] = useState(null)
  const [form, setForm] = useState({ title: "", body: "" })
  const [posting, setPosting] = useState(false)

  useEffect(() => { fetch("/api/me").then((r) => r.json()).then(setMe) }, [])
  const load = useCallback(async () => {
    const res = await fetch("/api/announcements")
    if (res.ok) setItems((await res.json()).announcements)
  }, [])
  useEffect(() => { load() }, [load])

  const canPost = me?.profile?.role === "admin" || me?.profile?.role === "hr"

  async function post(e) {
    e.preventDefault()
    setPosting(true)
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setPosting(false)
    if (res.ok) {
      setForm({ title: "", body: "" })
      load()
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">Announcements</h1>
      <p className="mt-1 text-sm text-zinc-500">Company-wide notices</p>

      {canPost && (
        <Card className="mt-6 p-6">
          <form onSubmit={post} className="space-y-4">
            <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Office closed tomorrow" required />
            <Input label="Message" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Detail..." required />
            <Button type="submit" loading={posting}>
              <Send className="h-4 w-4" /> Post Announcement
            </Button>
          </form>
        </Card>
      )}

      <div className="mt-6 space-y-3">
        {!items ? (
          <Skeleton className="h-24" />
        ) : items.length === 0 ? (
          <Card className="flex flex-col items-center py-14 text-center">
            <Megaphone className="h-7 w-7 text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-500">No announcements yet</p>
          </Card>
        ) : (
          items.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">{a.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{a.body}</p>
                </div>
                <div className="text-right">
                  <Badge color="zinc">{a.profiles?.full_name || "—"}</Badge>
                  <p className="mt-1 text-[10px] text-zinc-600">
                    {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
