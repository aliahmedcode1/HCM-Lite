import { getSession, json, requireRole } from '@/lib/api'

// GET /api/payroll/payslips?run_id=... — run ki slips (admin/hr)
// GET /api/payroll/payslips — meri slips (employee)
export async function GET(req) {
  const { supabase, user, profile } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const runId = new URL(req.url).searchParams.get('run_id')
  const isManager = profile?.role === 'admin' || profile?.role === 'hr'

  if (runId && isManager) {
    const [run, slips] = await Promise.all([
      supabase.from('payroll_runs').select('*').eq('id', runId).single(),
      supabase
        .from('payslips')
        .select('*, employees(full_name, code, departments(name), basic_salary, join_date)')
        .eq('run_id', runId)
        .order('net', { ascending: false }),
    ])
    return json({ run: run.data, payslips: slips.data })
  }

  if (runId && !isManager && profile?.employee_id) {
    const { data } = await supabase
      .from('payslips')
      .select('*, payroll_runs(period_month, period_year, status)')
      .eq('run_id', runId)
      .eq('employee_id', profile.employee_id)
      .maybeSingle()
    return json({ payslip: data })
  }

  // Meri saari slips
  if (!profile?.employee_id) return json({ payslips: [] })
  const { data } = await supabase
    .from('payslips')
    .select('*, payroll_runs(period_month, period_year, status)')
    .eq('employee_id', profile.employee_id)
    .order('created_at', { ascending: false })
  return json({ payslips: data })
}
