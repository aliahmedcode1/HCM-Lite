import { json, requireRole, audit } from '@/lib/api'

const ENTITIES = {
  departments: ['name'],
  designations: ['name'],
  leave_types: ['name', 'annual_quota'],
  holidays: ['holiday_date', 'name'],
}

function pick(body, fields) {
  const out = {}
  for (const f of fields) if (body[f] !== undefined) out[f] = body[f]
  return out
}

// POST — create (admin only)
export async function POST(req, { params }) {
  params = await params
  const entity = params.entity
  if (!ENTITIES[entity]) return json({ error: 'Unknown entity' }, 404)

  const { session, error } = await requireRole(['admin'])
  if (error) return error

  const body = await req.json()
  const row = pick(body, ENTITIES[entity])
  const { data, error: e } = await session.supabase.from(entity).insert(row).select().single()
  if (e) return json({ error: e.message }, 400)

  await audit(session.supabase, session, 'create', entity, data.id, null, row)
  return json({ row: data })
}

// PATCH — update (admin only) — quota update waghera
export async function PATCH(req, { params }) {
  params = await params
  const entity = params.entity
  if (!ENTITIES[entity]) return json({ error: 'Unknown entity' }, 404)

  const { session, error } = await requireRole(['admin'])
  if (error) return error

  const body = await req.json()
  const row = pick(body, ENTITIES[entity])
  const { id } = body
  if (!id) return json({ error: 'id required' }, 400)

  const { data, error: e } = await session.supabase
    .from(entity)
    .update(row)
    .eq('id', id)
    .select()
    .single()
  if (e) return json({ error: e.message }, 400)

  await audit(session.supabase, session, 'update', entity, id, null, row)
  return json({ row: data })
}

// DELETE — remove (admin only)
export async function DELETE(req, { params }) {
  params = await params
  const entity = params.entity
  if (!ENTITIES[entity]) return json({ error: 'Unknown entity' }, 404)

  const { session, error } = await requireRole(['admin'])
  if (error) return error

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return json({ error: 'id required' }, 400)

  const { error: e } = await session.supabase.from(entity).delete().eq('id', id)
  if (e) return json({ error: e.message }, 400)

  await audit(session.supabase, session, 'delete', entity, id, null, null)
  return json({ ok: true })
}
