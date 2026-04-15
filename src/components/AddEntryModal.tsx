// Modal for adding a new gratitude entry.

import { useState } from 'react'
import { api } from '../lib/api'

interface Props {
  onClose: () => void
  onAdded: () => void
}

const MAX_CHARS = 280

export default function AddEntryModal({ onClose, onAdded }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (text.trim().length < 3) return

    setLoading(true)
    setError(null)

    const { error: apiError } = await api.entries.create(text.trim(), timezone)
    setLoading(false)

    if (apiError) {
      setError(apiError)
      return
    }

    onAdded()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-2 border-b border-amber-100">
          <h2 className="text-lg font-semibold text-amber-900">Plant a gratitude</h2>
          <p className="text-sm text-amber-600 mt-0.5">What are you grateful for today?</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="relative">
            <textarea
              className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 placeholder-amber-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm leading-relaxed"
              rows={4}
              maxLength={MAX_CHARS}
              placeholder="I'm grateful for…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
            />
            <span className={`absolute bottom-3 right-3 text-xs ${text.length > MAX_CHARS - 30 ? 'text-amber-500' : 'text-amber-300'}`}>
              {text.length}/{MAX_CHARS}
            </span>
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || text.trim().length < 3}
              className="px-5 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Planting…
                </>
              ) : 'Plant it'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
