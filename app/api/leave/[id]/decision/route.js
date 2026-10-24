import { requireRole, json, audit, notify } from '@/lib/api'

// PATCH — HR approve/reject with comment
export async function PATCH(req, { params }) {
  params = await params
  const id = params.id
  const { session, error } = await requireRole(['hr', 'admin'])
  if (error) return error

  const { status, comment } = await req.json()
  if (!['approved', 'rejected'].includes(status)) {
    return json({ error: 'status approved/rejected hona chahiye' }, 400)
  }

  const { data: leave } = await session.supabase
    .from('leave_requests')
    .select('*')
    .eq("id", id)
    .single()
  if (!leave) return json({ error: 'Not found' }, 404)
  if (leave.status !== 'pending') {
    return json({ error: 'Yeh leave pehle se decide ho chuki hai' }, 400)
  }

  const { error: e } = await session.supabase
    .from('leave_requests')
    .update({
      status,
      decided_by: session.user.id,
      decision_comment: comment || '',
    })
    .eq("id", id)
  if (e) return json({ error: e.message }, 400)

  await audit(session.supabase, session, status === 'approved' ? 'approve' : 'reject', 'leave', id, { status: 'pending' }, { status, comment })

  // Employee ko notification
  const { data: empProfile } = await session.supabase
    .from('profiles')
    .select('id')
    .eq('employee_id', leave.employee_id)
    .maybeSingle()
  if (empProfile) {
    await notify(
      session.supabase,
      empProfile.id,
      `Leave ${status === 'approved' ? 'approved ✅' : 'rejected ❌'}`,
      `${leave.days}-day ${leave.leave_type} leave ${status}${comment ? ' — ' + comment : ''}`
    )
  }

  return json({ ok: true })
}
