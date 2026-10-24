import { json, requireRole, audit, notify } from '@/lib/api'

// PATCH — Admin finalize (month lock)
export async function PATCH(req, { params }) {
  params = await params
  const id = params.id
  const { session, error } = await requireRole(['admin'])
  if (error) return error

  const { data: run } = await session.supabase
    .from('payroll_runs')
    .select('*')
    .eq("id", id)
    .single()
  if (!run) return json({ error: 'Run not found' }, 404)
  if (run.status === 'finalized') {
    return json({ error: 'This run is already finalized' }, 400)
  }

  await session.supabase
    .from('payroll_runs')
    .update({
      status: 'finalized',
      finalized_by: session.user.id,
      finalized_at: new Date().toISOString(),
    })
    .eq("id", id)

  await audit(session.supabase, session, 'finalize', 'payroll_run', id, { status: 'draft' }, { status: 'finalized' })

  // Har employee ko payslip notification
  const { data: slips } = await session.supabase
    .from('payslips')
    .select('employee_id, net')
    .eq("run_id", id)
  const { data: profiles } = await session.supabase.from('profiles').select('id, employee_id').eq('role', 'employee')
  const profByEmp = {}
  for (const p of profiles || []) profByEmp[p.employee_id] = p.id
  for (const s of slips || []) {
    if (profByEmp[s.employee_id]) {
      await notify(session.supabase, profByEmp[s.employee_id], 'Payslip ready 🧾', `Your salary has been processed — download your payslip`)
    }
  }

  return json({ ok: true })
}
