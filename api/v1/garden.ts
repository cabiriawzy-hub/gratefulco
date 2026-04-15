// GET /api/v1/garden
// Returns the visual plant list for the garden canvas.
// Optimized for rendering — only visual fields, no entry body.

import { Hono } from 'hono'
import { requireAuth } from '../lib/auth'
import { adminClient } from '../lib/supabase'

interface GardenPlant {
  entryId: string
  x: number
  y: number
  category: string
  plantType: string
  plantStage: number
  createdAt: string
}

interface GardenResponse {
  plants: GardenPlant[]
  gridSize: { cols: number; rows: number }
}

const garden = new Hono()

garden.use('*', requireAuth)

/**
 * GET /api/v1/garden
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
garden.get('/', async (c) => {
  const userId = c.get('userId')
  const { from, to } = c.req.query()

  let query = adminClient
    .from('entries')
    .select('id, grid_x, grid_y, category, plant_type, plant_stage, created_at')
    .eq('user_id', userId)
    .eq('hidden', false)
    .order('created_at', { ascending: true })

  if (from) query = query.gte('local_date', from)
  if (to)   query = query.lte('local_date', to)

  const { data, error } = await query

  if (error) {
    console.error('[garden GET]', error)
    return c.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, 500)
  }

  const plants: GardenPlant[] = (data ?? []).map((row) => ({
    entryId:    row.id,
    x:          row.grid_x,
    y:          row.grid_y,
    category:   row.category,
    plantType:  row.plant_type,
    plantStage: row.plant_stage,
    createdAt:  row.created_at,
  }))

  return c.json<{ data: GardenResponse; error: null }>({
    data: {
      plants,
      gridSize: { cols: 24, rows: 24 },
    },
    error: null,
  })
})

export default garden
