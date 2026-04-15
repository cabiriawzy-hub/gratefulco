// GET   /api/v1/me
// PATCH /api/v1/me

import { Hono } from 'hono'
import { requireAuth } from '../lib/auth'
import { adminClient } from '../lib/supabase'

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

me.use('*', requireAuth)

/**
 * GET /api/v1/me
 */
me.get('/', async (c) => {
  const userId = c.get('userId')

  const [profileResult, countResult] = await Promise.all([
    adminClient.from('users').select('id, timezone, settings').eq('id', userId).single(),
    adminClient
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('hidden', false),
  ])

  if (profileResult.error || !profileResult.data) {
    // Profile row may not exist if trigger hasn't fired — create it
    const { data: created, error: createError } = await adminClient
      .from('users')
      .insert({ id: userId })
      .select('id, timezone, settings')
      .single()

    if (createError) {
      console.error('[me GET] create profile:', createError)
      return c.json({ data: null, error: { code: 'DB_ERROR', message: createError.message } }, 500)
    }

    return c.json<{ data: UserProfile; error: null }>({
      data: {
        id: created.id,
        timezone: created.timezone,
        settings: created.settings ?? {},
        entryCount: 0,
        gardenSize: 0,
      },
      error: null,
    })
  }

  const profile = profileResult.data
  const entryCount = countResult.count ?? 0

  return c.json<{ data: UserProfile; error: null }>({
    data: {
      id: profile.id,
      timezone: profile.timezone,
      settings: profile.settings ?? {},
      entryCount,
      gardenSize: entryCount,
    },
    error: null,
  })
})

/**
 * PATCH /api/v1/me
 * Body: { timezone?: string; settings?: Partial<Settings> }
 */
me.patch('/', async (c) => {
  const userId = c.get('userId')

  let body: { timezone?: string; settings?: Record<string, unknown> }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid JSON body' } }, 400)
  }

  const patch: Record<string, unknown> = {}
  if (body.timezone) patch.timezone = body.timezone
  if (body.settings) {
    // Fetch current settings and merge
    const { data: current } = await adminClient
      .from('users')
      .select('settings')
      .eq('id', userId)
      .single()
    patch.settings = { ...(current?.settings ?? {}), ...body.settings }
  }

  if (Object.keys(patch).length === 0) {
    return c.json({ data: null, error: { code: 'BAD_REQUEST', message: 'No updatable fields provided' } }, 400)
  }

  const { data, error } = await adminClient
    .from('users')
    .update(patch)
    .eq('id', userId)
    .select('id, timezone, settings')
    .single()

  if (error) {
    console.error('[me PATCH]', error)
    return c.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, 500)
  }

  return c.json<{ data: Pick<UserProfile, 'id' | 'timezone' | 'settings'>; error: null }>({
    data: { id: data.id, timezone: data.timezone, settings: data.settings ?? {} },
    error: null,
  })
})

export default me
