import { getSession, json } from '@/lib/api'

// GET /api/attendance/calendar?month=YYYY-MM — apna (ya manager kisi ka) calendar
export async function GET(req) {
  const { supabase, user, profile } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const url = new URL(req.url)
  const month = url.searchParams.get('month') || new Date().toISOString().slice(0, 7)
  const employeeId = url.searchParams.get('employee_id') || profile?.employee_id

  const isManager = profile?.role === 'admin' || profile?.role === 'hr'
  if (!isManager && employeeId !== profile?.employee_id) {
    return json({ error: 'Sirf apna calendar dekh sakte hain' }, 403)
  }

  const start = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const endMonth = `${y}-${String(m).padStart(2, '0')}-31`

  const [att, leaves, holidays, settings] = await Promise.all([
    supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('work_date', start)
      .lte('work_date', endMonth)
      .order('work_date'),
    supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('status', 'approved'),
    supabase.from('holidays').select('*'),
    supabase.from('company_settings').select('*').eq('id', 1).single(),
  ])

  return json({
    month,
    attendance: att.data,
    leaves: leaves.data,
    holidays: holidays.data,
    weekendDays: settings.data?.weekend_days || [6, 0],
  })
}
