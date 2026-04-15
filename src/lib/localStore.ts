// Local storage-based garden data for guest mode.
// Mirrors the shape used by the real API so Garden can use either.

import type { GardenPlant } from './api'

const ENTRIES_KEY = 'gratefulco_guest_entries'

interface LocalEntry {
  id: string
  body: string
  category: string
  plantType: string
  plantStage: number
  x: number
  y: number
  createdAt: string
}

const PLANT_TYPES = ['sunflower', 'herb', 'cactus', 'cherry_blossom', 'tree', 'seedling', 'flower']
const CATEGORY_PLANT_MAP: Record<string, string> = {
  people: 'cherry_blossom',
  health: 'herb',
  work: 'sunflower',
  moments: 'flower',
  nature: 'tree',
  learning: 'seedling',
  default: 'flower',
}

function getEntries(): LocalEntry[] {
  try {
    return JSON.parse(localStorage.getItem(ENTRIES_KEY) ?? '[]') as LocalEntry[]
  } catch {
    return []
  }
}

function saveEntries(entries: LocalEntry[]): void {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
}

function pickNextPosition(entries: LocalEntry[]): { x: number; y: number } {
  const occupied = new Set(entries.map((e) => `${e.x},${e.y}`))
  // Simple spiral from 0,0
  for (let ring = 0; ring < 20; ring++) {
    for (let x = 0; x <= ring * 2; x++) {
      for (let y = 0; y <= ring * 2; y++) {
        const key = `${x},${y}`
        if (!occupied.has(key)) return { x, y }
      }
    }
  }
  return { x: entries.length % 12, y: Math.floor(entries.length / 12) }
}

function detectCategory(body: string): string {
  const lower = body.toLowerCase()
  if (/friend|family|mom|dad|sister|brother|love|people|person/.test(lower)) return 'people'
  if (/health|sleep|exercise|run|yoga|eat|food|breath/.test(lower)) return 'health'
  if (/work|job|project|team|meeting|code|build/.test(lower)) return 'work'
  if (/nature|sky|sun|rain|tree|flower|garden|air/.test(lower)) return 'nature'
  if (/learn|read|book|course|study|discover/.test(lower)) return 'learning'
  return 'moments'
}

export const localStore = {
  getPlants(): GardenPlant[] {
    return getEntries().map((e) => ({
      entryId: e.id,
      x: e.x,
      y: e.y,
      category: e.category as GardenPlant['category'],
      plantType: e.plantType,
      plantStage: e.plantStage,
      createdAt: e.createdAt,
    }))
  },

  addEntry(body: string): GardenPlant {
    const entries = getEntries()
    const category = detectCategory(body)
    const plantType = CATEGORY_PLANT_MAP[category] ?? PLANT_TYPES[entries.length % PLANT_TYPES.length]
    const stage = Math.min(Math.floor(entries.length / 5) + 1, 3)
    const { x, y } = pickNextPosition(entries)

    const entry: LocalEntry = {
      id: crypto.randomUUID(),
      body,
      category,
      plantType,
      plantStage: stage,
      x,
      y,
      createdAt: new Date().toISOString(),
    }

    saveEntries([...entries, entry])

    return {
      entryId: entry.id,
      x: entry.x,
      y: entry.y,
      category: entry.category as GardenPlant['category'],
      plantType: entry.plantType,
      plantStage: entry.plantStage,
      createdAt: entry.createdAt,
    }
  },

  clear(): void {
    localStorage.removeItem(ENTRIES_KEY)
  },
}

export const GUEST_MODE_KEY = 'gratefulco_guest_mode'
