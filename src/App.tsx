import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { GUEST_MODE_KEY } from './lib/localStore'
import Garden from './components/Garden'
import AuthPage from './components/AuthPage'

function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    // Check if user previously chose guest mode
    if (localStorage.getItem(GUEST_MODE_KEY)) {
      setIsGuest(true)
    }
    // getSession also handles token exchange from email confirmation URL hash
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      // If user signs in via email link, clear guest mode
      if (data.session) {
        localStorage.removeItem(GUEST_MODE_KEY)
        setIsGuest(false)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) {
        localStorage.removeItem(GUEST_MODE_KEY)
        setIsGuest(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  function handleGuest() {
    setIsGuest(true)
  }

  function handleGuestSignOut() {
    localStorage.removeItem(GUEST_MODE_KEY)
    setIsGuest(false)
  }

  // Loading auth state (only when not in guest mode)
  if (session === undefined && !isGuest) {
    return (
      <div
        className="min-h-svh flex items-center justify-center"
        style={{ background: 'var(--color-cloud-white)' }}
      >
        <div
          className="w-8 h-8 rounded-full border-4"
          style={{
            borderColor: 'var(--color-sage-mist)',
            borderTopColor: 'var(--color-garden-green)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    )
  }

  const showApp = session || isGuest

  return (
    <div className="min-h-svh" style={{ background: 'var(--color-cloud-white)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b px-6 py-4 flex items-center justify-between backdrop-blur-sm"
        style={{
          background: 'rgba(250,249,246,0.85)',
          borderColor: 'var(--color-sage-mist)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Logo leaf SVG */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <ellipse cx="14" cy="16" rx="10" ry="12" fill="var(--color-garden-green)" opacity="0.15" />
            <path
              d="M14 24 C14 24 6 18 6 11 C6 7 9.5 4 14 4 C18.5 4 22 7 22 11 C22 18 14 24 14 24Z"
              fill="var(--color-garden-green)"
            />
            <path
              d="M14 24 L14 10"
              stroke="var(--color-cloud-white)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span
            className="text-xl font-semibold tracking-tight"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-soil-dark)' }}
          >
            GratefulCo
          </span>
        </div>

        <div className="flex items-center gap-3">
          {showApp && (
            <>
              {isGuest ? (
                <span
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{
                    background: 'var(--color-sage-mist)',
                    color: 'var(--color-garden-green)',
                  }}
                >
                  Guest
                </span>
              ) : (
                <span
                  className="text-sm hidden sm:block"
                  style={{ color: 'var(--color-pebble-gray)' }}
                >
                  {session?.user.email}
                </span>
              )}
              <button
                onClick={isGuest ? handleGuestSignOut : () => supabase.auth.signOut()}
                className="text-xs font-medium px-3 py-1.5 rounded-full transition-all"
                style={{
                  color: 'var(--color-garden-green)',
                  border: '1px solid var(--color-sage-mist)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-sage-mist)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                }}
              >
                {isGuest ? 'Sign in' : 'Sign out'}
              </button>
            </>
          )}
          {!showApp && (
            <span
              className="text-sm"
              style={{ color: 'var(--color-pebble-gray)', fontFamily: 'var(--font-handwriting)', fontSize: '16px' }}
            >
              Your Gratitude Garden
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 page-content">
        {showApp ? (
          <>
            {isGuest && (
              <div
                className="mb-6 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm"
                style={{
                  background: 'var(--color-dewdrop)',
                  border: '1px solid var(--color-sage-mist)',
                }}
              >
                <span style={{ color: 'var(--color-soil-dark)' }}>
                  🌱 You&rsquo;re in guest mode — your garden lives in this browser.
                </span>
                <button
                  onClick={handleGuestSignOut}
                  className="shrink-0 text-xs font-semibold underline"
                  style={{ color: 'var(--color-garden-green)' }}
                >
                  Create account
                </button>
              </div>
            )}
            <Garden isGuest={isGuest} />
          </>
        ) : <AuthPage onGuest={handleGuest} />}
      </main>
    </div>
  )
}

export default App
