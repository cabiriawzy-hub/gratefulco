// GET  /api/v1/insights/weekly
// POST /api/v1/insights/weekly/generate

import { Hono } from 'hono'

type Category = 'people' | 'health' | 'work' | 'moments' | 'nature' | 'learning' | 'default'

interface WeeklyInsight {
  id: string
  user_id: string
  week_start: string  // YYYY-MM-DD (Monday)
  headline: string
  summary: string
  top_category: Category
  generated_at: string
}

const insights = new Hono()

/**
 * GET /api/v1/insights/weekly
 * Query: ?weekStart=YYYY-MM-DD (defaults to most recent complete Monday)
 */
insights.get('/weekly', async (c) => {
  // TODO: resolve weekStart, query weekly_insights table for this user
  return c.json<{ data: WeeklyInsight | null; error: null }>({
    data: null,
    error: null,
  })
})

/**
 * POST /api/v1/insights/weekly/generate
 * Body: { weekStart: string } (YYYY-MM-DD)
 * Idempotent. Triggers Claude Haiku to generate the weekly summary and stores it.
 */
insights.post('/weekly/generate', async (c) => {
  // TODO: validate weekStart, check if insight already exists (idempotent),
  //       fetch that week's entries for the user, call Claude Haiku via Anthropic SDK,
  //       parse JSON response { headline, summary, topCategory }, upsert to weekly_insights.
  return c.json<{ data: null; error: { code: string; message: string } }>(
    { data: null, error: { code: 'NOT_IMPLEMENTED', message: 'AI insights coming in Phase 3' } },
    501,
  )
})

export default insights
