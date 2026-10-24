import { getSession, json, requireRole, audit } from '@/lib/api'

// GET — corrections (admin/hr: sab; employee: apne)
export async function GET() {
  const { supabase, user, profile } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const isManager = profile?.role === 'admin' || profile?.role === 'hr'
  let query = supabase
    .from('attendance_corrections')
    .select('*, employees(full_name, code)')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!isManager) query = query.eq('employee_id', profile.employee_id)

  const { data } = await query
  return json({ corrections: data })
}

// POST — employee correction request
export async function POST(req) {
  const { supabase, user, profile } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)
  if (!profile?.employee_id) return json({ error: 'No employee record found for your account' }, 400)

  const { work_date, reason } = await req.json()
  if (!work_date || !reason?.trim()) return json({ error: 'Date and reason are required' }, 400)

  const { data, error } = await supabase
    .from('attendance_corrections')
    .insert({
      employee_id: profile.employee_id,
      work_date,
      reason: reason.trim(),
    })
    .select()
    .single()

  if (error) return json({ error: error.message }, 400)
  return json({ correction: data })
}

// PATCH — HR decision (approve → attendance present mark)
export async function PATCH(req) {
  const { session, error } = await requireRole(['hr', 'admin'])
  if (error) return error

  const { id, status } = await req.json()
  if (!id || !['approved', 'rejected'].includes(status)) {
    return json({ error: 'id and status (approved/rejected) are required' }, 400)
  }

  const { data: corr } = await session.supabase
    .from('attendance_corrections')
    .select('*')
    .eq('id', id)
    .single()
  if (!corr) return json({ error: 'Not found' }, 404)

  const { error: e } = await session.supabase
    .from('attendance_corrections')
    .update({ status, decided_by: session.user.id })
    .eq('id', id)
  if (e) return json({ error: e.message }, 400)

  // Approve par us din ki attendance present mark
  if (status === 'approved') {
    const { data: existing } = await session.supabase
      .from('attendance')
      .select('id')
      .eq('employee_id', corr.employee_id)
      .eq('work_date', corr.work_date)
      .maybeSingle()

    if (existing) {
      await session.supabase
        .from('attendance')
        .update({ status: 'present', worked_hours: 8 })
        .eq('id', existing.id)
    } else {
      await session.supabase.from('attendance').insert({
        employee_id: corr.employee_id,
        work_date: corr.work_date,
        check_in: `${corr.work_date}T09:00:00`,
        check_out: `${corr.work_date}T18:00:00`,
        status: 'present',
        worked_hours: 8,
        source: 'web',
      })
    }
  }

  await audit(session.supabase, session, status === 'approved' ? 'approve' : 'reject', 'attendance_correction', id, null, { status })
  return json({ ok: true })
}
