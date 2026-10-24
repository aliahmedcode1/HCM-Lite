import { getSession, json } from '@/lib/api'

// GET — meri notifications
export async function GET() {
  const { supabase, user } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)
  return json({ notifications: data || [] })
}

// PATCH — sab read mark
export async function PATCH() {
  const { supabase, user } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
  return json({ ok: true })
}
