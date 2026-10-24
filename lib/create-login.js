import { createClient as make } from '@supabase/supabase-js'

// Service key ke baghair login banana: server-side signUp + profile write
// (naye user ki apni session se profile likhi jati hai — RLS authenticated)
export async function createUserWithProfile({ email, password, fullName, role, employeeId }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const plain = make(url, anon, { persistSession: false })
  const { data, error } = await plain.auth.signUp({ email, password })

  if (error) {
    const msg = /already registered/i.test(error.message)
      ? 'Yeh email pehle se registered hai'
      : error.message
    return { error: msg }
  }
  if (!data.user) return { error: 'User creation failed (is email confirmation on?)' }

  // Naye user ki session se profile insert/update (RLS: authenticated)
  const newUser = make(url, anon, { persistSession: false })
  if (data.session) await newUser.auth.setSession(data.session)

  const { error: pErr } = await newUser.from('profiles').upsert({
    id: data.user.id,
    full_name: fullName,
    role,
    employee_id: employeeId || null,
    must_change_password: true,
    active: true,
  })

  if (pErr) return { error: 'Profile could not be saved: ' + pErr.message }

  return { user: data.user }
}
