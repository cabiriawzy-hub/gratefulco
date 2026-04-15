// Typed API client for GratefulCo backend.
// All requests go through /api/v1 and include the Supabase session JWT.

import { supabase } from './supabase'

export type Category = 'people' | 'health' | 'work' | 'moments' | 'nature' | 'learning' | 'default'

export interface Entry {
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

export interface GardenPlant {
  entryId: string
  x: number
  y: number
  category: Category
  plantType: string
  plantStage: number
  createdAt: string
}

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<{ data: T | null; error: string | null }> {
  const token = await getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers ?? {}),
  }

  try {
    const res = await fetch(`/api/v1${path}`, { ...init, headers })
    const json = await res.json() as { data: T; error: { message: string } | null }
    if (!res.ok) {
      return { data: null, error: json.error?.message ?? `HTTP ${res.status}` }
    }
    return { data: json.data, error: null }
  } catch (err) {
    return { data: null, error: String(err) }
  }
}

export const api = {
  entries: {
    list(params?: { from?: string; to?: string; category?: Category; limit?: number; cursor?: string }) {
      const q = new URLSearchParams()
      if (params?.from)     q.set('from', params.from)
      if (params?.to)       q.set('to', params.to)
      if (params?.category) q.set('category', params.category)
      if (params?.limit)    q.set('limit', String(params.limit))
      if (params?.cursor)   q.set('cursor', params.cursor)
      return apiFetch<{ entries: Entry[]; nextCursor: string | null }>(
        `/entries${q.toString() ? `?${q}` : ''}`,
      )
    },
    create(body: string, timezone: string) {
      return apiFetch<Entry>('/entries', {
        method: 'POST',
        body: JSON.stringify({ body, timezone }),
      })
    },
    remove(id: string) {
      return fetch(`/api/v1/entries/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
    },
    timeCapsule() {
      return apiFetch<Entry | null>('/entries/time-capsule')
    },
  },

  garden: {
    get(params?: { from?: string; to?: string }) {
      const q = new URLSearchParams()
      if (params?.from) q.set('from', params.from)
      if (params?.to)   q.set('to', params.to)
      return apiFetch<{ plants: GardenPlant[]; gridSize: { cols: number; rows: number } }>(
        `/garden${q.toString() ? `?${q}` : ''}`,
      )
    },
  },

  me: {
    get() { return apiFetch<{ id: string; timezone: string; settings: Record<string, unknown>; entryCount: number; gardenSize: number }>('/me') },
    patch(patch: { timezone?: string; settings?: Record<string, unknown> }) {
      return apiFetch('/me', { method: 'PATCH', body: JSON.stringify(patch) })
    },
  },
}
