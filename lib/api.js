import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Har API request ke liye session + profile
export async function getSession() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return { supabase, user, profile }
}

export function json(data, status = 200) {
  return NextResponse.json(data, { status })
}

export function unauthorized() {
  return json({ error: 'Unauthorized' }, 401)
}

export function forbidden(msg = 'Forbidden — your role cannot do this') {
  return json({ error: msg }, 403)
}

// Role check: server-side, har request par
export async function requireRole(roles) {
  const session = await getSession()
  if (!session.user) return { session, error: unauthorized() }
  if (!session.profile || !roles.includes(session.profile.role)) {
    return { session, error: forbidden() }
  }
  return { session, error: null }
}

export async function audit(supabase, session, action, entity, entityId, before, after) {
  await supabase.from('audit_log').insert({
    actor_id: session.user.id,
    actor_name: session.profile?.full_name || '',
    action,
    entity,
    entity_id: String(entityId || ''),
    before_json: before || null,
    after_json: after || null,
  })
}

export async function notify(supabase, userId, title, body) {
  await supabase.from('notifications').insert({ user_id: userId, title, body: body || '' })
}
