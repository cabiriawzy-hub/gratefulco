// Garden — the main canvas where plants are displayed.
// Phase 2: real plants from Supabase via /api/v1/garden.

import { useState, useEffect, useCallback } from 'react'
import { api, type GardenPlant } from '../lib/api'
import { localStore } from '../lib/localStore'
import AddEntryModal from './AddEntryModal'

// ---------------------------------------------------------------------------
// SVG Plant components — 4 growth stages per the design spec
// ---------------------------------------------------------------------------

function PlantSVG({ stage, color }: { stage: number; color: string }) {
  const s = Math.min(Math.max(stage, 1), 4)

  if (s === 1) {
    return (
      <svg width="32" height="48" viewBox="0 0 32 56" aria-label={`Sprout (stage 1)`}>
        <line x1="16" y1="48" x2="16" y2="32" stroke="var(--color-garden-green)" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="11" cy="30" rx="5" ry="3" fill="var(--color-leaf-light)" transform="rotate(-30 11 30)" />
        <ellipse cx="21" cy="30" rx="5" ry="3" fill="var(--color-leaf-light)" transform="rotate(30 21 30)" />
      </svg>
    )
  }
  if (s === 2) {
    return (
      <svg width="32" height="48" viewBox="0 0 32 56" aria-label={`Budding plant (stage 2)`}>
        <line x1="16" y1="48" x2="16" y2="18" stroke="var(--color-garden-green)" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="10" cy="36" rx="7" ry="4" fill="var(--color-leaf-light)" transform="rotate(-20 10 36)" />
        <ellipse cx="22" cy="30" rx="7" ry="4" fill="var(--color-leaf-light)" transform="rotate(20 22 30)" />
        <ellipse cx="16" cy="16" rx="5" ry="7" fill={color} />
      </svg>
    )
  }
  if (s === 3) {
    return (
      <svg width="32" height="48" viewBox="0 0 32 56" aria-label={`Blooming plant (stage 3)`}>
        <line x1="16" y1="52" x2="16" y2="22" stroke="var(--color-garden-green)" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="8" cy="40" rx="9" ry="5" fill="var(--color-leaf-light)" transform="rotate(-25 8 40)" />
        <ellipse cx="24" cy="38" rx="9" ry="5" fill="var(--color-leaf-light)" transform="rotate(25 24 38)" />
        <circle cx="16" cy="10" r="6" fill={color} opacity="0.9" />
        <circle cx="22" cy="14" r="5" fill={color} opacity="0.8" />
        <circle cx="22" cy="6" r="5" fill="var(--color-peach-warm)" opacity="0.8" />
        <circle cx="10" cy="6" r="5" fill={color} opacity="0.8" />
        <circle cx="10" cy="14" r="5" fill="var(--color-peach-warm)" opacity="0.8" />
        <circle cx="16" cy="10" r="4" fill="var(--color-sunflower-gold)" />
      </svg>
    )
  }
  // Stage 4 — Flourishing
  return (
    <svg width="32" height="48" viewBox="0 0 32 56" aria-label={`Flourishing plant (stage 4)`}>
      <path d="M16 56 C16 40 14 30 16 18" stroke="var(--color-garden-green)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M16 38 C10 32 6 28 8 22" stroke="var(--color-garden-green)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M16 42 C8 38 4 44 8 46 C12 48 16 42 16 42Z" fill="var(--color-leaf-light)" />
      <path d="M16 34 C24 30 28 36 24 38 C20 40 16 34 16 34Z" fill="var(--color-leaf-light)" />
      <circle cx="16" cy="12" r="3" fill="var(--color-sunflower-gold)" />
      <circle cx="16" cy="5" r="5" fill={color} />
      <circle cx="23" cy="9" r="4.5" fill={color} opacity="0.85" />
      <circle cx="23" cy="15" r="4.5" fill="var(--color-peach-warm)" opacity="0.85" />
      <circle cx="9" cy="15" r="4.5" fill={color} opacity="0.85" />
      <circle cx="9" cy="9" r="4.5" fill="var(--color-peach-warm)" opacity="0.85" />
      <circle cx="8" cy="18" r="2" fill="var(--color-sunflower-gold)" />
      <circle cx="5" cy="14" r="3.5" fill="var(--color-lavender-dusk)" opacity="0.8" />
      <circle cx="11" cy="13" r="3.5" fill="var(--color-lavender-dusk)" opacity="0.8" />
      <circle cx="8" cy="10" r="3.5" fill="var(--color-lavender-dusk)" opacity="0.8" />
    </svg>
  )
}

// Category → petal color mapping (from design spec plant species)
const CATEGORY_PETAL: Record<string, string> = {
  people:   'var(--color-blossom-pink)',   // Rose / Cherry blossom
  health:   'var(--color-leaf-light)',     // Fern / herb
  work:     'var(--color-sunflower-gold)', // Sunflower
  moments:  'var(--color-blossom-pink)',   // Daisy
  nature:   'var(--color-leaf-light)',     // Fern
  learning: 'var(--color-lavender-dusk)',  // Lavender
  default:  'var(--color-blossom-pink)',
}

// Category cell background colors
const CATEGORY_BG: Record<string, string> = {
  people:   '#FFF0F4',
  health:   '#EDF7EF',
  work:     '#FFFBEA',
  moments:  '#F5F0FF',
  nature:   '#EDF7EF',
  learning: '#F3EEFF',
  default:  '#F0F6F2',
}

// ---------------------------------------------------------------------------
// GardenGrid
// ---------------------------------------------------------------------------
function GardenGrid({ plants, onPlantClick, newPlantId }: {
  plants: GardenPlant[]
  onPlantClick: (p: GardenPlant) => void
  newPlantId?: string | null
}) {
  const plantMap = new Map(plants.map((p) => [`${p.x},${p.y}`, p]))

  const maxX = Math.max(...plants.map((p) => p.x), 5)
  const maxY = Math.max(...plants.map((p) => p.y), 3)
  const cols = maxX + 1
  const rows = maxY + 1

  return (
    <div className="w-full overflow-auto" style={{ maxHeight: '65vh' }}>
      <div
        className="grid gap-2 min-w-max mx-auto p-3"
        style={{ gridTemplateColumns: `repeat(${cols}, 72px)` }}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const x = i % cols
          const y = Math.floor(i / cols)
          const plant = plantMap.get(`${x},${y}`)
          const isNew = plant?.entryId === newPlantId
          const petalColor = plant ? (CATEGORY_PETAL[plant.category] ?? CATEGORY_PETAL.default) : ''
          const bgColor = plant ? (CATEGORY_BG[plant.category] ?? CATEGORY_BG.default) : ''

          return (
            <div
              key={`${x},${y}`}
              className="flex flex-col items-center justify-end transition-all"
              style={{
                width: '72px',
                height: '96px',
                borderRadius: 'var(--radius-md)',
                border: plant ? `1px solid ${bgColor}` : '1px dashed var(--color-dewdrop)',
                background: plant ? bgColor : 'rgba(240,244,240,0.4)',
                cursor: plant ? 'pointer' : 'default',
                boxShadow: plant ? 'var(--shadow-sm)' : 'none',
                transition: 'transform var(--duration-fast) var(--ease-gentle), box-shadow var(--duration-fast) var(--ease-gentle)',
              }}
              title={plant
                ? `${plant.category} · ${new Date(plant.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}`
                : ''}
              onClick={() => plant && onPlantClick(plant)}
              onMouseEnter={(e) => {
                if (!plant) return
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'translateY(-4px) scale(1.05)'
                el.style.boxShadow = 'var(--shadow-md)'
              }}
              onMouseLeave={(e) => {
                if (!plant) return
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = ''
                el.style.boxShadow = 'var(--shadow-sm)'
              }}
            >
              {plant && (
                <div
                  className={isNew ? 'plant-new' : 'plant-sway'}
                  style={{
                    animationDelay: isNew ? '0ms' : `${((x * 7 + y * 13) % 10) * 300}ms`,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: '8px',
                  }}
                >
                  <PlantSVG stage={plant.plantStage} color={petalColor} />
                </div>
              )}
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
  const [newPlantId, setNewPlantId] = useState<string | null>(null)

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

  function handleAdded(newId?: string) {
    if (newId) setNewPlantId(newId)
    fetchGarden()
    // Clear the "new" highlight after bloom animation
    setTimeout(() => setNewPlantId(null), 1200)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div
          className="w-10 h-10 rounded-full border-4"
          style={{
            borderColor: 'var(--color-sage-mist)',
            borderTopColor: 'var(--color-garden-green)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p className="text-sm" style={{ color: 'var(--color-pebble-gray)', fontFamily: 'var(--font-handwriting)', fontSize: '18px' }}>
          Watering your garden…
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Garden header stats */}
      {plants.length > 0 && (
        <div className="w-full flex items-center justify-between gap-4 px-1">
          <div>
            <h1
              className="text-2xl font-semibold"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-soil-dark)' }}
            >
              Your Garden
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-pebble-gray)' }}>
              {plants.length} {plants.length === 1 ? 'bloom' : 'blooms'} growing
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-full transition-all"
            style={{
              background: 'var(--color-garden-green)',
              color: 'var(--color-cloud-white)',
              boxShadow: 'var(--shadow-md)',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = '#3D6B4A'
              el.style.transform = 'translateY(-1px)'
              el.style.boxShadow = 'var(--shadow-lg)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'var(--color-garden-green)'
              el.style.transform = ''
              el.style.boxShadow = 'var(--shadow-md)'
            }}
            aria-label="Add new gratitude entry"
          >
            <span className="text-lg leading-none">+</span>
            New Entry
          </button>
        </div>
      )}

      {/* Garden canvas */}
      {plants.length === 0 ? (
        <div
          className="w-full max-w-lg aspect-[4/3] flex flex-col items-center justify-center gap-5 p-8"
          style={{
            borderRadius: 'var(--radius-xl)',
            border: '2px dashed var(--color-sage-mist)',
            background: 'linear-gradient(160deg, #f0f7f2 0%, var(--color-cloud-white) 100%)',
          }}
        >
          <div style={{ fontSize: '64px', lineHeight: 1 }}>🌿</div>
          <div className="text-center">
            <p
              className="font-semibold text-lg"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-soil-dark)' }}
            >
              Your garden is waiting to grow.
            </p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-pebble-gray)' }}>
              Plant your first gratitude to watch it bloom.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 font-semibold text-sm px-6 py-3 rounded-full transition-all"
            style={{
              background: 'var(--color-garden-green)',
              color: 'var(--color-cloud-white)',
              boxShadow: 'var(--shadow-md)',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = '#3D6B4A'
              el.style.transform = 'translateY(-1px)'
              el.style.boxShadow = 'var(--shadow-lg)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement
              el.style.background = 'var(--color-garden-green)'
              el.style.transform = ''
              el.style.boxShadow = 'var(--shadow-md)'
            }}
          >
            <span className="text-lg leading-none">+</span>
            Plant a gratitude
          </button>
        </div>
      ) : (
        <div
          className="w-full p-4"
          style={{
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-sage-mist)',
            background: 'linear-gradient(160deg, #f0f7f2 0%, var(--color-cloud-white) 100%)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <GardenGrid plants={plants} onPlantClick={setSelectedPlant} newPlantId={newPlantId} />
        </div>
      )}

      {/* Category legend */}
      {plants.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {Object.entries(CATEGORY_BG)
            .filter(([k]) => k !== 'default' && plants.some((p) => p.category === k))
            .map(([cat]) => (
              <span
                key={cat}
                className="px-3 py-1 text-xs font-medium capitalize"
                style={{
                  borderRadius: 'var(--radius-full)',
                  background: CATEGORY_BG[cat],
                  color: 'var(--color-garden-green)',
                  border: '1px solid var(--color-sage-mist)',
                }}
              >
                {cat}
              </span>
            ))}
        </div>
      )}

      {/* Floating add button — shown only when garden not empty (header button handles empty state) */}
      {plants.length > 0 && (
        <button
          onClick={() => setShowModal(true)}
          className="w-14 h-14 rounded-full text-white text-3xl font-light flex items-center justify-center transition-all"
          style={{
            background: 'var(--color-garden-green)',
            boxShadow: 'var(--shadow-float)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = '#3D6B4A'
            el.style.transform = 'scale(1.08)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'var(--color-garden-green)'
            el.style.transform = ''
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'
          }}
          aria-label="Add new gratitude entry"
        >
          +
        </button>
      )}

      {/* Plant detail popover */}
      {selectedPlant && (
        <div
          className="fixed inset-0 flex items-end sm:items-center justify-center z-40 p-4"
          style={{ background: 'rgba(45,31,20,0.25)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedPlant(null)}
        >
          <div
            className="w-full max-w-xs p-6"
            style={{
              background: 'var(--color-cloud-white)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-float)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <PlantSVG
                stage={selectedPlant.plantStage}
                color={CATEGORY_PETAL[selectedPlant.category] ?? CATEGORY_PETAL.default}
              />
            </div>
            <p
              className="text-center text-xs font-semibold uppercase tracking-wider mb-1 capitalize"
              style={{ color: 'var(--color-garden-green)' }}
            >
              {selectedPlant.category}
            </p>
            <p
              className="text-center text-xs"
              style={{ color: 'var(--color-pebble-gray)' }}
            >
              {new Date(selectedPlant.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </p>
            <p
              className="text-center text-xs mt-1"
              style={{ color: 'var(--color-pebble-gray)' }}
            >
              Stage {selectedPlant.plantStage} of 4
            </p>
            <button
              onClick={() => setSelectedPlant(null)}
              className="mt-5 w-full py-2.5 text-sm font-medium transition-colors rounded-full"
              style={{
                border: '1px solid var(--color-sage-mist)',
                color: 'var(--color-garden-green)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-dewdrop)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
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
