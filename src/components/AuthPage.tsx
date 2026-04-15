// Auth page — sign in / sign up / guest access with Supabase.

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { GUEST_MODE_KEY } from '../lib/localStore'

type Mode = 'signin' | 'signup' | 'forgot' | 'magic'

export default function AuthPage({ onGuest }: { onGuest: () => void }) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  // Track when sign-up succeeded so we can show "resend" option
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage({ type: 'error', text: error.message })
    } else if (mode === 'signup') {
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
        setPendingConfirmEmail(email)
        setMessage({ type: 'success', text: 'Check your email to confirm your account.' })
      }
    } else if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Password reset link sent — check your email.' })
      }
    } else if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Magic link sent! Click the link in your email to sign in.' })
      }
    }

    setLoading(false)
  }

  async function handleResendConfirmation() {
    if (!pendingConfirmEmail) return
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: pendingConfirmEmail,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Confirmation email resent — check your inbox (and spam folder).' })
    }
    setLoading(false)
  }

  function handleGuestAccess() {
    localStorage.setItem(GUEST_MODE_KEY, '1')
    onGuest()
  }

  function switchMode(m: Mode) {
    setMode(m)
    setMessage(null)
    setPendingConfirmEmail(null)
  }

  const isMagicOrForgot = mode === 'magic' || mode === 'forgot'

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-8">
      <div className="text-center">
        <div className="text-6xl mb-4">🌱</div>
        <h1 className="text-2xl font-bold text-amber-900">GratefulCo</h1>
        <p className="text-amber-600 mt-1 text-sm">Your daily gratitude garden</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-8 w-full max-w-sm">
        {/* Mode tabs — only for main signin/signup */}
        {!isMagicOrForgot && (
          <div className="flex rounded-xl bg-amber-50 p-1 mb-6">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
                  mode === m ? 'bg-white text-amber-900 shadow-sm' : 'text-amber-600 hover:text-amber-800'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>
        )}

        {/* Forgot password / magic link header */}
        {isMagicOrForgot && (
          <div className="mb-6">
            <button
              onClick={() => switchMode('signin')}
              className="text-xs text-amber-500 hover:text-amber-700 mb-4 flex items-center gap-1"
            >
              ← Back to sign in
            </button>
            <h2 className="text-base font-semibold text-amber-900">
              {mode === 'forgot' ? 'Reset your password' : 'Sign in with magic link'}
            </h2>
            <p className="text-xs text-amber-500 mt-1">
              {mode === 'forgot'
                ? "We'll email you a link to reset your password."
                : "We'll send a one-click sign-in link — works even if you haven't confirmed your account yet."}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
          />

          {/* Password field — only for signin/signup */}
          {!isMagicOrForgot && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
            />
          )}

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
                Sending…
              </>
            ) : mode === 'signin' ? 'Sign in'
              : mode === 'signup' ? 'Create account'
              : mode === 'forgot' ? 'Send reset link'
              : 'Send magic link'}
          </button>
        </form>

        {/* Resend confirmation — shown after signup */}
        {pendingConfirmEmail && (
          <div className="mt-4 p-3 bg-amber-50 rounded-xl text-center">
            <p className="text-xs text-amber-600 mb-2">Didn't get the email?</p>
            <button
              onClick={handleResendConfirmation}
              disabled={loading}
              className="text-xs font-medium text-amber-700 hover:text-amber-900 underline disabled:opacity-50"
            >
              Resend confirmation email
            </button>
          </div>
        )}

        {/* Extra links for signin mode */}
        {mode === 'signin' && (
          <div className="flex justify-between mt-3">
            <button
              onClick={() => switchMode('forgot')}
              className="text-xs text-amber-400 hover:text-amber-600"
            >
              Forgot password?
            </button>
            <button
              onClick={() => switchMode('magic')}
              className="text-xs text-amber-400 hover:text-amber-600"
            >
              Email magic link
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-amber-100" />
          <span className="text-xs text-amber-400">or</span>
          <div className="flex-1 h-px bg-amber-100" />
        </div>

        {/* Guest access */}
        <button
          onClick={handleGuestAccess}
          className="w-full py-2.5 border border-amber-200 hover:bg-amber-50 text-amber-700 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <span>🌿</span> Continue as guest
        </button>
        <p className="text-center text-xs text-amber-400 mt-2">
          Your garden is saved locally. Sign up to keep it across devices.
        </p>
      </div>
    </div>
  )
}
