// GET   /api/v1/me
// PATCH /api/v1/me

import { Hono } from 'hono'

interface UserProfile {
  id: string
  timezone: string
  settings: {
    aiInsightsOptOut?: boolean
    notificationsEnabled?: boolean
  }
  entryCount: number
  gardenSize: number
}

const me = new Hono()

/**
 * GET /api/v1/me
 */
me.get('/', async (c) => {
  // TODO: extract auth user from JWT, fetch user profile + entry count from Supabase
  return c.json<{ data: null; error: { code: string; message: string } }>(
    { data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Auth coming in Phase 2' } },
    501,
  )
})

/**
 * PATCH /api/v1/me
 * Body: { timezone?: string; settings?: Partial<Settings> }
 */
me.patch('/', async (c) => {
  // TODO: validate auth, merge settings patch, update Supabase users table
  return c.json<{ data: null; error: { code: string; message: string } }>(
    { data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Auth coming in Phase 2' } },
    501,
  )
})

export default me
