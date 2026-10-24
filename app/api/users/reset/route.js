import { createClient as make } from '@supabase/supabase-js'
import { json, requireRole, audit, notify } from '@/lib/api'
import { tempPassword } from '@/lib/rules'

// POST — password reset (admin: kisi ka; hr: sirf employees ka)
// body: { userId: profileId } ya { employeeId }
export async function POST(req) {
  const { session, error } = await requireRole(['admin', 'hr'])
  if (error) return error

  const { userId, employeeId } = await req.json()
  const supabase = session.supabase

  let target
  if (employeeId) {
    const { data } = await supabase.from('profiles').select('*').eq('employee_id', employeeId).maybeSingle()
    target = data
  } else if (userId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    target = data
  }

  if (!target) return json({ error: 'Is employee ka login nahi mila' }, 404)

  // HR sirf employees reset kar sakta hai
  if (session.profile.role === 'hr' && target.role !== 'employee') {
    return json({ error: 'HR sirf employees ka password reset kar sakta hai' }, 403)
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return json({ error: 'Server par service key configured nahi' }, 500)

  const admin = make(process.env.NEXT_PUBLIC_SUPABASE_URL, key, { persistSession: false })
  const password = tempPassword()
  const { error: updErr } = await admin.auth.admin.updateUserById(target.id, {
    password,
    email_confirm: true,
  })
  if (updErr) return json({ error: updErr.message }, 400)

  await supabase
    .from('profiles')
    .update({ must_change_password: true })
    .eq('id', target.id)

  await audit(supabase, session, 'update', 'password_reset', target.id, null, { of: target.full_name })
  await notify(supabase, target.id, 'Password reset', 'Admin/HR ne aap ka password reset kiya hai — naya password se login karke change karein')

  return json({ ok: true, tempPassword: password, name: target.full_name })
}
