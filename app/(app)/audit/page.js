"use client";

import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { Badge, Card, Skeleton } from "@/components/ui";

const ACTION_COLORS = {
  create: "emerald", update: "cyan", approve: "emerald",
  reject: "red", finalize: "indigo", delete: "red",
}

export default function AuditPage() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch(`/api/audit?page=${page}`).then((r) => r.json()).then(setData)
  }, [page])

  const totalPages = data ? Math.ceil((data.total || 0) / 30) : 1

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
        <ScrollText className="h-6 w-6 text-emerald-400" /> Audit Log
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {data ? `${data.total} actions` : "Loading..."} — immutable record
      </p>

      <Card className="mt-6 overflow-hidden">
        {!data ? <div className="p-6"><Skeleton className="h-40" /></div> : data.logs.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">No actions logged yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-4 font-medium">When</th>
                  <th className="px-5 py-4 font-medium">Actor</th>
                  <th className="px-5 py-4 font-medium">Action</th>
                  <th className="px-5 py-4 font-medium">Entity</th>
                  <th className="px-5 py-4 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((l) => (
                  <tr key={l.id} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 text-xs text-zinc-500">
                      {new Date(l.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-5 py-3 text-zinc-300">{l.actor_name || "system"}</td>
                    <td className="px-5 py-3">
                      <Badge color={ACTION_COLORS[l.action] || "zinc"}>{l.action}</Badge>
                    </td>
                    <td className="px-5 py-3 text-zinc-400">{l.entity}</td>
                    <td className="max-w-64 truncate px-5 py-3 font-mono text-[11px] text-zinc-600">
                      {l.after_json ? JSON.stringify(l.after_json) : "—"}
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
          <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
          <span className="text-xs text-zinc-500">{page} / {totalPages}</span>
          <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
