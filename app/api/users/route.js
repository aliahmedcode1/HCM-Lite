import { json, requireRole, audit, notify } from '@/lib/api'
import { createUserWithProfile } from '@/lib/create-login'
import { tempPassword, nextEmployeeCode } from '@/lib/rules'

// GET — users list (admin)
export async function GET() {
  const { session, error } = await requireRole(['admin'])
  if (error) return error

  const { data } = await session.supabase
    .from('profiles')
    .select('*')
    .order('created_at')

  return json({ users: data })
}

// POST — HR login banana (admin)
export async function POST(req) {
  const { session, error } = await requireRole(['admin'])
  if (error) return error

  const { fullName, email } = await req.json()
  if (!fullName || !email) return json({ error: 'Name and email are required' }, 400)

  // HR ka employee record bhi banao (check-in/attendance ke liye)
  const { count } = await session.supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
  const { data: emp } = await session.supabase
    .from('employees')
    .insert({
      code: nextEmployeeCode(count || 0),
      full_name: fullName,
      email,
      designation: 'HR',
      join_date: new Date().toISOString().slice(0, 10),
      status: 'active',
      basic_salary: 0,
    })
    .select()
    .single()

  const password = tempPassword()
  const res = await createUserWithProfile({
    email,
    password,
    fullName,
    role: 'hr',
    employeeId: emp?.id || null,
  })
  if (res.error) return json({ error: res.error }, 400)

  await audit(session.supabase, session, 'create', 'hr_login', res.user.id, null, { email, role: 'hr', employee: emp?.code })
  await notify(session.supabase, res.user.id, 'Welcome to HR', 'Your HR account has been created by the Admin')

  return json({ ok: true, tempPassword: password, employeeCode: emp?.code })
}

// PATCH — activate/deactivate (admin)
export async function PATCH(req) {
  const { session, error } = await requireRole(['admin'])
  if (error) return error

  const { id, active } = await req.json()
  if (!id || active === undefined) return json({ error: 'id and active are required' }, 400)
  if (id === session.user.id) return json({ error: 'You cannot deactivate your own account' }, 400)

  const { error: e } = await session.supabase
    .from('profiles')
    .update({ active })
    .eq('id', id)
  if (e) return json({ error: e.message }, 400)

  await audit(session.supabase, session, 'update', 'profile_active', id, { active: !active }, { active })
  return json({ ok: true })
}
