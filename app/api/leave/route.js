import { getSession, json, requireRole, audit, notify } from '@/lib/api'
import { workingDaysBetween } from '@/lib/rules'

async function getProfileByEmployeeId(supabase, employeeId) {
  const { data } = await supabase.from('profiles').select('id').eq('employee_id', employeeId).maybeSingle()
  return data
}

// GET — leaves (admin/hr: sab; employee: apne) + balances
export async function GET(req) {
  const { supabase, user, profile } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const isManager = profile?.role === 'admin' || profile?.role === 'hr'
  const status = new URL(req.url).searchParams.get('status')

  let query = supabase
    .from('leave_requests')
    .select('*, employees(full_name, code, departments(name))')
    .order('created_at', { ascending: false })
    .limit(100)

  if (!isManager) query = query.eq('employee_id', profile.employee_id)
  if (status) query = query.eq('status', status)

  const { data: leaves } = await query

  // Balances (employee ke liye; managers ko bhi apne ka nahi hota — skip)
  let balances = null
  if (!isManager && profile?.employee_id) {
    const year = new Date().getFullYear()
    const { data: types } = await supabase.from('leave_types').select('*')
    const { data: approved } = await supabase
      .from('leave_requests')
      .select('leave_type, days')
      .eq('employee_id', profile.employee_id)
      .eq('status', 'approved')
      .gte('start_date', `${year}-01-01`)
      .lte('end_date', `${year}-12-31`)

    const used = {}
    for (const l of approved || []) used[l.leave_type] = (used[l.leave_type] || 0) + Number(l.days)

    balances = (types || []).map((t) => ({
      type: t.name,
      quota: t.annual_quota,
      used: used[t.name] || 0,
      left: t.annual_quota === null ? null : t.annual_quota - (used[t.name] || 0),
    }))
  }

  return json({ leaves, balances })
}

// POST — leave apply (employee; rules: working days only, overlap, balance)
export async function POST(req) {
  const { supabase, user, profile } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)
  if (!profile?.employee_id) return json({ error: 'No employee record found for your account' }, 400)

  const { leave_type, start_date, end_date, reason } = await req.json()
  if (!leave_type || !start_date || !end_date) {
    return json({ error: 'Type, start and end date are required' }, 400)
  }
  if (new Date(start_date) > new Date(end_date)) {
    return json({ error: 'End date cannot be before start date' }, 400)
  }

  const [settingsRes, holidaysRes] = await Promise.all([
    supabase.from('company_settings').select('*').eq('id', 1).single(),
    supabase.from('holidays').select('holiday_date'),
  ])
  const weekendDays = settingsRes.data?.weekend_days || [6, 0]
  const holidaySet = new Set((holidaysRes.data || []).map((h) => h.holiday_date))

  const days = workingDaysBetween(start_date, end_date, weekendDays, holidaySet)
  if (days === 0) {
    return json({ error: 'No working days in the selected dates (weekend/holiday)' }, 422)
  }

  // Overlap check — pending/approved leaves se
  const { data: overlapping } = await supabase
    .from('leave_requests')
    .select('id')
    .eq('employee_id', profile.employee_id)
    .in('status', ['pending', 'approved'])
    .lte('start_date', end_date)
    .gte('end_date', start_date)

  if (overlapping?.length > 0) {
    return json({ error: 'You already have a pending or approved leave on these dates' }, 422)
  }

  // Balance check (unpaid unlimited)
  if (leave_type !== 'unpaid') {
    const { data: type } = await supabase
      .from('leave_types')
      .select('annual_quota')
      .eq('name', leave_type)
      .single()

    const year = new Date().getFullYear()
    const { data: approved } = await supabase
      .from('leave_requests')
      .select('days')
      .eq('employee_id', profile.employee_id)
      .eq('status', 'approved')
      .eq('leave_type', leave_type)
      .gte('start_date', `${year}-01-01`)
      .lte('end_date', `${year}-12-31`)

    const used = (approved || []).reduce((s, l) => s + Number(l.days), 0)
    if (type?.annual_quota !== null && used + days > (type?.annual_quota ?? 0)) {
      return json(
        { error: `Insufficient balance — used ${used}, quota ${type?.annual_quota}, requesting ${days} days` },
        422
      )
    }
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      employee_id: profile.employee_id,
      leave_type,
      start_date,
      end_date,
      days,
      reason: reason || '',
    })
    .select()
    .single()

  if (error) return json({ error: error.message }, 400)

  await audit(supabase, { user, profile }, 'create', 'leave', data.id, null, { leave_type, days })

  // HR/admin ko notification
  const { data: managers } = await supabase.from('profiles').select('id').in('role', ['hr', 'admin'])
  for (const m of managers || []) {
    await notify(supabase, m.id, 'New leave request', `${data.days}-day ${leave_type} leave request is pending`)
  }

  return json({ leave: data })
}

// PATCH — cancel (employee apni pending)
export async function PATCH(req) {
  const { supabase, user, profile } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { id } = await req.json()
  const { data: leave } = await supabase.from('leave_requests').select('*').eq('id', id).single()
  if (!leave) return json({ error: 'Not found' }, 404)

  const isManager = profile?.role === 'admin' || profile?.role === 'hr'
  if (!isManager && leave.employee_id !== profile?.employee_id) {
    return json({ error: 'You can only cancel your own leave' }, 403)
  }
  if (leave.status !== 'pending') {
    return json({ error: 'Only pending leave can be cancelled' }, 400)
  }

  await supabase.from('leave_requests').update({ status: 'cancelled' }).eq('id', id)
  await audit(supabase, { user, profile }, 'update', 'leave', id, { status: 'pending' }, { status: 'cancelled' })
  return json({ ok: true })
}
