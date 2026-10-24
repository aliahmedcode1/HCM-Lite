import { getSession, json, requireRole, audit } from '@/lib/api'

// GET — sab ke liye (latest 20)
export async function GET() {
  const { supabase, user } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { data } = await supabase
    .from('announcements')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(20)
  return json({ announcements: data || [] })
}

// POST — admin/hr
export async function POST(req) {
  const { session, error } = await requireRole(['admin', 'hr'])
  if (error) return error

  const { title, body } = await req.json()
  if (!title?.trim() || !body?.trim()) return json({ error: 'Title and body are required' }, 400)

  const { data, error: e } = await session.supabase
    .from('announcements')
    .insert({ title: title.trim(), body: body.trim(), posted_by: session.user.id })
    .select()
    .single()
  if (e) return json({ error: e.message }, 400)

  await audit(session.supabase, session, 'create', 'announcement', data.id, null, { title })

  // sab employees+hr ko notification
  const { data: all } = await session.supabase.from('profiles').select('id')
  for (const p of all || []) {
    if (p.id !== session.user.id) {
      await session.supabase.from('notifications').insert({ user_id: p.id, title: '📢 ' + title.trim(), body: body.trim().slice(0, 80) })
    }
  }

  return json({ announcement: data })
}
