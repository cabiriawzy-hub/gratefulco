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
      <div className="min-h-svh bg-amber-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }

  const showApp = session || isGuest

  return (
    <div className="min-h-svh bg-amber-50">
      <header className="border-b border-amber-200 bg-white/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌱</span>
          <span className="font-semibold text-amber-900 tracking-tight">GratefulCo</span>
        </div>
        <div className="flex items-center gap-3">
          {showApp && (
            <>
              {isGuest ? (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg">
                  Guest
                </span>
              ) : (
                <span className="text-sm text-amber-600 hidden sm:block">
                  {session?.user.email}
                </span>
              )}
              <button
                onClick={isGuest ? handleGuestSignOut : () => supabase.auth.signOut()}
                className="text-xs text-amber-500 hover:text-amber-700 transition-colors px-2 py-1 rounded hover:bg-amber-100"
              >
                {isGuest ? 'Sign in' : 'Sign out'}
              </button>
            </>
          )}
          {!showApp && <span className="text-sm text-amber-600">Your Gratitude Garden</span>}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {showApp ? (
          <>
            {isGuest && (
              <div className="mb-6 flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
                <span className="text-amber-700">
                  🌱 You're in guest mode — your garden is saved in this browser.
                </span>
                <button
                  onClick={handleGuestSignOut}
                  className="shrink-0 text-xs font-medium text-amber-600 hover:text-amber-800 underline"
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
