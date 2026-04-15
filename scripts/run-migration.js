#!/usr/bin/env node
// One-time script to run the initial Supabase migration.
// Requires: SUPABASE_DB_URL environment variable with the full PostgreSQL
// connection URL from Supabase Dashboard → Project Settings → Database.
//
// Usage:
//   SUPABASE_DB_URL="postgres://postgres.[ref]:[password]@aws-0-region.pooler.supabase.com:6543/postgres" \
//   node scripts/run-migration.js
//
// Alternatively, paste the contents of supabase/migrations/001_initial_schema.sql
// directly into the Supabase SQL Editor at:
// https://supabase.com/dashboard/project/kwadieuwbhqpkfkfojwt/sql/new

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error('Error: SUPABASE_DB_URL is not set.')
  console.error('')
  console.error('Find your connection URL at:')
  console.error('  Supabase Dashboard → Project Settings → Database → Connection String → URI')
  console.error('')
  console.error('Or apply the migration manually via the Supabase SQL Editor:')
  console.error('  https://supabase.com/dashboard/project/kwadieuwbhqpkfkfojwt/sql/new')
  process.exit(1)
}

const sql = readFileSync(join(__dirname, '../supabase/migrations/001_initial_schema.sql'), 'utf-8')

// Dynamically import pg to avoid it being a hard build dependency.
let pg
try {
  pg = await import('pg')
} catch {
  console.error('pg module not found. Install it temporarily:')
  console.error('  npm install --no-save pg')
  process.exit(1)
}

const client = new pg.default.Client({ connectionString: dbUrl })
await client.connect()
console.log('Connected to database. Running migration…')

try {
  await client.query(sql)
  console.log('✅ Migration applied successfully.')
} catch (err) {
  console.error('❌ Migration failed:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
