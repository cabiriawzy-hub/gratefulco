// GET /api/v1/garden
// Returns the visual plant list for the garden canvas.
// Optimized for rendering — only visual fields, no entry body.

import { Hono } from 'hono'

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

/**
 * GET /api/v1/garden
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
garden.get('/', async (c) => {
  // TODO: extract auth user, apply date range filter, query Supabase entries table
  //       selecting only visual columns (no body). Compute current grid dimensions.
  return c.json<{ data: GardenResponse; error: null }>({
    data: {
      plants: [],
      gridSize: { cols: 24, rows: 24 },
    },
    error: null,
  })
})

export default garden
