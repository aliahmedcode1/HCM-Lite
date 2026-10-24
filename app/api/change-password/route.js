import { createClient as make } from '@supabase/supabase-js'
import { getSession, json } from '@/lib/api'

export async function POST(req) {
  const { supabase, user } = await getSession()
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const { current, password } = await req.json()
  if (!password || password.length < 6) {
    return json({ error: 'Password must be at least 6 characters' }, 400)
  }

  // Current password verify (server-side, session untouched)
  if (current) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const check = make(url, anon, { persistSession: false })
    const { error: e } = await check.auth.signInWithPassword({
      email: user.email,
      password: current,
    })
    if (e) return json({ error: 'Current password is incorrect' }, 400)
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return json({ error: error.message }, 400)

  await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id)

  return json({ ok: true })
}
