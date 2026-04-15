// Garden — immersive full-screen garden scene inspired by 花花land.
// Each journal entry becomes a flower scattered naturally across a layered landscape.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { api, type GardenPlant } from '../lib/api'
import { localStore } from '../lib/localStore'
import AddEntryModal from './AddEntryModal'

// ---------------------------------------------------------------------------
// Deterministic pseudo-random from a seed string
// ---------------------------------------------------------------------------
function seededRand(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  }
  return () => {
    h ^= h << 13; h ^= h >> 17; h ^= h << 5
    return (h >>> 0) / 0xFFFFFFFF
  }
}

// ---------------------------------------------------------------------------
// Flower SVG components — painterly, varied by category
// ---------------------------------------------------------------------------
const FLOWER_COLORS: Record<string, { petal: string; center: string }> = {
  people:   { petal: '#E8A0B0', center: '#F5C842' },
  health:   { petal: '#7FB08A', center: '#FAF9F6' },
  work:     { petal: '#F5C842', center: '#F5C8A0' },
  moments:  { petal: '#B8A0D8', center: '#FAF9F6' },
  nature:   { petal: '#7FB08A', center: '#F5C842' },
  learning: { petal: '#B8A0D8', center: '#F5C842' },
  default:  { petal: '#E8A0B0', center: '#F5C842' },
}

function TulipSVG({ petal, center, scale = 1 }: { petal: string; center: string; scale?: number }) {
  const w = 28 * scale, h = 44 * scale
  return (
    <svg width={w} height={h} viewBox="0 0 28 44" fill="none">
      <line x1="14" y1="44" x2="14" y2="20" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round"/>
      <ellipse cx="9" cy="32" rx="5" ry="3" fill="#7FB08A" transform="rotate(-25 9 32)"/>
      <ellipse cx="19" cy="28" rx="5" ry="3" fill="#7FB08A" transform="rotate(25 19 28)"/>
      <ellipse cx="14" cy="12" rx="6" ry="9" fill={petal} opacity="0.9"/>
      <ellipse cx="8" cy="16" rx="5" ry="8" fill={petal} opacity="0.75" transform="rotate(-15 8 16)"/>
      <ellipse cx="20" cy="16" rx="5" ry="8" fill={petal} opacity="0.75" transform="rotate(15 20 16)"/>
      <ellipse cx="14" cy="14" rx="3" ry="4" fill={center} opacity="0.6"/>
    </svg>
  )
}

function DaisySVG({ petal, center, scale = 1 }: { petal: string; center: string; scale?: number }) {
  const w = 32 * scale, h = 48 * scale
  return (
    <svg width={w} height={h} viewBox="0 0 32 48" fill="none">
      <line x1="16" y1="48" x2="16" y2="22" stroke="#4A7C59" strokeWidth="2" strokeLinecap="round"/>
      <ellipse cx="10" cy="36" rx="6" ry="3.5" fill="#7FB08A" transform="rotate(-20 10 36)"/>
      <ellipse cx="22" cy="32" rx="6" ry="3.5" fill="#7FB08A" transform="rotate(20 22 32)"/>
      {[0,45,90,135,180,225,270,315].map((a, i) => (
        <ellipse key={i} cx={16 + 8 * Math.cos(a * Math.PI/180)} cy={12 + 8 * Math.sin(a * Math.PI/180)}
          rx="4" ry="6" fill={petal} opacity="0.85"
          transform={`rotate(${a} ${16 + 8 * Math.cos(a * Math.PI/180)} ${12 + 8 * Math.sin(a * Math.PI/180)})`}/>
      ))}
      <circle cx="16" cy="12" r="5" fill={center}/>
    </svg>
  )
}

function WildflowerSVG({ petal, center, scale = 1 }: { petal: string; center: string; scale?: number }) {
  const w = 24 * scale, h = 40 * scale
  return (
    <svg width={w} height={h} viewBox="0 0 24 40" fill="none">
      <path d="M12 40 C11 30 13 22 12 14" stroke="#4A7C59" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M12 28 C8 24 5 26 7 30 C9 34 12 28 12 28Z" fill="#7FB08A"/>
      <path d="M12 22 C16 18 19 20 17 24 C15 28 12 22 12 22Z" fill="#7FB08A"/>
      {[0,60,120,180,240,300].map((a, i) => (
        <ellipse key={i} cx={12 + 6 * Math.cos(a * Math.PI/180)} cy={10 + 6 * Math.sin(a * Math.PI/180)}
          rx="3" ry="5" fill={petal} opacity="0.8"
          transform={`rotate(${a} ${12 + 6 * Math.cos(a * Math.PI/180)} ${10 + 6 * Math.sin(a * Math.PI/180)})`}/>
      ))}
      <circle cx="12" cy="10" r="3.5" fill={center}/>
    </svg>
  )
}

function GrassBlade({ x, h, color }: { x: number; h: number; color: string }) {
  return (
    <path
      d={`M${x} 100 C${x - 3} ${100 - h * 0.4} ${x + 2} ${100 - h * 0.7} ${x + 1} ${100 - h}`}
      stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"
    />
  )
}

// ---------------------------------------------------------------------------
// Placed flower — position + which SVG to render
// ---------------------------------------------------------------------------
type PlacedFlower = {
  plant: GardenPlant
  x: number      // 0–100 percent
  y: number      // 0–100 percent (within garden scene)
  scale: number
  swayDelay: number
  variant: number // 0=tulip, 1=daisy, 2=wildflower
}

function placePlants(plants: GardenPlant[]): PlacedFlower[] {
  return plants.map((plant) => {
    const rand = seededRand(plant.entryId)
    const r = rand
    return {
      plant,
      x: 3 + r() * 94,
      y: 30 + r() * 55,  // keep in lower 70% of scene
      scale: 0.7 + r() * 0.7,
      swayDelay: r() * 3000,
      variant: Math.floor(r() * 3),
    }
  })
}

function FlowerAt({ pf, isNew, onClick }: { pf: PlacedFlower; isNew: boolean; onClick: () => void }) {
  const colors = FLOWER_COLORS[pf.plant.category] ?? FLOWER_COLORS.default
  const FlowerComp = [TulipSVG, DaisySVG, WildflowerSVG][pf.variant]
  return (
    <div
      onClick={onClick}
      title={`${pf.plant.category} · ${new Date(pf.plant.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}`}
      className={isNew ? 'plant-new' : 'plant-sway'}
      style={{
        position: 'absolute',
        left: `${pf.x}%`,
        bottom: `${100 - pf.y}%`,
        transform: 'translateX(-50%)',
        cursor: 'pointer',
        animationDelay: isNew ? '0ms' : `${pf.swayDelay}ms`,
        transformOrigin: 'bottom center',
        zIndex: Math.round(pf.y),
        filter: `drop-shadow(0 2px 4px rgba(45,31,20,0.15))`,
        transition: 'filter 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.filter = 'drop-shadow(0 4px 8px rgba(45,31,20,0.3)) brightness(1.05)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.filter = 'drop-shadow(0 2px 4px rgba(45,31,20,0.15))'}
    >
      <FlowerComp petal={colors.petal} center={colors.center} scale={pf.scale} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Grass layer — decorative blades across the bottom
// ---------------------------------------------------------------------------
function GrassLayer() {
  const blades = useMemo(() => {
    const rand = seededRand('grass-layer')
    const r = rand
    return Array.from({ length: 80 }, (_, i) => ({
      x: (i / 80) * 100 + r() * 1.5 - 0.75,
      h: 6 + r() * 14,
      color: r() > 0.5 ? '#5A9468' : '#7FB08A',
    }))
  }, [])

  return (
    <svg
      viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '18%', pointerEvents: 'none' }}
    >
      {blades.map((b, i) => <GrassBlade key={i} x={b.x} h={b.h} color={b.color} />)}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Garden scene
// ---------------------------------------------------------------------------
function GardenScene({ plants, onPlantClick, newPlantId }: {
  plants: GardenPlant[]
  onPlantClick: (p: GardenPlant) => void
  newPlantId?: string | null
}) {
  const placed = useMemo(() => placePlants(plants), [plants])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '75vh',
        minHeight: '500px',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #c8e6f5 0%, #dff0e8 40%, #b8d9b0 70%, #8ab87a 100%)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      {/* Sky haze */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 50% at 60% 20%, rgba(255,255,220,0.35) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Mid-ground hills */}
      <svg viewBox="0 0 100 30" preserveAspectRatio="none"
        style={{ position: 'absolute', bottom: '15%', left: 0, width: '100%', height: '30%', pointerEvents: 'none', opacity: 0.5 }}>
        <path d="M0 30 C10 10 25 5 40 15 C55 25 65 8 80 12 C90 15 95 20 100 18 L100 30Z" fill="#6aaa5a"/>
      </svg>

      {/* Flowers */}
      {placed.map((pf) => (
        <FlowerAt
          key={pf.plant.entryId}
          pf={pf}
          isNew={pf.plant.entryId === newPlantId}
          onClick={() => onPlantClick(pf.plant)}
        />
      ))}

      {/* Grass */}
      <GrassLayer />

      {/* Ground strip */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '8%',
        background: 'linear-gradient(180deg, #7aaa60 0%, #5a8a48 100%)',
        pointerEvents: 'none',
      }} />

      {/* Empty state overlay */}
      {plants.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '16px',
        }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', color: '#2D4A2D', textShadow: '0 1px 3px rgba(255,255,255,0.6)' }}>
            🌱 Your garden awaits
          </p>
          <p style={{ fontFamily: 'var(--font-handwriting)', fontSize: '18px', color: '#4A7C59', textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}>
            Add your first gratitude to plant a flower
          </p>
        </div>
      )}
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
    if (isGuest) { setPlants(localStore.getPlants()); setLoading(false); return }
    const { data, error } = await api.garden.get()
    if (!error && data) setPlants(data.plants)
    setLoading(false)
  }, [isGuest])

  useEffect(() => { fetchGarden() }, [fetchGarden])

  function handleAdded(newId?: string) {
    if (newId) setNewPlantId(newId)
    fetchGarden()
    setTimeout(() => setNewPlantId(null), 1200)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="w-10 h-10 rounded-full border-4" style={{
          borderColor: 'var(--color-sage-mist)',
          borderTopColor: 'var(--color-garden-green)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'var(--color-pebble-gray)', fontFamily: 'var(--font-handwriting)', fontSize: '18px' }}>
          Watering your garden…
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 600, color: 'var(--color-soil-dark)' }}>
            Your Garden
          </h1>
          {plants.length > 0 && (
            <p style={{ fontSize: '14px', color: 'var(--color-pebble-gray)', marginTop: '2px' }}>
              {plants.length} {plants.length === 1 ? 'bloom' : 'blooms'} growing
            </p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-full"
          style={{
            background: 'var(--color-garden-green)',
            color: 'var(--color-cloud-white)',
            boxShadow: 'var(--shadow-md)',
            transition: 'background 0.15s, transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#3D6B4A'; el.style.transform = 'translateY(-1px)'; el.style.boxShadow = 'var(--shadow-lg)' }}
          onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'var(--color-garden-green)'; el.style.transform = ''; el.style.boxShadow = 'var(--shadow-md)' }}
          aria-label="Add new gratitude entry"
        >
          <span className="text-lg leading-none">+</span>
          New Entry
        </button>
      </div>

      {/* Immersive garden scene */}
      <GardenScene plants={plants} onPlantClick={setSelectedPlant} newPlantId={newPlantId} />

      {/* Category legend */}
      {plants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.keys(FLOWER_COLORS)
            .filter(k => k !== 'default' && plants.some(p => p.category === k))
            .map(cat => (
              <span key={cat} className="px-3 py-1 text-xs font-medium capitalize" style={{
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-dewdrop)',
                color: 'var(--color-garden-green)',
                border: '1px solid var(--color-sage-mist)',
              }}>
                {cat}
              </span>
            ))}
        </div>
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
            style={{ background: 'var(--color-cloud-white)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-float)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              {(() => {
                const colors = FLOWER_COLORS[selectedPlant.category] ?? FLOWER_COLORS.default
                const Comp = [TulipSVG, DaisySVG, WildflowerSVG][selectedPlant.plantStage % 3]
                return <Comp petal={colors.petal} center={colors.center} scale={1.5} />
              })()}
            </div>
            <p className="text-center text-xs font-semibold uppercase tracking-wider mb-1 capitalize"
              style={{ color: 'var(--color-garden-green)' }}>
              {selectedPlant.category}
            </p>
            <p className="text-center text-xs" style={{ color: 'var(--color-pebble-gray)' }}>
              {new Date(selectedPlant.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </p>
            <button
              onClick={() => setSelectedPlant(null)}
              className="mt-5 w-full py-2.5 text-sm font-medium rounded-full"
              style={{ border: '1px solid var(--color-sage-mist)', color: 'var(--color-garden-green)', background: 'transparent', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-dewdrop)'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <AddEntryModal onClose={() => setShowModal(false)} onAdded={handleAdded} isGuest={isGuest} />
      )}
    </div>
  )
}
