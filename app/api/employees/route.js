import { json, requireRole, audit, notify } from '@/lib/api'
import { createUserWithProfile } from '@/lib/create-login'
import { nextEmployeeCode, tempPassword } from '@/lib/rules'

// GET — directory: search + dept filter + paging (admin, hr)
export async function GET(req) {
  const { session, error } = await requireRole(['admin', 'hr'])
  if (error) return error

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const dept = url.searchParams.get('dept')
  const status = url.searchParams.get('status')
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const perPage = 12

  let query = session.supabase
    .from('employees')
    .select('*, departments(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,code.ilike.%${q}%`)
  if (dept) query = query.eq('department_id', dept)
  if (status) query = query.eq('status', status)

  const { data, count } = await query
  return json({ employees: data, total: count, page, perPage })
}

// POST — employee register (hr, admin) + login creation
export async function POST(req) {
  const { session, error } = await requireRole(['hr', 'admin'])
  if (error) return error

  const b = await req.json()
  const required = ['full_name', 'email', 'join_date', 'department_id']
  for (const f of required) {
    if (!b[f]) return json({ error: `${f} is required` }, 400)
  }
  if (!Number(b.basic_salary) || Number(b.basic_salary) <= 0) {
    return json({ error: 'Salary must be greater than 0' }, 400)
  }
  if (!/^\S+@\S+\.\S+$/.test(b.email)) return json({ error: 'Invalid email address' }, 400)

  const { count } = await session.supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })

  // code conflict (race) par ek retry
  let emp = null
  let e = null
  for (let attempt = 0; attempt < 3 && !emp; attempt++) {
    const code = nextEmployeeCode((count || 0) + attempt)
    const res = await session.supabase
      .from('employees')
      .insert({
        code,
        full_name: b.full_name,
        email: b.email,
        phone: b.phone || '',
        address: b.address || '',
        gender: b.gender || 'male',
        department_id: b.department_id,
        designation: b.designation || '',
        join_date: b.join_date,
        status: b.status || 'active',
        basic_salary: Number(b.basic_salary),
      })
      .select()
      .single()
    if (res.data) emp = res.data
    else e = res.error
  }

  if (!emp) return json({ error: e?.message || 'Employee create fail' }, 400)

  // Login banao (temp password)
  const password = tempPassword()
  const res = await createUserWithProfile({
    email: b.email,
    password,
    fullName: b.full_name,
    role: 'employee',
    employeeId: emp.id,
  })

  let loginCreated = true
  if (res.error) {
    loginCreated = false // employee row created, but login creation failed
    await audit(session.supabase, session, 'create', 'employee', emp.id, null, { code, login: 'FAILED: ' + res.error })
    return json({ employee: emp, loginCreated: false, error: 'Employee created but login failed: ' + res.error }, 200)
  }

  await audit(session.supabase, session, 'create', 'employee', emp.id, null, { code, name: b.full_name, login: 'created' })
  await notify(session.supabase, res.user.id, 'Welcome aboard!', `Your employee account has been created (${code})`)

  return json({ employee: emp, loginCreated: true, tempPassword: password })
}
