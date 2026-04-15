// Garden — the main canvas where plants are displayed.
// Phase 2: real plants from Supabase via /api/v1/garden.

import { useState, useEffect, useCallback } from 'react'
import { api, type GardenPlant } from '../lib/api'
import { localStore } from '../lib/localStore'
import AddEntryModal from './AddEntryModal'

// ---------------------------------------------------------------------------
// Plant emoji map
// ---------------------------------------------------------------------------
const PLANT_EMOJI: Record<string, string[]> = {
  sunflower:      ['🌱', '🌿', '🌻'],
  herb:           ['🌱', '🌿', '🌿'],
  cactus:         ['🌱', '🌵', '🌵'],
  cherry_blossom: ['🌱', '🌸', '🌸'],
  tree:           ['🌱', '🌲', '🌳'],
  seedling:       ['🌱', '🌱', '🌿'],
  flower:         ['🌱', '🌼', '🌺'],
}

const CATEGORY_COLORS: Record<string, string> = {
  people:   'bg-pink-100 border-pink-300',
  health:   'bg-green-100 border-green-300',
  work:     'bg-blue-100 border-blue-300',
  moments:  'bg-purple-100 border-purple-300',
  nature:   'bg-emerald-100 border-emerald-300',
  learning: 'bg-yellow-100 border-yellow-300',
  default:  'bg-amber-100 border-amber-300',
}

function plantEmoji(plant: GardenPlant): string {
  const stages = PLANT_EMOJI[plant.plantType] ?? PLANT_EMOJI.flower
  return stages[Math.min(plant.plantStage - 1, stages.length - 1)]
}

// ---------------------------------------------------------------------------
// GardenGrid — renders a 24×24 cell grid
// ---------------------------------------------------------------------------
function GardenGrid({ plants, onPlantClick }: { plants: GardenPlant[]; onPlantClick: (p: GardenPlant) => void }) {
  // Build lookup map: "x,y" -> plant
  const plantMap = new Map(plants.map((p) => [`${p.x},${p.y}`, p]))

  // Determine displayed grid size (min 8×6, expands to cover all plants)
  const maxX = Math.max(...plants.map((p) => p.x), 7)
  const maxY = Math.max(...plants.map((p) => p.y), 5)
  const cols = maxX + 1
  const rows = maxY + 1

  return (
    <div
      className="w-full overflow-auto"
      style={{ maxHeight: '60vh' }}
    >
      <div
        className="grid gap-1 min-w-max mx-auto p-2"
        style={{ gridTemplateColumns: `repeat(${cols}, 2.25rem)` }}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const x = i % cols
          const y = Math.floor(i / cols)
          const plant = plantMap.get(`${x},${y}`)
          const color = plant ? (CATEGORY_COLORS[plant.category] ?? CATEGORY_COLORS.default) : ''

          return (
            <div
              key={`${x},${y}`}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center text-lg transition-transform cursor-default select-none
                ${plant
                  ? `${color} hover:scale-125 cursor-pointer shadow-sm`
                  : 'border-dashed border-amber-200 bg-amber-50/40'}`}
              title={plant ? `${plant.category} · ${new Date(plant.createdAt).toLocaleDateString()}` : ''}
              onClick={() => plant && onPlantClick(plant)}
            >
              {plant ? plantEmoji(plant) : ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Garden component
// ---------------------------------------------------------------------------
export default function Garden({ isGuest = false }: { isGuest?: boolean }) {
  const [plants, setPlants] = useState<GardenPlant[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedPlant, setSelectedPlant] = useState<GardenPlant | null>(null)

  const fetchGarden = useCallback(async () => {
    if (isGuest) {
      setPlants(localStore.getPlants())
      setLoading(false)
      return
    }
    const { data, error } = await api.garden.get()
    if (!error && data) {
      setPlants(data.plants)
    }
    setLoading(false)
  }, [isGuest])

  useEffect(() => { fetchGarden() }, [fetchGarden])

  function handleAdded() {
    fetchGarden()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-amber-600 text-sm">Loading your garden…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Garden canvas */}
      {plants.length === 0 ? (
        <div className="w-full max-w-lg aspect-[4/3] rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-b from-sky-100 to-amber-100 flex flex-col items-center justify-center gap-4 p-8">
          <div className="text-6xl">🌿</div>
          <p className="text-amber-800 text-center font-medium">Your garden is waiting to grow.</p>
          <p className="text-amber-600 text-sm text-center max-w-xs">
            Tap the <span className="font-bold">+</span> button to plant your first gratitude.
          </p>
        </div>
      ) : (
        <div className="w-full rounded-2xl border border-amber-200 bg-gradient-to-b from-sky-50 to-amber-50 p-4 shadow-sm">
          <GardenGrid plants={plants} onPlantClick={setSelectedPlant} />
          <p className="text-center text-xs text-amber-400 mt-3">
            {plants.length} {plants.length === 1 ? 'plant' : 'plants'} growing · tap a plant to view
          </p>
        </div>
      )}

      {/* Legend */}
      {plants.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          {Object.entries(CATEGORY_COLORS).filter(([k]) => k !== 'default').map(([cat, color]) => (
            <span key={cat} className={`px-2 py-1 rounded-full border ${color} capitalize`}>{cat}</span>
          ))}
        </div>
      )}

      {/* Add button */}
      <button
        onClick={() => setShowModal(true)}
        className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-3xl font-light shadow-lg transition-all flex items-center justify-center"
        aria-label="Add new gratitude entry"
      >
        +
      </button>

      {/* Plant detail popover */}
      {selectedPlant && (
        <div
          className="fixed inset-0 bg-black/20 flex items-end sm:items-center justify-center z-40 p-4"
          onClick={() => setSelectedPlant(null)}
        >
          <div className="bg-white rounded-2xl p-6 shadow-xl max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl text-center mb-3">{plantEmoji(selectedPlant)}</div>
            <p className="text-center text-xs font-medium uppercase tracking-wide text-amber-500 mb-1 capitalize">
              {selectedPlant.category}
            </p>
            <p className="text-center text-xs text-amber-400">
              {new Date(selectedPlant.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </p>
            <button
              onClick={() => setSelectedPlant(null)}
              className="mt-4 w-full py-2 text-sm text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add entry modal */}
      {showModal && (
        <AddEntryModal onClose={() => setShowModal(false)} onAdded={handleAdded} isGuest={isGuest} />
      )}
    </div>
  )
}
