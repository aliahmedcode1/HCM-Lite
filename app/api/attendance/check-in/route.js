import { getSession, json } from '@/lib/api'
import { attendanceStatus, toDateStr } from '@/lib/rules'
import { createClient } from '@/lib/supabase/server'

async function loadSettings(supabase) {
  const { data } = await supabase.from('company_settings').select('*').eq('id', 1).single()
  return data || {}
}

function requireEmployeeId(profile) {
  if (!profile?.employee_id) return null
  return profile.employee_id
}

// POST /api/attendance/check-in — server time stamp
export async function POST(req) {
  const { supabase, user, profile } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const employeeId = requireEmployeeId(profile)
  if (!employeeId) return json({ error: 'No employee record found for your account' }, 400)

  const today = toDateStr(new Date())
  const now = new Date().toISOString()

  // Ek din = ek record (unique constraint)
  const { data: existing } = await supabase
    .from('attendance')
    .select('id, check_in')
    .eq('employee_id', employeeId)
    .eq('work_date', today)
    .maybeSingle()

  if (existing?.check_in) {
    return json({ error: 'You have already checked in today' }, 409)
  }

  const settings = await loadSettings(supabase)
  const { status } = attendanceStatus({ checkIn: now }, settings)

  if (existing) {
    const { data, error } = await supabase
      .from('attendance')
      .update({ check_in: now, status })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return json({ error: error.message }, 400)
    return json({ attendance: data, status })
  }

  const { data, error } = await supabase
    .from('attendance')
    .insert({
      employee_id: employeeId,
      work_date: today,
      check_in: now,
      status,
      source: 'web',
    })
    .select()
    .single()

  if (error) return json({ error: error.message }, 400)
  return json({ attendance: data, status })
}
