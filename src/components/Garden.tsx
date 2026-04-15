// Garden — the main canvas where plants are displayed.
// Phase 1: empty state placeholder. Real rendering is Phase 2.

export default function Garden() {
  return (
    <div className="flex flex-col items-center gap-8 py-12">
      {/* Empty garden plot */}
      <div className="w-full max-w-lg aspect-[4/3] rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-b from-sky-100 to-amber-100 flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-6xl">🌿</div>
        <p className="text-amber-800 text-center font-medium">
          Your garden is waiting to grow.
        </p>
        <p className="text-amber-600 text-sm text-center max-w-xs">
          Tap the <span className="font-bold">+</span> button to plant your first gratitude.
        </p>
      </div>

      {/* Add entry button */}
      <button
        className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-3xl font-light shadow-lg transition-colors flex items-center justify-center"
        aria-label="Add new gratitude entry"
      >
        +
      </button>

      <p className="text-xs text-amber-400">Phase 1 skeleton — garden visualization coming in Phase 2</p>
    </div>
  )
}
