// Auth page — sign in / sign up / guest access with Supabase.

import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ type: 'error', text: error.message })
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Ensure confirmation email links back to the current app URL (not localhost)
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Check your email to confirm your account.' })
      }
    }

    setLoading(false)
  }

  async function handleGuestAccess() {
    setGuestLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      setMessage({ type: 'error', text: 'Guest mode unavailable. Please sign in or create an account.' })
    }
    setGuestLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-8">
      <div className="text-center">
        <div className="text-6xl mb-4">🌱</div>
        <h1 className="text-2xl font-bold text-amber-900">GratefulCo</h1>
        <p className="text-amber-600 mt-1 text-sm">Your daily gratitude garden</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-8 w-full max-w-sm">
        <div className="flex rounded-xl bg-amber-50 p-1 mb-6">
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setMessage(null) }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                mode === m ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-600 hover:text-amber-800'
              }`}
            >
              {m === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
          />

          {message && (
            <p className={`text-sm rounded-lg px-3 py-2 ${message.type === 'error' ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50'}`}>
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
              </>
            ) : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-amber-100" />
          <span className="text-xs text-amber-400">or</span>
          <div className="flex-1 h-px bg-amber-100" />
        </div>

        {/* Guest access */}
        <button
          onClick={handleGuestAccess}
          disabled={guestLoading}
          className="w-full py-2.5 border border-amber-200 hover:bg-amber-50 disabled:opacity-50 text-amber-700 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {guestLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
              Entering as guest…
            </>
          ) : (
            <>
              <span>🌿</span> Continue as guest
            </>
          )}
        </button>
        <p className="text-center text-xs text-amber-400 mt-2">
          Your garden is saved locally. Sign up to keep it across devices.
        </p>
      </div>
    </div>
  )
}
