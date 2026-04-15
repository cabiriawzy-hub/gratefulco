import Garden from './components/Garden'

function App() {
  return (
    <div className="min-h-svh bg-amber-50">
      <header className="border-b border-amber-200 bg-white/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌱</span>
          <span className="font-semibold text-amber-900 tracking-tight">GratefulCo</span>
        </div>
        <span className="text-sm text-amber-600">Your Gratitude Garden</span>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Garden />
      </main>
    </div>
  )
}

export default App
