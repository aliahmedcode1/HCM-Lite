// ============================================================
// AI TOOLS — yeh wahi data services hain jo REST API use karta hai
// Role scope har tool mein check hota hai (employee = sirf apna data)
// ============================================================

import { toDateStr } from '@/lib/rules'

export const AI_TOOLS_SPEC = [
  {
    type: 'function',
    function: {
      name: 'get_headcount',
      description: 'Get company headcount, optionally filtered by department name. Admin/HR only.',
      parameters: {
        type: 'object',
        properties: {
          department: { type: 'string', description: 'Department name like "Engineering"' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_attendance_summary',
      description: 'Attendance summary for a date (default today): present, late, half_day, absent counts. Admin/HR get company-wide, employee gets own.',
      parameters: {
        type: 'object',
        properties: { date: { type: 'string', description: 'YYYY-MM-DD' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_late_comers',
      description: 'Employees who came late most often in a month (default current). Admin/HR only.',
      parameters: {
        type: 'object',
        properties: { month: { type: 'string', description: 'YYYY-MM' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_leave_summary',
      description: 'Leave summary: who is on leave on a date, or approved leaves in a month. Admin/HR get everyone; employee gets own.',
      parameters: {
        type: 'object',
        properties: { date: { type: 'string', description: 'YYYY-MM-DD' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_leave_balance',
      description: "Current user's leave balances (quota, used, left) per leave type.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_payroll_summary',
      description: 'Payroll totals for a month (gross, net, deductions). Admin/HR only.',
      parameters: {
        type: 'object',
        properties: { month: { type: 'string', description: 'YYYY-MM' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_employees',
      description: 'Search employees by name. Returns name, code, department, status. Never returns salary.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
]

export async function runTool(name, args, { supabase, profile }) {
  const isManager = profile?.role === 'admin' || profile?.role === 'hr'
  const today = toDateStr(new Date())

  if (name === 'get_headcount') {
    if (!isManager) return { error: 'Only Admin/HR can view headcount' }
    let q = supabase.from('employees').select('*, departments(name)')
    const { data } = await q
    let emps = data || []
    if (args?.department) {
      emps = emps.filter((e) => (e.departments?.name || '').toLowerCase() === String(args.department).toLowerCase())
    }
    return {
      total: emps.length,
      active: emps.filter((e) => e.status === 'active').length,
      probation: emps.filter((e) => e.status === 'probation').length,
      by_department: args?.department ? undefined : deptCounts(emps),
    }
  }

  if (name === 'get_attendance_summary') {
    const date = args?.date || today
    const { data: att } = await supabase.from('attendance').select('*').eq('work_date', date)
    let rows = att || []
    if (!isManager && profile?.employee_id) rows = rows.filter((a) => a.employee_id === profile.employee_id)
    return {
      date,
      present: rows.filter((a) => a.status === 'present').length,
      late: rows.filter((a) => a.status === 'late').length,
      half_day: rows.filter((a) => a.status === 'half_day').length,
      no_record: isManager ? null : rows.length === 0 ? 1 : 0,
      scope: isManager ? 'company' : 'self',
    }
  }

  if (name === 'get_late_comers') {
    if (!isManager) return { error: 'Admin/HR only' }
    const month = args?.month || today.slice(0, 7)
    const [{ data: att }, { data: emps }] = await Promise.all([
      supabase.from('attendance').select('employee_id').eq('status', 'late').gte('work_date', `${month}-01`).lte('work_date', `${month}-31`),
      supabase.from('employees').select('id, full_name, departments(name)'),
    ])
    const counts = {}
    for (const a of att || []) counts[a.employee_id] = (counts[a.employee_id] || 0) + 1
    const empById = Object.fromEntries((emps || []).map((e) => [e.id, e]))
    return Object.entries(counts)
      .map(([id, count]) => ({ name: empById[id]?.full_name || '—', department: empById[id]?.departments?.name || '—', times_late: count }))
      .sort((a, b) => b.times_late - a.times_late)
      .slice(0, 5)
  }

  if (name === 'get_leave_summary') {
    const date = args?.date || today
    let q = supabase
      .from('leave_requests')
      .select('*, employees(full_name, departments(name))')
      .eq('status', 'approved')
      .lte('start_date', date)
      .gte('end_date', date)
    if (!isManager && profile?.employee_id) q = q.eq('employee_id', profile.employee_id)
    const { data } = await q
    const list = (data || []).map((l) => ({
      name: l.employees?.full_name,
      type: l.leave_type,
      from: l.start_date,
      to: l.end_date,
      days: l.days,
    }))
    return { date, on_leave: list.length, detail: list }
  }

  if (name === 'get_my_leave_balance') {
    if (!profile?.employee_id) return { error: 'No employee record found for your account' }
    const year = new Date().getFullYear()
    const [{ data: types }, { data: approved }] = await Promise.all([
      supabase.from('leave_types').select('*'),
      supabase
        .from('leave_requests')
        .select('leave_type, days')
        .eq('employee_id', profile.employee_id)
        .eq('status', 'approved')
        .gte('start_date', `${year}-01-01`),
    ])
    const used = {}
    for (const l of approved || []) used[l.leave_type] = (used[l.leave_type] || 0) + Number(l.days)
    return (types || []).map((t) => ({
      type: t.name,
      quota: t.annual_quota === null ? 'unlimited' : t.annual_quota,
      used: used[t.name] || 0,
      left: t.annual_quota === null ? 'unlimited' : t.annual_quota - (used[t.name] || 0),
    }))
  }

  if (name === 'get_payroll_summary') {
    if (!isManager) return { error: 'Only Admin/HR can view payroll' }
    const month = args?.month || today.slice(0, 7)
    const [y, m] = month.split('-').map(Number)
    const { data: run } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('period_month', m)
      .eq('period_year', y)
      .maybeSingle()
    if (!run) return { month, note: 'No payroll run for this month yet' }
    return {
      month,
      status: run.status,
      total_gross: run.total_gross,
      total_net: run.total_net,
    }
  }

  if (name === 'search_employees') {
    if (!isManager) return { error: 'Only Admin/HR can search the directory' }
    const q = String(args?.query || '').toLowerCase()
    const { data } = await supabase.from('employees').select('full_name, code, status, departments(name)').ilike('full_name', `%${q}%`).limit(5)
    return (data || []).map((e) => ({ name: e.full_name, code: e.code, department: e.departments?.name || '—', status: e.status }))
  }

  return { error: 'Unknown tool: ' + name }
}

function deptCounts(emps) {
  const byDept = {}
  for (const e of emps) {
    const d = e.departments?.name || 'None'
    byDept[d] = (byDept[d] || 0) + 1
  }
  return byDept
}
