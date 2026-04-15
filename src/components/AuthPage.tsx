// Auth page — sign in / sign up / guest access with Supabase.

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { GUEST_MODE_KEY } from '../lib/localStore'

// Full app URL including base path (e.g. /gratefulco/ on GitHub Pages)
const APP_URL = window.location.origin + import.meta.env.BASE_URL

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
          emailRedirectTo: APP_URL,
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
        redirectTo: APP_URL,
      })
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Password reset link sent — check your email.' })
      }
    } else if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: APP_URL },
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
      options: { emailRedirectTo: APP_URL },
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

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--color-sage-mist)',
    background: 'var(--color-dewdrop)',
    color: 'var(--color-soil-dark)',
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color var(--duration-fast), box-shadow var(--duration-fast)',
    boxSizing: 'border-box' as const,
  }

  function handleInputFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'var(--color-garden-green)'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(74,124,89,0.12)'
  }
  function handleInputBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.style.borderColor = 'var(--color-sage-mist)'
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-8 page-content">
      {/* Hero */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="30" fill="var(--color-sage-mist)" />
            <path
              d="M32 54 C32 54 16 44 16 30 C16 21 23 14 32 14 C41 14 48 21 48 30 C48 44 32 54 32 54Z"
              fill="var(--color-garden-green)"
            />
            <path
              d="M32 54 L32 24"
              stroke="var(--color-cloud-white)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M32 36 C27 30 21 30 21 24 C21 20 26 18 32 22"
              stroke="var(--color-cloud-white)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1
          className="text-3xl font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-soil-dark)' }}
        >
          GratefulCo
        </h1>
        <p
          className="mt-2"
          style={{
            color: 'var(--color-pebble-gray)',
            fontFamily: 'var(--font-handwriting)',
            fontSize: '18px',
          }}
        >
          Your daily gratitude garden
        </p>
      </div>

      {/* Auth card */}
      <div
        className="w-full max-w-sm p-8"
        style={{
          background: 'white',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-dewdrop)',
        }}
      >
        {/* Mode tabs */}
        {!isMagicOrForgot && (
          <div
            className="flex p-1 mb-6"
            style={{
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-dewdrop)',
            }}
          >
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className="flex-1 py-2 text-sm font-medium capitalize transition-all"
                style={{
                  borderRadius: 'var(--radius-sm)',
                  background: mode === m ? 'white' : 'transparent',
                  color: mode === m ? 'var(--color-soil-dark)' : 'var(--color-pebble-gray)',
                  boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  transition: 'all var(--duration-fast) var(--ease-gentle)',
                }}
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
              className="text-xs mb-4 flex items-center gap-1 transition-colors"
              style={{ color: 'var(--color-pebble-gray)', fontFamily: 'var(--font-body)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-garden-green)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-pebble-gray)' }}
            >
              ← Back to sign in
            </button>
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-soil-dark)' }}
            >
              {mode === 'forgot' ? 'Reset your password' : 'Sign in with magic link'}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--color-pebble-gray)' }}>
              {mode === 'forgot'
                ? "We'll email you a link to reset your password."
                : "We'll send a one-click sign-in link to your inbox."}
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
            style={inputStyle}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />

          {!isMagicOrForgot && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          )}

          {message && (
            <p
              className="text-sm px-3 py-2 rounded-lg"
              style={{
                color: message.type === 'error' ? 'var(--color-error)' : 'var(--color-success)',
                background: message.type === 'error' ? '#FDF0F0' : '#F0F9F0',
              }}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm font-semibold rounded-full flex items-center justify-center gap-2 transition-all"
            style={{
              background: loading ? 'var(--color-sage-mist)' : 'var(--color-garden-green)',
              color: 'var(--color-cloud-white)',
              boxShadow: loading ? 'none' : 'var(--shadow-md)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-body)',
              border: 'none',
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
                  className="w-4 h-4 rounded-full border-2 inline-block"
                  style={{
                    borderColor: 'rgba(255,255,255,0.4)',
                    borderTopColor: 'white',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                Sending…
              </>
            ) : mode === 'signin' ? 'Sign in'
              : mode === 'signup' ? 'Create account'
              : mode === 'forgot' ? 'Send reset link'
              : 'Send magic link'}
          </button>
        </form>

        {/* Resend confirmation */}
        {pendingConfirmEmail && (
          <div
            className="mt-4 p-3 text-center rounded-xl"
            style={{ background: 'var(--color-dewdrop)' }}
          >
            <p className="text-xs mb-2" style={{ color: 'var(--color-pebble-gray)' }}>
              Didn&rsquo;t get the email?
            </p>
            <button
              onClick={handleResendConfirmation}
              disabled={loading}
              className="text-xs font-semibold underline"
              style={{ color: 'var(--color-garden-green)', cursor: loading ? 'not-allowed' : 'pointer' }}
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
              className="text-xs transition-colors"
              style={{ color: 'var(--color-pebble-gray)', fontFamily: 'var(--font-body)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-garden-green)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-pebble-gray)' }}
            >
              Forgot password?
            </button>
            <button
              onClick={() => switchMode('magic')}
              className="text-xs transition-colors"
              style={{ color: 'var(--color-pebble-gray)', fontFamily: 'var(--font-body)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-garden-green)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-pebble-gray)' }}
            >
              Email magic link
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: 'var(--color-dewdrop)' }} />
          <span className="text-xs" style={{ color: 'var(--color-pebble-gray)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'var(--color-dewdrop)' }} />
        </div>

        {/* Guest access */}
        <button
          onClick={handleGuestAccess}
          className="w-full py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all rounded-full"
          style={{
            border: '1.5px solid var(--color-sage-mist)',
            color: 'var(--color-garden-green)',
            background: 'transparent',
            fontFamily: 'var(--font-body)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement
            btn.style.background = 'var(--color-dewdrop)'
            btn.style.borderColor = 'var(--color-garden-green)'
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement
            btn.style.background = 'transparent'
            btn.style.borderColor = 'var(--color-sage-mist)'
          }}
        >
          🌿 Continue as guest
        </button>
        <p className="text-center text-xs mt-2" style={{ color: 'var(--color-pebble-gray)' }}>
          Your garden is saved locally. Sign up to keep it across devices.
        </p>
      </div>
    </div>
  )
}
