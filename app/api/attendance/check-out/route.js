import { getSession, json } from '@/lib/api'
import { attendanceStatus, toDateStr } from '@/lib/rules'

export async function POST() {
  const { supabase, user, profile } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)
  if (!profile?.employee_id) return json({ error: 'No employee record found for your account' }, 400)

  const today = toDateStr(new Date())
  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', profile.employee_id)
    .eq('work_date', today)
    .maybeSingle()

  if (!existing?.check_in) {
    return json({ error: 'Please check in first' }, 400)
  }
  if (existing.check_out) {
    return json({ error: 'You have already checked out today' }, 409)
  }

  const { data: settings } = await supabase
    .from('company_settings')
    .select('*')
    .eq('id', 1)
    .single()

  const { status, hours } = attendanceStatus(
    { checkIn: existing.check_in, checkOut: now },
    settings || {}
  )

  const { data, error } = await supabase
    .from('attendance')
    .update({ check_out: now, status, worked_hours: hours })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) return json({ error: error.message }, 400)
  return json({ attendance: data, status, hours })
}
