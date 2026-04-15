// Auth middleware for Hono edge routes.
// Verifies Supabase JWT and attaches userId to context.

import type { Context, MiddlewareHandler } from 'hono'
import { adminClient } from './supabase'

declare module 'hono' {
  interface ContextVariableMap {
    userId: string
    accessToken: string
  }
}

export const requireAuth: MiddlewareHandler = async (c: Context, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } }, 401)
  }

  const token = authHeader.slice(7)

  const { data: { user }, error } = await adminClient.auth.getUser(token)

  if (error || !user) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401)
  }

  c.set('userId', user.id)
  c.set('accessToken', token)
  await next()
}
