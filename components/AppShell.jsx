"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  KeyRound,
  Briefcase,
  Building2,
  CalendarCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquareText,
  Send,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button } from "@/components/ui";

const NAV = {
  admin: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/employees", label: "Employees", icon: Users },
    { href: "/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/leave", label: "Leave", icon: ClipboardList },
    { href: "/payroll", label: "Payroll", icon: FileText },
    { href: "/org", label: "Org Setup", icon: Settings },
    { href: "/users", label: "Users & HR", icon: ShieldCheck },
    { href: "/announcements", label: "Announcements", icon: Megaphone },
    { href: "/audit", label: "Audit Log", icon: ScrollText },
  ],
  hr: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/employees", label: "Employees", icon: Users },
    { href: "/attendance", label: "Attendance", icon: CalendarCheck },
    { href: "/leave", label: "Leave", icon: ClipboardList },
    { href: "/payroll", label: "Payroll", icon: FileText },
    { href: "/announcements", label: "Announcements", icon: Megaphone },
  ],
  employee: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/attendance", label: "My Attendance", icon: CalendarCheck },
    { href: "/leave", label: "My Leave", icon: ClipboardList },
    { href: "/payroll", label: "My Payslips", icon: FileText },
    { href: "/announcements", label: "Announcements", icon: Megaphone },
    { href: "/profile", label: "My Profile", icon: Briefcase },
  ],
}

const ROLE_BADGE = {
  admin: "emerald",
  hr: "cyan",
  employee: "indigo",
}

export default function AppShell({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [me, setMe] = useState(null)
  const [notifs, setNotifs] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/me")
    if (res.status === 401) {
      router.replace("/login")
      return
    }
    const data = await res.json()
    if (!data.profile?.active && data.profile) {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.replace("/login")
      return
    }
    setMe(data)
  }, [router])

  const loadNotifs = useCallback(async () => {
    const res = await fetch("/api/notifications")
    if (res.ok) {
      const data = await res.json()
      setNotifs(data.notifications || [])
    }
  }, [])

  useEffect(() => {
    loadMe()
    loadNotifs()
  }, [loadMe, loadNotifs])

  async function markRead() {
    setNotifOpen(false)
    await fetch("/api/notifications", { method: "PATCH" })
    loadNotifs()
  }

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/login")
  }

  const nav = NAV[me?.profile?.role] || NAV.employee
  const unread = notifs.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/5 bg-zinc-950/90 backdrop-blur-xl lg:flex">
        <Link href="/dashboard" className="flex h-16 items-center gap-2.5 px-5">
          <div className="rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 p-2 shadow-lg shadow-emerald-500/25">
            <Building2 className="h-4 w-4 text-zinc-950" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{me?.company || "HCM Lite"}</p>
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">HCM Lite</p>
          </div>
        </Link>

        <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-white/8 font-medium text-white"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                <item.icon className={`h-4 w-4 ${active ? "text-emerald-400" : ""}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {me && (
          <div className="border-t border-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-300">
                {(me.profile.full_name || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{me.profile.full_name}</p>
                <Badge color={ROLE_BADGE[me.profile.role]} className="mt-0.5">
                  {me.profile.role.toUpperCase()}
                </Badge>
              </div>
              <button
                onClick={() => router.push("/change-password")}
                title="Change Password"
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/5 hover:text-emerald-300 cursor-pointer"
              >
                <KeyRound className="h-4 w-4" />
              </button>
              <button
                onClick={logout}
                title="Logout"
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-zinc-950/90 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-emerald-400 to-teal-400 p-1.5">
            <Building2 className="h-3 w-3 text-zinc-950" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-bold text-white">{me?.company || "HCM Lite"}</span>
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={() => setNotifOpen(!notifOpen)} className="relative rounded-lg p-2 text-zinc-400 cursor-pointer">
            <Bell className="h-4 w-4" />
            {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-400" />}
          </button>
          <button onClick={logout} className="rounded-lg p-2 text-zinc-400 hover:text-red-400 cursor-pointer">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile nav scroll */}
      <div className="flex gap-2 overflow-x-auto border-b border-white/5 px-4 py-2 lg:hidden">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs ${
                active ? "bg-white/10 text-white" : "text-zinc-500"
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Notifications (desktop) */}
      {notifOpen && (
        <div className="fixed right-4 top-16 z-50 w-80 rounded-2xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl animate-scale-in">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <button onClick={markRead} className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer">
              Mark all read
            </button>
          </div>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {notifs.length === 0 && <p className="py-6 text-center text-xs text-zinc-500">No notifications</p>}
            {notifs.map((n) => (
              <div key={n.id} className={`rounded-xl border px-3 py-2 ${n.read ? "border-white/5" : "border-emerald-500/20 bg-emerald-500/5"}`}>
                <p className="text-xs font-medium text-white">{n.title}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-60">
        <main className="mx-auto max-w-6xl px-4 py-6 pb-28 lg:px-8">{me ? children : <LoadingBlock />}</main>
      </div>

      {/* Desktop top-right actions */}
      <div className="fixed right-6 top-4 z-30 hidden items-center gap-2 lg:flex">
        <button onClick={() => setNotifOpen(!notifOpen)} className="relative glass-card rounded-xl p-2.5 text-zinc-300 hover:text-white cursor-pointer">
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-bold text-zinc-950">{unread}</span>}
        </button>
      </div>

      {/* AI Assistant floating */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-2xl shadow-emerald-500/30 transition-transform hover:scale-105 cursor-pointer"
      >
        <Sparkles className="h-4 w-4" />
        Ask AI
      </button>

      {chatOpen && (
        <ChatPanel
          role={me?.profile?.role}
          onClose={() => setChatOpen(false)}
          onSmartLeave={(leave) => {
            setChatOpen(false)
            router.push(`/leave?prefill=${encodeURIComponent(JSON.stringify(leave))}`)
          }}
        />
      )}
    </div>
  )
}

function LoadingBlock() {
  return (
    <div className="flex items-center gap-3 py-40 text-zinc-500">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
      Loading...
    </div>
  )
}

function ChatPanel({ role, onClose, onSmartLeave }) {
  const [messages, setMessages] = useState([
    { role: "ai", text: "Hello! I'm your HR assistant. Ask me about headcount, today's attendance, late-comers, your leave balance, or payroll." },
  ])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || busy) return
    setInput("")
    setMessages((m) => [...m, { role: "user", text }])
    setBusy(true)
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      setMessages((m) => [...m, { role: "ai", text: data.answer || data.error || "Sorry — no answer was available." }])
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Network error — please try again." }])
    }
    setBusy(false)
  }

  const smartPhrases = role === "employee" ? ["I need next Monday and Tuesday off for a wedding", "How many sick leaves do I have left?"] : ["How many employees are in the company?", "Who came late most often this month?", "What is this month's attendance?"]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex h-[600px] max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-emerald-500/10 p-2">
              <MessageSquareText className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">HR Assistant</h3>
              <p className="text-[10px] text-zinc-500">AI-generated · answers from live data</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-emerald-400 text-zinc-950 rounded-br-md"
                  : "glass-card text-zinc-200 rounded-bl-md"
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="glass-card flex gap-1 rounded-2xl px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:240ms]" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-white/5 p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {smartPhrases.map((p) => (
              <button
                key={p}
                onClick={() => {
                  if (p.includes("Monday") && onSmartLeave) {
                    handleSmartLeave(p)
                  } else {
                    setInput(p)
                  }
                }}
                className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-emerald-500/30 hover:text-emerald-300 cursor-pointer"
              >
                {p.length > 42 ? p.slice(0, 40) + "…" : p}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask anything..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-400/50 focus:outline-none"
            />
            <Button size="md" onClick={send} loading={busy}>
              {!busy && <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  async function handleSmartLeave(phrase) {
    setMessages((m) => [...m, { role: "user", text: phrase }])
    setBusy(true)
    const res = await fetch("/api/ai/smart-leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: phrase }),
    })
    const data = await res.json()
    setBusy(false)
    if (data.leave) {
      setMessages((m) => [...m, { role: "ai", text: `Got it: ${data.leave.type} leave from ${data.leave.start} to ${data.leave.end} (${data.leave.reason}). Opening the form — please confirm ✅` }])
      setTimeout(() => onSmartLeave({ type: data.leave.type || data.leave.leave_type, start_date: data.leave.start_date || data.leave.start, end_date: data.leave.end_date || data.leave.end, reason: data.leave.reason }), 600)
    } else {
      setMessages((m) => [...m, { role: "ai", text: data.error || "Couldn't parse the dates — please use the manual form." }])
    }
  }
}
