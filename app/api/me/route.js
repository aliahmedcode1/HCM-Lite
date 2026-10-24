import { getSession, json } from '@/lib/api'

export async function GET() {
  const { supabase, user, profile } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  let prof = profile
  if (!prof) {
    // legacy/missing profile — default employee profile bana do
    const { data } = await supabase
      .from('profiles')
      .upsert({ id: user.id, full_name: user.email, role: 'employee' })
      .select()
      .single()
    prof = data
  }

  const { data: company } = await supabase
    .from('company_settings')
    .select('name')
    .eq('id', 1)
    .single()

  let employee = null
  if (prof.employee_id) {
    const { data } = await supabase
      .from('employees')
      .select('*, departments(name)')
      .eq('id', prof.employee_id)
      .single()
    employee = data
  }

  return json({ profile: prof, employee, company: company?.name || 'HCM Lite' })
}
