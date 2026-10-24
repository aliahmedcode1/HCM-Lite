import { json, requireRole, audit, notify } from '@/lib/api'
import {
  workingDaysInMonth,
  computePayslip,
  toDateStr,
} from '@/lib/rules'

// GET — runs list (admin/hr) + status
export async function GET() {
  const { session, error } = await requireRole(['admin', 'hr'])
  if (error) return error

  const { data: runs } = await session.supabase
    .from('payroll_runs')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

  return json({ runs: runs || [] })
}

// POST — month ka draft banao (hr)
export async function POST(req) {
  const { session, error } = await requireRole(['hr', 'admin'])
  if (error) return error

  const { month, year } = await req.json()
  const m = Number(month)
  const y = Number(year)
  if (!m || m < 1 || m > 12 || !y) return json({ error: 'month and year are required' }, 400)

  // Finalized month dobara nahi bana sakta
  const { data: existing } = await session.supabase
    .from('payroll_runs')
    .select('*')
    .eq('period_month', m)
    .eq('period_year', y)
    .maybeSingle()
  if (existing?.status === 'finalized') {
    return json({ error: 'This month is finalized and locked — it cannot be re-run' }, 403)
  }

  const supabase = session.supabase

  // Data: employees + settings + holidays + attendance + approved unpaid leave
  const [empsRes, settingsRes, holRes, attRes, leaveRes] = await Promise.all([
    supabase.from('employees').select('*, departments(name)'),
    supabase.from('company_settings').select('*').eq('id', 1).single(),
    supabase.from('holidays').select('holiday_date'),
    supabase.from('attendance').select('employee_id, work_date, status').gte('work_date', `${y}-${String(m).padStart(2, '0')}-01`).lte('work_date', `${y}-${String(m).padStart(2, '0')}-31`),
    supabase.from('leave_requests').select('employee_id, leave_type, start_date, end_date, days, status').eq('status', 'approved').lte('start_date', `${y}-${String(m).padStart(2, '0')}-31`).gte('end_date', `${y}-${String(m).padStart(2, '0')}-01`),
  ])

  const settings = settingsRes.data || {}
  const weekendDays = settings.weekend_days || [6, 0]
  const holidaySet = new Set((holRes.data || []).map((h) => h.holiday_date))
  const totalWorkingDays = workingDaysInMonth(y, m, weekendDays, holidaySet)

  const monthStart = `${y}-${String(m).padStart(2, '0')}-01`
  const monthEnd = `${y}-${String(m).padStart(2, '0')}-31`
  const attByEmp = {}
  for (const a of attRes.data || []) {
    attByEmp[a.employee_id] = attByEmp[a.employee_id] || []
    attByEmp[a.employee_id].push(a)
  }
  const unpaidByEmp = {}
  for (const l of leaveRes.data || []) {
    if (l.leave_type !== 'unpaid') continue
    unpaidByEmp[l.employee_id] = (unpaidByEmp[l.employee_id] || 0) + Number(l.days)
  }

  const slips = []
  const today = toDateStr(new Date())
  for (const emp of empsRes.data || []) {
    if (Number(emp.basic_salary) <= 0) continue // HR/support staff not on payroll
    if (emp.status === "exited" && emp.exit_date && emp.exit_date < monthStart) continue
    if (emp.join_date > monthEnd) continue
    if (emp.join_date > monthStart || (emp.exit_date && emp.exit_date < monthEnd)) {
      // prorate: join/exit ke hisab se working days window
      const ws = emp.join_date > monthStart ? emp.join_date : monthStart
      const we = emp.exit_date && emp.exit_date < monthEnd ? emp.exit_date : monthEnd
      const days = countWorkingBetween(ws, we, weekendDays, holidaySet)
      const atts = (attByEmp[emp.id] || []).filter((a) => a.work_date >= ws && a.work_date <= we)
      slips.push(buildSlip(emp, days, atts, unpaidByEmp[emp.id] || 0, today, weekendDays, holidaySet))
    } else {
      const atts = attByEmp[emp.id] || []
      slips.push(buildSlip(emp, totalWorkingDays, atts, unpaidByEmp[emp.id] || 0, today, weekendDays, holidaySet))
    }
  }

  const totalGross = slips.reduce((s, x) => s + x.gross, 0)
  const totalNet = slips.reduce((s, x) => s + x.net, 0)

  // Draft upsert (purana draft overwrite)
  let runId
  if (existing) {
    runId = existing.id
    await supabase.from('payslips').delete().eq('run_id', runId)
    await supabase
      .from('payroll_runs')
      .update({ total_gross: totalGross, total_net: totalNet, created_by: session.user.id })
      .eq('id', runId)
  } else {
    const { data: run } = await supabase
      .from('payroll_runs')
      .insert({
        period_month: m,
        period_year: y,
        created_by: session.user.id,
        total_gross: totalGross,
        total_net: totalNet,
      })
      .select()
      .single()
    runId = run.id
  }

  if (slips.length > 0) {
    await supabase.from('payslips').insert(slips.map((s) => ({ ...s, run_id: runId, employee_id: s.employee_id })))
  }

  await audit(supabase, session, 'create', 'payroll_run', runId, null, { month: m, year: y, employees: slips.length })

  // Admin ko notification
  const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
  for (const a of admins || []) {
    await notify(supabase, a.id, 'Payroll draft ready', `Draft for ${m}/${y} is ready with ${slips.length} employees — ready to finalize`)
  }

  return json({ runId, employees: slips.length, totalGross, totalNet })
}

function countWorkingBetween(startStr, endStr, weekendDays, holidaySet) {
  let count = 0
  const s = new Date(startStr + 'T00:00:00')
  const e = new Date(endStr + 'T00:00:00')
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const ds = toDateStr(d)
    if (!weekendDays.includes(d.getDay()) && !holidaySet.has(ds)) count++
  }
  return count
}

function buildSlip(emp, workingDays, atts, unpaidDays, today, weekendDays, holidaySet) {
  const present = atts.filter((a) => ["present", "late"].includes(a.status)).length
  const half = atts.filter((a) => a.status === "half_day").length
  const missing = atts.filter((a) => a.status === "missing_checkout" || (a.check_in && !a.check_out)).length
  const recorded = present + half + missing

  // Sirf guzar chuke working days absent-check hote hain (future days payable)
  let passedWorking = 0
  const start = new Date(emp.join_date + "T00:00:00")
  const end = new Date(today + "T00:00:00")
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ds = toDateStr(d)
    if (!weekendDays.includes(d.getDay()) && !holidaySet.has(ds)) passedWorking++
  }
  passedWorking = Math.min(passedWorking, workingDays)
  const absentDays = Math.max(0, passedWorking - recorded - Math.min(unpaidDays, passedWorking))

  const slip = computePayslip({
    employee: emp,
    workingDays,
    presentDays: present,
    halfDays: half,
    missingCheckoutDays: missing,
    unpaidLeaveDays: unpaidDays,
    absentDays,
  })
  return { employee_id: emp.id, ...slip }
}
