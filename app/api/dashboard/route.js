import { getSession, json } from '@/lib/api'
import { toDateStr } from '@/lib/rules'

// GET — role-aware dashboard (sab numbers server-side computed)
export async function GET(req) {
  const { supabase, user, profile } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const url = new URL(req.url)
  const deptFilter = url.searchParams.get('dept')
  const today = toDateStr(new Date())
  const month = today.slice(0, 7)
  const year = new Date().getFullYear()

  const [empsRes, settingsRes] = await Promise.all([
    supabase.from('employees').select('*, departments(name)'),
    supabase.from('company_settings').select('*').eq('id', 1).single(),
  ])
  let employees = empsRes.data || []
  if (deptFilter) employees = employees.filter((e) => e.department_id === deptFilter)
  const activeIds = employees.filter((e) => e.status !== 'exited').map((e) => e.id)

  // ================= ADMIN =================
  if (profile?.role === 'admin') {
    const active = employees.filter((e) => e.status === 'active').length
    const probation = employees.filter((e) => e.status === 'probation').length
    const exitsYTD = employees.filter((e) => e.exit_date && e.exit_date >= `${year}-01-01`).length
    const avgHeadcount = active + probation + exitsYTD > 0 ? active + probation : 1
    const attrition = Math.round((exitsYTD / avgHeadcount) * 1000) / 10

    const { data: runs } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('status', 'finalized')
      .order('created_at', { ascending: false })
    const payrollCost = (runs || []).reduce((s, r) => s + Number(r.total_net || 0), 0)

    const avgSalary = employees.length
      ? Math.round(employees.reduce((s, e) => s + Number(e.basic_salary) * 1.5, 0) / employees.length)
      : 0

    const byDept = {}
    for (const e of employees) {
      const d = e.departments?.name || 'None'
      byDept[d] = (byDept[d] || 0) + 1
    }
    const gender = { male: 0, female: 0, other: 0 }
    for (const e of employees) gender[e.gender] = (gender[e.gender] || 0) + 1

    const { data: auditFeed } = await supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8)

    return json({
      role: 'admin',
      kpis: {
        headcount: active + probation,
        active,
        probation,
        attrition,
        payrollCost,
        avgSalary,
      },
      byDept: Object.entries(byDept).map(([name, count]) => ({ name, count })),
      gender,
      auditFeed: auditFeed || [],
    })
  }

  // ================= HR =================
  if (profile?.role === 'hr') {
    const { data: att } = await supabase.from('attendance').select('*').eq('work_date', today)
    const todayAtt = (att || []).filter((a) => activeIds.includes(a.employee_id))
    const present = todayAtt.filter((a) => ['present', 'late', 'half_day'].includes(a.status)).length
    const late = todayAtt.filter((a) => a.status === 'late').length

    const { data: leaves } = await supabase
      .from('leave_requests')
      .select('*, employees(full_name)')
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)
    const onLeave = (leaves || []).filter((l) => activeIds.includes(l.employee_id)).length

    const { count: pendingLeaves } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
    const { count: pendingCorrections } = await supabase
      .from('attendance_corrections')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    // 7-day trend
    const { data: monthAtt } = await supabase
      .from('attendance')
      .select('employee_id, work_date, status')
      .gte('work_date', toDateStr(new Date(Date.now() - 6 * 864e5)))
      .lte('work_date', today)
    const trend = []
    for (let i = 6; i >= 0; i--) {
      const d = toDateStr(new Date(Date.now() - i * 864e5))
      const day = (monthAtt || []).filter((a) => a.work_date === d && activeIds.includes(a.employee_id))
      trend.push({
        date: d,
        present: day.filter((a) => ['present', 'late', 'half_day'].includes(a.status)).length,
        total: activeIds.length,
      })
    }

    // Top 5 late-comers this month
    const { data: monthLate } = await supabase
      .from('attendance')
      .select('employee_id, status')
      .eq('status', 'late')
      .gte('work_date', `${month}-01`)
    const lateCount = {}
    for (const a of monthLate || []) lateCount[a.employee_id] = (lateCount[a.employee_id] || 0) + 1
    const empById = Object.fromEntries(employees.map((e) => [e.id, e]))
    const topLate = Object.entries(lateCount)
      .map(([id, count]) => ({ name: empById[id]?.full_name || '—', dept: empById[id]?.departments?.name || '—', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Leave by type this month
    const { data: monthLeaves } = await supabase
      .from('leave_requests')
      .select('leave_type, days')
      .eq('status', 'approved')
      .gte('start_date', `${month}-01`)
    const leaveByType = {}
    for (const l of monthLeaves || []) leaveByType[l.leave_type] = (leaveByType[l.leave_type] || 0) + Number(l.days)

    return json({
      role: 'hr',
      kpis: {
        headcount: activeIds.length,
        present,
        late,
        onLeave,
        pendingLeaves: pendingLeaves || 0,
        pendingCorrections: pendingCorrections || 0,
      },
      trend,
      topLate,
      leaveByType: Object.entries(leaveByType).map(([type, days]) => ({ type, days })),
    })
  }

  // ================= EMPLOYEE =================
  if (!profile?.employee_id) {
    return json({ role: 'employee', noEmployee: true })
  }
  const eid = profile.employee_id
  const emp = employees.find((e) => e.id === eid)

  const { data: todayAtt } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', eid)
    .eq('work_date', today)
    .maybeSingle()

  const weekStart = toDateStr(new Date(Date.now() - 6 * 864e5))
  const { data: weekAtt } = await supabase
    .from('attendance')
    .select('status, worked_hours')
    .eq('employee_id', eid)
    .gte('work_date', weekStart)
  const hoursThisWeek = (weekAtt || []).reduce((s, a) => s + Number(a.worked_hours || 0), 0)
  const lateThisMonth = (weekAtt || []).filter((a) => a.status === 'late').length

  const { data: types } = await supabase.from('leave_types').select('*')
  const { data: approved } = await supabase
    .from('leave_requests')
    .select('leave_type, days')
    .eq('employee_id', eid)
    .eq('status', 'approved')
    .gte('start_date', `${year}-01-01`)
  const usedMap = {}
  for (const l of approved || []) usedMap[l.leave_type] = (usedMap[l.leave_type] || 0) + Number(l.days)
  const balances = (types || []).map((t) => ({
    type: t.name,
    quota: t.annual_quota,
    used: usedMap[t.name] || 0,
    left: t.annual_quota === null ? null : t.annual_quota - (usedMap[t.name] || 0),
  }))

  const { data: lastSlip } = await supabase
    .from('payslips')
    .select('net, payroll_runs(period_month, period_year)')
    .eq('employee_id', eid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { count: unread } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  return json({
    role: 'employee',
    employee: emp ? { full_name: emp.full_name, code: emp.code, department: emp.departments?.name } : null,
    kpis: {
      checkedIn: !!todayAtt?.check_in,
      checkedOut: !!todayAtt?.check_out,
      todayStatus: todayAtt?.status || 'no_record',
      hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
      lateThisMonth,
      unread: unread || 0,
    },
    balances,
    lastPayslip: lastSlip || null,
  })
}
