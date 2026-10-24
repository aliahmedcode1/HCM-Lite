import { getSession, json, requireRole, audit } from '@/lib/api'

// GET — poora org data (har logged-in user dekh sakta hai)
export async function GET() {
  const { supabase, user } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const [settings, departments, designations, leaveTypes, holidays] = await Promise.all([
    supabase.from('company_settings').select('*').eq('id', 1).single(),
    supabase.from('departments').select('*').order('name'),
    supabase.from('designations').select('*').order('name'),
    supabase.from('leave_types').select('*').order('name'),
    supabase.from('holidays').select('*').order('holiday_date'),
  ])

  return json({
    settings: settings.data,
    departments: departments.data,
    designations: designations.data,
    leaveTypes: leaveTypes.data,
    holidays: holidays.data,
  })
}

// PATCH — company settings (admin only)
export async function PATCH(req) {
  const { session, error } = await requireRole(['admin'])
  if (error) return error

  const body = await req.json()
  const allowed = ['name', 'office_start', 'grace_minutes', 'weekend_days', 'half_day_hours', 'office_lat', 'office_lng', 'office_radius_m']
  const patch = {}
  for (const k of allowed) if (body[k] !== undefined) patch[k] = body[k]

  const { data, error: e } = await session.supabase
    .from('company_settings')
    .update(patch)
    .eq('id', 1)
    .select()
    .single()

  if (e) return json({ error: e.message }, 400)

  await audit(session.supabase, session, 'update', 'company_settings', 1, null, patch)
  return json({ settings: data })
}
