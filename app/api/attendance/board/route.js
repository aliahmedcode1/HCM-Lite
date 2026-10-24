import { json, requireRole } from '@/lib/api'
import { toDateStr } from '@/lib/rules'

// GET /api/attendance/board?date=YYYY-MM-DD — daily board (admin/hr)
export async function GET(req) {
  const { session, error } = await requireRole(['admin', 'hr'])
  if (error) return error

  const date = new URL(req.url).searchParams.get('date') || toDateStr(new Date())

  const [emps, att] = await Promise.all([
    session.supabase
      .from('employees')
      .select('id, code, full_name, status, departments(name)')
      .neq('status', 'exited')
      .order('full_name'),
    session.supabase.from('attendance').select('*').eq('work_date', date),
  ])

  const byEmp = {}
  for (const a of att.data || []) byEmp[a.employee_id] = a

  const board = (emps.data || []).map((e) => ({
    ...e,
    attendance: byEmp[e.id] || null,
  }))

  const summary = {
    total: board.length,
    present: board.filter((e) => ['present', 'late', 'missing_checkout', 'half_day'].includes(e.attendance?.status)).length,
    late: board.filter((e) => e.attendance?.status === 'late').length,
    halfDay: board.filter((e) => e.attendance?.status === 'half_day').length,
    noRecord: board.filter((e) => !e.attendance).length,
  }

  return json({ date, board, summary })
}
