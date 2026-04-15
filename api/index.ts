// GratefulCo API — Hono app mounted as a Vercel serverless function.
// All routes are prefixed with /api/v1 (enforced by vercel.json rewrites).

import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { cors } from 'hono/cors'
import entries from './v1/entries'
import garden from './v1/garden'
import insights from './v1/insights'
import me from './v1/me'

export const config = { runtime: 'edge' }

const app = new Hono().basePath('/api')

app.use('*', cors({
  origin: process.env.ALLOWED_ORIGIN ?? '*',
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}))

// Health check
app.get('/health', (c) => c.json({ status: 'ok', version: '1.0.0' }))

// Mount routers
app.route('/v1/entries', entries)
app.route('/v1/garden', garden)
app.route('/v1/insights', insights)
app.route('/v1/me', me)

export default handle(app)
