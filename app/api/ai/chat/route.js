import { getSession, json } from '@/lib/api'
import { AI_TOOLS_SPEC, runTool } from '@/lib/ai/tools'
import { toDateStr } from '@/lib/rules'

// ============ POLICY PROMPT (brief Section 3 rules) ============
function policyPrompt(profile) {
  return `You are the HR assistant inside "HCM Lite". Today is ${toDateStr(new Date())}.
Your user role: ${profile?.role || 'employee'}.

STRICT RULES:
- Answer ONLY from tool results or the policy below. If you don't know, say you don't know.
- NEVER reveal any employee's salary to an employee (only Admin/HR may see payroll totals). Politely refuse.
- Employees can only see their OWN data. An employee asking about others' attendance/leave must be refused except public counts they could see... they cannot — refuse politely.
- Keep answers short (1-3 sentences), friendly, and include the actual numbers from tool results.

COMPANY POLICY (source of truth):
- Office starts 09:00, grace time 15 minutes (late after 09:15).
- Half day if worked under 5 hours. Absent if no record and no approved leave.
- One check-in per day; second check-in is rejected (409).
- Leave quotas per year: annual 14, sick 8, casual 10 days; unpaid unlimited.
- Leave counts working days only (weekends Sat-Sun and public holidays are skipped).
- Overlapping leave or over-balance requests are rejected (422).
- Payroll: gross = 1.5 x basic (HRA 40%, medical 10%). Deductions: absent days + unpaid leave + 0.5 x half days. Tax is illustrative on annual gross.
- Payroll runs are locked after Admin finalizes.`
}

// ============ LLM (OpenAI-compatible: Groq/OpenAI/z.ai) ============
async function llmChat(messages, tools, { timeoutMs = 15000 } = {}) {
  const key = process.env.AI_API_KEY
  if (!key) return null
  const base = (process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '')
  const model = process.env.AI_MODEL || 'llama-3.3-70b-versatile'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages,
        tools: tools || undefined,
        tool_choice: tools ? 'auto' : undefined,
        temperature: 0.2,
        max_tokens: 500,
      }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.choices?.[0]?.message || null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ============ FALLBACK (bina LLM ke bhi jawab) ============
async function fallbackAnswer(question, ctx) {
  const q = question.toLowerCase()
  const has = (...words) => words.some((w) => q.includes(w))

  if (has('salary', 'paycheck') && has('of', 'ki ') && ctx.profile?.role === 'employee') {
    return { answer: "Sorry, I can't share anyone's salary with an employee — that's private. You can view your own payslip on the Payroll page.", tool: 'policy_refusal' }
  }
  if (has('headcount', 'how many employee', 'kitne employee', 'total employee', 'staff')) {
    const r = await runTool('get_headcount', {}, ctx)
    if (r.error) return { answer: r.error, tool: 'get_headcount' }
    return { answer: `There are ${r.total} employees in total (${r.active} active, ${r.probation} on probation).`, tool: 'get_headcount', data: r }
  }
  if (has('late')) {
    const r = await runTool('get_late_comers', {}, ctx)
    if (r.error) return { answer: r.error, tool: 'get_late_comers' }
    if (!r.length) return { answer: 'No one was late this month. 👏', tool: 'get_late_comers' }
    return { answer: 'Most frequent late-comers this month: ' + r.map((x) => `${x.name} (${x.times_late}x)`).join(', ') + '.', tool: 'get_late_comers', data: r }
  }
  if (has('on leave', 'leave today', 'kaun leave', 'chutti')) {
    const r = await runTool('get_leave_summary', {}, ctx)
    if (r.error) return { answer: r.error, tool: 'get_leave_summary' }
    if (!r.on_leave) return { answer: 'No one is on approved leave today.', tool: 'get_leave_summary' }
    return { answer: `${r.on_leave} people are on leave today: ` + r.detail.map((d) => `${d.name} (${d.type})`).join(', ') + '.', tool: 'get_leave_summary', data: r }
  }
  if (has('balance', 'left', 'bach', 'kitni leave', 'how many leave', 'sick leave')) {
    const r = await runTool('get_my_leave_balance', {}, ctx)
    if (r.error) return { answer: r.error, tool: 'get_my_leave_balance' }
    return { answer: 'Your leave balance this year: ' + r.map((b) => `${b.type}: ${b.left} left (${b.used} used)`).join(' · ') + '.', tool: 'get_my_leave_balance', data: r }
  }
  if (has('attendance', 'present today', 'kitne aaye')) {
    const r = await runTool('get_attendance_summary', {}, ctx)
    if (r.error) return { answer: r.error, tool: 'get_attendance_summary' }
    return { answer: `Today (${r.date}): ${r.present} present, ${r.late} late, ${r.half_day} half day.`, tool: 'get_attendance_summary', data: r }
  }
  if (has('payroll', 'salary total', 'total salary')) {
    const r = await runTool('get_payroll_summary', {}, ctx)
    if (r.error) return { answer: r.error, tool: 'get_payroll_summary' }
    if (r.note) return { answer: r.note, tool: 'get_payroll_summary' }
    return { answer: `${r.month} payroll (${r.status}): gross ${r.total_gross}, net ${r.total_net}.`, tool: 'get_payroll_summary', data: r }
  }
  if (has('grace', '09:15', 'late kab')) {
    return { answer: 'Office starts at 09:00 with a 15-minute grace period — check-ins after 09:15 are marked late. Under 5 hours counts as a half day.', tool: 'policy' }
  }
  return {
    answer: 'I can help with: headcount, today\'s attendance, late-comers, who is on leave, your leave balance, payroll summary (Admin/HR), or leave policy questions. Just ask!',
    tool: 'fallback',
  }
}

// ============ MAIN ROUTE ============
export async function POST(req) {
  const { supabase, user, profile } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { message } = await req.json()
  if (!message?.trim()) return json({ error: 'Please type a message' }, 400)

  // rate limit ~20/hour (simple: last hour ki ai_logs count)
  const hourAgo = new Date(Date.now() - 3600e3).toISOString()
  const { count } = await supabase
    .from('ai_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', hourAgo)
  if ((count || 0) > 20) {
    return json({ error: 'Rate limit reached — please try again later (20/hour)' }, 429)
  }

  const ctx = { supabase, profile }
  let answer, toolUsed = ''

  // Pehle LLM try (tool calling ke saath)
  const llm = await llmChat(
    [
      { role: 'system', content: policyPrompt(profile) },
      { role: 'user', content: message },
    ],
    AI_TOOLS_SPEC
  )

  if (llm) {
    const messages = [
      { role: 'system', content: policyPrompt(profile) },
      { role: 'user', content: message },
    ]
    let current = llm
    for (let i = 0; i < 4; i++) {
      if (!current.tool_calls?.length) {
        answer = current.content
        break
      }
      messages.push(current)
      for (const tc of current.tool_calls) {
        const args = safeParse(tc.function.arguments)
        const result = await runTool(tc.function.name, args || {}, ctx)
        toolUsed = tc.function.name
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.function.name,
          content: JSON.stringify(result),
        })
      }
      const next = await llmChat(messages, AI_TOOLS_SPEC)
      if (!next) break
      current = next
    }
    if (!answer) answer = current?.content || null
  }

  // Fallback
  if (!answer) {
    const fb = await fallbackAnswer(message, ctx)
    answer = fb.answer
    toolUsed = fb.tool
  }

  await supabase.from('ai_logs').insert({ user_id: user.id, question: message.slice(0, 500), tool_used: toolUsed })

  return json({ answer, tool: toolUsed, ai_generated: true, used_llm: !!llm })
}

function safeParse(s) {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
