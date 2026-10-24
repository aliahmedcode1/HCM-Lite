import { createClient as make } from '@supabase/supabase-js'
import { json } from '@/lib/api'
import { createUserWithProfile } from '@/lib/create-login'

// GET — first-run status (public)
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const db = make(url, anon, { persistSession: false })
  const { count } = await db.from('company_settings').select('*', { count: 'exact', head: true })
  return json({ needsSetup: count === 0 })
}

// POST — first-run: company + Admin account (sirf tab jab kuch setup nahi)
export async function POST(req) {
  const body = await req.json()
  const { company, fullName, email, password } = body

  if (!company || !fullName || !email || !password || password.length < 6) {
    return json({ error: 'All fields are required (password min 6 chars)' }, 400)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const db = make(url, anon, { persistSession: false })

  const { count } = await db.from('company_settings').select('*', { count: 'exact', head: true })
  if (count > 0) {
    return json({ error: 'Setup already complete — please sign in' }, 403)
  }

  const res = await createUserWithProfile({ email, password, fullName, role: 'admin' })
  if (res.error) return json({ error: res.error }, 400)

  // settings row (admin ki session se) — setup wale admin ko temp-password force nahi
  const admin = make(url, anon, { persistSession: false })
  const { data: signIn } = await admin.auth.signInWithPassword({ email, password })
  if (signIn) {
    await admin.from('company_settings').insert({ id: 1, name: company })
    await admin.from('profiles').update({ must_change_password: false }).eq('id', res.user.id)
    await admin.from('audit_log').insert({
      actor_id: res.user.id,
      actor_name: fullName,
      action: 'create',
      entity: 'company',
      after_json: { name: company },
    })
  }

  return json({ ok: true })
}
