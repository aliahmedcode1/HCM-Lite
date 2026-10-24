import { requireRole, json } from '@/lib/api'

// GET — audit log (sirf admin)
export async function GET(req) {
  const { session, error } = await requireRole(['admin'])
  if (error) return error

  const page = Math.max(1, Number(new URL(req.url).searchParams.get('page')) || 1)
  const perPage = 30

  const { data, count } = await session.supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  return json({ logs: data || [], total: count, page })
}
