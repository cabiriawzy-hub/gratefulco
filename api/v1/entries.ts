// POST   /api/v1/entries
// GET    /api/v1/entries
// GET    /api/v1/entries/:id
// DELETE /api/v1/entries/:id
// GET    /api/v1/entries/time-capsule

import { Hono } from 'hono'
import { requireAuth } from '../lib/auth'
import { adminClient } from '../lib/supabase'
import { classifyEntry } from '../lib/classify'
import { plantTypeForCategory, plantStageForTodayCount, nextGridPosition } from '../lib/plants'
import type { Category } from '../lib/plants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Entry {
  id: string
  user_id: string
  body: string
  category: Category
  plant_type: string
  plant_stage: number
  grid_x: number
  grid_y: number
  hidden: boolean
  created_at: string
  local_date: string
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const entries = new Hono()

entries.use('*', requireAuth)

// ---------------------------------------------------------------------------
// GET /api/v1/entries/time-capsule
// Must be defined before /:id to avoid route shadowing.
// ---------------------------------------------------------------------------
entries.get('/time-capsule', async (c) => {
  const userId = c.get('userId')
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10) // YYYY-MM-DD

  // One year ago ± 1 day
  const yearAgo = new Date(today)
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)
  const from = new Date(yearAgo); from.setDate(from.getDate() - 1)
  const to   = new Date(yearAgo); to.setDate(to.getDate() + 1)

  const { data, error } = await adminClient
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .eq('hidden', false)
    .gte('local_date', from.toISOString().slice(0, 10))
    .lte('local_date', to.toISOString().slice(0, 10))
    .neq('local_date', todayStr)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[time-capsule]', error)
    return c.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, 500)
  }

  return c.json<{ data: Entry | null; error: null }>({ data: data as Entry | null, error: null })
})

// ---------------------------------------------------------------------------
// POST /api/v1/entries
// Body: { body: string; timezone: string }
// ---------------------------------------------------------------------------
entries.post('/', async (c) => {
  const userId = c.get('userId')

  let body: { body?: string; timezone?: string }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } }, 400)
  }

  const text = (body.body ?? '').trim()
  const timezone = body.timezone ?? 'UTC'

  if (!text || text.length < 3 || text.length > 280) {
    return c.json(
      { data: null, error: { code: 'VALIDATION', message: 'Entry body must be 3–280 characters' } },
      422,
    )
  }

  // Classify category via Claude Haiku
  const category = await classifyEntry(text)
  const plantType = plantTypeForCategory(category)

  // Count today's entries to determine plant stage
  const localDate = new Date().toLocaleDateString('en-CA', { timeZone: timezone }) // YYYY-MM-DD
  const { count: todayCount } = await adminClient
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('local_date', localDate)
    .eq('hidden', false)

  const plantStage = plantStageForTodayCount(todayCount ?? 0)

  // Find next grid position
  const { data: existing } = await adminClient
    .from('entries')
    .select('grid_x, grid_y')
    .eq('user_id', userId)
    .eq('hidden', false)

  const position = nextGridPosition(existing ?? [])

  // Insert
  const { data: entry, error: insertError } = await adminClient
    .from('entries')
    .insert({
      user_id:     userId,
      body:        text,
      category,
      plant_type:  plantType,
      plant_stage: plantStage,
      grid_x:      position.grid_x,
      grid_y:      position.grid_y,
      hidden:      false,
      local_date:  localDate,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[entries POST]', insertError)
    return c.json({ data: null, error: { code: 'DB_ERROR', message: insertError.message } }, 500)
  }

  return c.json<{ data: Entry; error: null }>({ data: entry as Entry, error: null }, 201)
})

// ---------------------------------------------------------------------------
// GET /api/v1/entries
// Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&category=people&limit=50&cursor=<entry_id>
// ---------------------------------------------------------------------------
entries.get('/', async (c) => {
  const userId = c.get('userId')
  const { from, to, category, limit: limitStr, cursor } = c.req.query()
  const limit = Math.min(parseInt(limitStr ?? '50', 10) || 50, 100)

  let query = adminClient
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(limit + 1) // fetch one extra to detect next page

  if (from) query = query.gte('local_date', from)
  if (to)   query = query.lte('local_date', to)
  if (category) query = query.eq('category', category)

  if (cursor) {
    // Cursor-based pagination: fetch entries older than the cursor entry's created_at
    const { data: cursorEntry } = await adminClient
      .from('entries')
      .select('created_at')
      .eq('id', cursor)
      .single()
    if (cursorEntry) {
      query = query.lt('created_at', cursorEntry.created_at)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('[entries GET]', error)
    return c.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, 500)
  }

  const rows = data as Entry[]
  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? slice[slice.length - 1].id : null

  return c.json<{ data: { entries: Entry[]; nextCursor: string | null }; error: null }>({
    data: { entries: slice, nextCursor },
    error: null,
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/entries/:id
// ---------------------------------------------------------------------------
entries.get('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const { data, error } = await adminClient
    .from('entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return c.json({ data: null, error: { code: 'NOT_FOUND', message: 'Entry not found' } }, 404)
  }

  return c.json<{ data: Entry; error: null }>({ data: data as Entry, error: null })
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/entries/:id
// Soft-delete: sets hidden = true.
// ---------------------------------------------------------------------------
entries.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const { error } = await adminClient
    .from('entries')
    .update({ hidden: true })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('[entries DELETE]', error)
    return c.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, 500)
  }

  return c.body(null, 204)
})

export default entries
