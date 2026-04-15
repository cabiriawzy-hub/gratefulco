// Modal for adding a new gratitude entry.

import { useState } from 'react'
import { api } from '../lib/api'
import { localStore } from '../lib/localStore'

interface Props {
  onClose: () => void
  onAdded: (newPlantId?: string) => void
  isGuest?: boolean
}

const MAX_CHARS = 280

export default function AddEntryModal({ onClose, onAdded, isGuest = false }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const remaining = MAX_CHARS - text.length
  const nearLimit = remaining <= 40

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (text.trim().length < 3) return

    setLoading(true)
    setError(null)

    if (isGuest) {
      const plant = localStore.addEntry(text.trim())
      setLoading(false)
      onAdded(plant.entryId)
      onClose()
      return
    }

    const { data, error: apiError } = await api.entries.create(text.trim(), timezone)
    setLoading(false)

    if (apiError) {
      setError(apiError)
      return
    }

    onAdded(data?.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4"
      style={{ background: 'rgba(45,31,20,0.3)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md overflow-hidden"
        style={{
          background: 'var(--color-cloud-white)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-float)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4"
          style={{ borderBottom: '1px solid var(--color-dewdrop)' }}
        >
          <h2
            className="text-xl font-semibold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-garden-green)' }}
          >
            What are you grateful for today?
          </h2>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--color-pebble-gray)', fontFamily: 'var(--font-body)' }}
          >
            Each entry plants a new bloom in your garden.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* Textarea */}
          <div className="relative">
            <textarea
              className="w-full px-4 py-3 resize-none text-sm leading-relaxed transition-all"
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--color-sage-mist)',
                background: 'var(--color-dewdrop)',
                color: 'var(--color-soil-dark)',
                fontFamily: 'var(--font-body)',
                outline: 'none',
                minHeight: '120px',
              }}
              rows={5}
              maxLength={MAX_CHARS}
              placeholder="I'm grateful for…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
              onFocus={(e) => {
                const el = e.currentTarget as HTMLTextAreaElement
                el.style.borderColor = 'var(--color-garden-green)'
                el.style.boxShadow = '0 0 0 3px rgba(74,124,89,0.12)'
              }}
              onBlur={(e) => {
                const el = e.currentTarget as HTMLTextAreaElement
                el.style.borderColor = 'var(--color-sage-mist)'
                el.style.boxShadow = 'none'
              }}
            />
            <span
              className="absolute bottom-3 right-3 text-xs font-medium"
              style={{ color: nearLimit ? 'var(--color-warning)' : 'var(--color-sage-mist)' }}
            >
              {remaining}
            </span>
          </div>

          {/* Error */}
          {error && (
            <p
              className="text-sm px-3 py-2 rounded-lg"
              style={{
                color: 'var(--color-error)',
                background: '#FDF0F0',
              }}
            >
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-full transition-all"
              style={{
                color: 'var(--color-pebble-gray)',
                border: '1px solid var(--color-dewdrop)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-dewdrop)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || text.trim().length < 3}
              className="px-6 py-2 text-sm font-semibold rounded-full transition-all flex items-center gap-2"
              style={{
                background: loading || text.trim().length < 3
                  ? 'var(--color-sage-mist)'
                  : 'var(--color-garden-green)',
                color: 'var(--color-cloud-white)',
                boxShadow: loading || text.trim().length < 3 ? 'none' : 'var(--shadow-md)',
                cursor: loading || text.trim().length < 3 ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget as HTMLButtonElement
                if (btn.disabled) return
                btn.style.background = '#3D6B4A'
                btn.style.transform = 'translateY(-1px)'
                btn.style.boxShadow = 'var(--shadow-lg)'
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget as HTMLButtonElement
                if (btn.disabled) return
                btn.style.background = 'var(--color-garden-green)'
                btn.style.transform = ''
                btn.style.boxShadow = 'var(--shadow-md)'
              }}
            >
              {loading ? (
                <>
                  <span
                    className="w-4 h-4 rounded-full border-2"
                    style={{
                      borderColor: 'rgba(255,255,255,0.4)',
                      borderTopColor: 'white',
                      animation: 'spin 0.8s linear infinite',
                      display: 'inline-block',
                    }}
                  />
                  Planting…
                </>
              ) : (
                <>🌱 Save &amp; Bloom</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
