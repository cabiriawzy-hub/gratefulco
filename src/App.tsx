import { useState, useEffect } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Garden from './components/Garden'
import AuthPage from './components/AuthPage'

function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Loading auth state
  if (session === undefined) {
    return (
      <div className="min-h-svh bg-amber-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-amber-50">
      <header className="border-b border-amber-200 bg-white/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌱</span>
          <span className="font-semibold text-amber-900 tracking-tight">GratefulCo</span>
        </div>
        <div className="flex items-center gap-3">
          {session && (
            <>
              <span className="text-sm text-amber-600 hidden sm:block">
                {session.user.email}
              </span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-xs text-amber-500 hover:text-amber-700 transition-colors px-2 py-1 rounded hover:bg-amber-100"
              >
                Sign out
              </button>
            </>
          )}
          {!session && <span className="text-sm text-amber-600">Your Gratitude Garden</span>}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {session ? <Garden /> : <AuthPage />}
      </main>
    </div>
  )
}

export default App
