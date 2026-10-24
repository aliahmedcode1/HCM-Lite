import { getSession, json, requireRole, audit } from '@/lib/api'

// GET — Employee 360 (admin/hr: koi bhi; employee: sirf apna)
export async function GET(req, { params }) {
  params = await params
  const { supabase, user, profile } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const id = params.id
  const isManager = profile?.role === 'admin' || profile?.role === 'hr'
  if (!isManager && profile?.employee_id !== id) {
    return json({ error: 'You can only view your own data' }, 403)
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('*, departments(name)')
    .eq('id', id)
    .single()
  if (!employee) return json({ error: 'Not found' }, 404)

  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 31)

  const [att, leaves, payslips] = await Promise.all([
    supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', id)
      .order('work_date', { ascending: false })
      .limit(31),
    supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    isManager
      ? supabase
          .from('payslips')
          .select('*, payroll_runs(period_month, period_year, status)')
          .eq('employee_id', id)
          .order('created_at', { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
  ])

  return json({ employee, attendance: att.data, leaves: leaves.data, payslips: payslips.data })
}

// PATCH — edit (admin/hr: sab; employee: sirf apna phone/address)
export async function PATCH(req, { params }) {
  params = await params
  const { supabase, user, profile } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const id = params.id
  const isManager = profile?.role === 'admin' || profile?.role === 'hr'
  if (!isManager && profile?.employee_id !== id) {
    return json({ error: 'Employees can only edit their own phone and address' }, 403)
  }

  const b = await req.json()
  const managerFields = ['full_name', 'phone', 'address', 'gender', 'department_id', 'designation', 'join_date', 'exit_date', 'status', 'basic_salary', 'email']
  const selfFields = ['phone', 'address']

  const allowed = isManager ? managerFields : selfFields
  const patch = {}
  for (const k of allowed) if (b[k] !== undefined) patch[k] = b[k]

  const { data, error } = await supabase
    .from('employees')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) return json({ error: error.message }, 400)

  await audit(supabase, { user, profile }, 'update', 'employee', id, null, patch)
  return json({ employee: data })
}
