// Plant type and grid position helpers.

export type Category = 'people' | 'health' | 'work' | 'moments' | 'nature' | 'learning' | 'default'

const PLANT_BY_CATEGORY: Record<Category, string> = {
  people:   'sunflower',
  health:   'herb',
  work:     'cactus',
  moments:  'cherry_blossom',
  nature:   'tree',
  learning: 'seedling',
  default:  'flower',
}

export function plantTypeForCategory(category: Category): string {
  return PLANT_BY_CATEGORY[category] ?? 'flower'
}

/**
 * Calculate the plant stage (1–3) based on how many entries the user has written today.
 * 1st entry of the day = stage 1 (sprout), 2nd = stage 2 (growing), 3+ = stage 3 (full).
 */
export function plantStageForTodayCount(todayCount: number): number {
  if (todayCount <= 0) return 1
  if (todayCount === 1) return 2
  return 3
}

/**
 * Find the next free (x, y) cell in a 24×24 grid.
 * Returns the first cell not present in `occupied`.
 */
export function nextGridPosition(
  occupied: Array<{ grid_x: number; grid_y: number }>,
  cols = 24,
  rows = 24,
): { grid_x: number; grid_y: number } {
  const taken = new Set(occupied.map((e) => `${e.grid_x},${e.grid_y}`))
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!taken.has(`${col},${row}`)) {
        return { grid_x: col, grid_y: row }
      }
    }
  }
  // Grid full — wrap around by placing randomly (shouldn't happen in practice at 576 entries)
  return { grid_x: Math.floor(Math.random() * cols), grid_y: Math.floor(Math.random() * rows) }
}
