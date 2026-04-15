// POST   /api/v1/entries
// GET    /api/v1/entries
// GET    /api/v1/entries/:id
// DELETE /api/v1/entries/:id
// GET    /api/v1/entries/time-capsule

import { Hono } from 'hono'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Category = 'people' | 'health' | 'work' | 'moments' | 'nature' | 'learning' | 'default'

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

/**
 * GET /api/v1/entries/time-capsule
 * Returns today's time-capsule entry (same date ±1 day, exactly 1 year ago) or null.
 * Must be defined before /:id to avoid route shadowing.
 */
entries.get('/time-capsule', async (c) => {
  // TODO: extract auth user from JWT, query Supabase for matching entry
  return c.json<{ data: Entry | null; error: null }>({
    data: null,
    error: null,
  })
})

/**
 * POST /api/v1/entries
 * Body: { body: string; timezone: string }
 * Classifies category server-side, assigns plant type/stage, calculates grid position.
 */
entries.post('/', async (c) => {
  // TODO: validate auth JWT, parse body, classify category via Claude Haiku,
  //       assign plant type & stage based on user's existing entries,
  //       calculate next available grid position, insert into Supabase.
  const _body = await c.req.json()
  return c.json<{ data: null; error: { code: string; message: string } }>(
    { data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Coming in Phase 2' } },
    501,
  )
})

/**
 * GET /api/v1/entries
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&category=people&limit=50&cursor=<entry_id>
 */
entries.get('/', async (c) => {
  // TODO: parse query params, build Supabase query with cursor pagination
  return c.json<{ data: { entries: Entry[]; nextCursor: string | null }; error: null }>({
    data: { entries: [], nextCursor: null },
    error: null,
  })
})

/**
 * GET /api/v1/entries/:id
 */
entries.get('/:id', async (c) => {
  const _id = c.req.param('id')
  // TODO: fetch entry from Supabase, enforce user_id = auth.uid()
  return c.json<{ data: null; error: { code: string; message: string } }>(
    { data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Coming in Phase 2' } },
    501,
  )
})

/**
 * DELETE /api/v1/entries/:id
 * Soft-delete: sets hidden = true.
 */
entries.delete('/:id', async (c) => {
  const _id = c.req.param('id')
  // TODO: soft-delete in Supabase (set hidden = true)
  return c.body(null, 204)
})

export default entries
