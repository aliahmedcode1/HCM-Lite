import { getSession, json } from '@/lib/api'
import { toDateStr } from '@/lib/rules'

// POST — "need next Monday and Tuesday off for my sister's wedding"
//        → { type, start, end, reason } (pre-filled form)
export async function POST(req) {
  const { supabase, user } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { message } = await req.json()
  if (!message?.trim()) return json({ error: 'Sentence likhein' }, 400)

  const today = new Date()

  // 1) LLM try (JSON mode)
  const key = process.env.AI_API_KEY
  if (key) {
    const base = (process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '')
    const model = process.env.AI_MODEL || 'llama-3.3-70b-versatile'
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `Today is ${toDateStr(today)}. Extract a leave request as JSON with keys: type (one of: annual, sick, casual, unpaid), start (YYYY-MM-DD), end (YYYY-MM-DD), reason (short). Respond with ONLY valid JSON, no markdown. If type unclear use "casual". Days: "next Monday" = the next occurrence after today.`,
            },
            { role: 'user', content: message },
          ],
          temperature: 0,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      })
      if (res.ok) {
        const data = await res.json()
        const parsed = JSON.parse(data.choices[0].message.content)
        if (parsed.start && parsed.end) {
          await supabase.from('ai_logs').insert({ user_id: user.id, question: message.slice(0, 500), tool_used: 'smart_leave' })
          return json({ leave: parsed, source: 'llm' })
        }
      }
    } catch {
      // retry once
      try {
        const res2 = await fetch(`${base}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: `Today is ${toDateStr(today)}. Return ONLY JSON {type,start,end,reason}.` },
              { role: 'user', content: message },
            ],
            temperature: 0,
          }),
          signal: AbortSignal.timeout(10000),
        })
        const data2 = await res2.json()
        const txt = data2.choices[0].message.content.replace(/```json|```/g, '').trim()
        const parsed2 = JSON.parse(txt)
        if (parsed2.start && parsed2.end) {
          return json({ leave: parsed2, source: 'llm-retry' })
        }
      } catch {}
    } finally {
      clearTimeout(timer)
    }
  }

  // 2) Regex fallback
  const q = message.toLowerCase()
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

  // type guess
  let type = 'casual'
  if (/sick|bimar|ill|fever|hospital|doctor/.test(q)) type = 'sick'
  else if (/annual|vacation|holiday trip/.test(q)) type = 'annual'
  else if (/unpaid|bina pay/.test(q)) type = 'unpaid'

  let start = null
  let end = null

  // explicit dates: 25 Dec, 2026-01-05, 25/12
  const isoMatch = q.match(/(\d{4})-(\d{2})-(\d{2})/)
  const dmyMatch = q.match(/(\d{1,2})[\/\- ](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\/\- ]?(\d{4})?/)
  const dmMatch = q.match(/(\d{1,2})[\/\- ](\d{1,2})/)

  const dayNames = days.filter((d) => q.includes(d))

  if (isoMatch) {
    start = end = isoMatch[0]
  } else if (dmyMatch) {
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
    const mIdx = months.indexOf(dmyMatch[2]) + 1
    const y = dmyMatch[3] || today.getFullYear()
    start = end = `${y}-${String(mIdx).padStart(2, '0')}-${String(Number(dmyMatch[1])).padStart(2, '0')}`
  } else if (dayNames.length > 0) {
    // first mentioned day ka next occurrence
    const target = days.indexOf(dayNames[0])
    start = nextWeekday(today, target)
    end = start
    // agar do days mentioned (Monday and Tuesday) → contiguous
    if (dayNames.length > 1) {
      const second = days.indexOf(dayNames[1])
      if ((second - target + 7) % 7 <= 3) end = nextWeekday(today, second)
    }
  } else if (/tomorrow|kal/.test(q)) {
    const t = new Date(today)
    t.setDate(t.getDate() + 1)
    start = end = toDateStr(t)
  } else if (dmMatch) {
    const y = today.getFullYear()
    start = end = `${y}-${String(Number(dmMatch[2])).padStart(2, '0')}-${String(Number(dmMatch[1])).padStart(2, '0')}`
  }

  // "3 days" extension
  const nDays = q.match(/(\d+)\s*day/)
  if (start && nDays) {
    const e = new Date(start + 'T00:00:00')
    e.setDate(e.getDate() + Number(nDays[1]) - 1)
    end = toDateStr(e)
  }

  if (!start) {
    return json({ error: 'Couldn\'t parse the dates — please fill the form manually (e.g. "next Monday and Tuesday off for wedding")', ai_generated: true })
  }

  // reason: "for ..." ke baad
  const forMatch = message.match(/for\s+(.{3,60})/i)
  const reason = forMatch ? forMatch[1].replace(/[.!]$/, '') : message.slice(0, 60)

  await supabase.from('ai_logs').insert({ user_id: user.id, question: message.slice(0, 500), tool_used: 'smart_leave_fallback' })
  return json({ leave: { type, start_date: start, end_date: end, start, end, reason }, source: 'fallback' })
}

function nextWeekday(from, targetDay) {
  const d = new Date(from)
  const diff = (targetDay - d.getDay() + 7) % 7
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff))
  return toDateStr(d)
}
