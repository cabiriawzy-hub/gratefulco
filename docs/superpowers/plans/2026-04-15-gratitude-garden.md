# Gratitude Garden Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user gratitude journal web app where each entry becomes a plant in a visual SVG garden, deployable to Vercel with Supabase as the database.

**Architecture:** React (Vite + TypeScript) frontend communicates exclusively with Vercel API Routes (`/api/v1/*`); API routes hold the Supabase service-role key and perform all DB operations. Category detection and grid allocation happen server-side at write time so the frontend only renders pre-computed data.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind CSS, Vitest, Vercel Serverless Functions, Supabase PostgreSQL

---

## File Map

```
gratitude-journal/
├── api/
│   └── v1/
│       ├── entries.ts          # POST /api/v1/entries
│       ├── entries/
│       │   └── [id].ts         # DELETE /api/v1/entries/:id
│       └── garden.ts           # GET /api/v1/garden
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types.ts                # Shared TypeScript types
│   ├── lib/
│   │   ├── classify.ts         # Category detection (keyword matching)
│   │   ├── grid.ts             # Spiral coordinate allocator
│   │   ├── plants.ts           # Plant type mapping + SVG definitions
│   │   └── api.ts              # Frontend fetch wrapper
│   └── components/
│       ├── GardenCanvas.tsx    # SVG garden (pan/zoom, plant grid)
│       ├── Plant.tsx           # Single SVG plant (all types × 3 stages)
│       ├── PlantPopup.tsx      # Popup on plant click
│       ├── EntryModal.tsx      # Full-screen write entry modal
│       ├── MonthFilter.tsx     # Bottom month selector
│       └── AddButton.tsx       # Floating + button
├── supabase/
│   └── schema.sql
├── public/
│   └── manifest.json
├── .env.example
├── vercel.json
├── vite.config.ts
└── package.json
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tailwind.config.js`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `.env.example`, `vercel.json`

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

```bash
cd /Users/bytedance/gratitude-journal
npm create vite@latest . -- --template react-ts
```

Expected output: files created including `src/App.tsx`, `vite.config.ts`, `package.json`.

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install @supabase/supabase-js
npm install -D tailwindcss postcss autoprefixer vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Replace `tailwind.config.js` with:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Replace `src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background: #faf9f6;
  font-family: Georgia, 'Songti SC', serif;
  margin: 0;
}
```

- [ ] **Step 4: Configure Vitest**

Replace `vite.config.ts` with:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
})
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Create .env.example**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_API_BASE=/api/v1
```

- [ ] **Step 6: Create vercel.json**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/((?!api).*)", "destination": "/index.html" }
  ]
}
```

The rewrite ensures all non-API requests serve `index.html` (required for Vite SPA).

- [ ] **Step 7: Create initial App.tsx placeholder**

Replace `src/App.tsx` with:
```typescript
export default function App() {
  return <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
    <p className="text-[#a09890]">感恩花园加载中…</p>
  </div>
}
```

- [ ] **Step 8: Update main.tsx**

Replace `src/main.tsx` with:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 9: Verify dev server starts**

```bash
npm run dev
```

Expected: server starts at `http://localhost:5173`, page shows "感恩花园加载中…".

- [ ] **Step 10: Commit**

```bash
git init
echo "node_modules\n.env\ndist\n.vercel" > .gitignore
git add -A
git commit -m "chore: scaffold vite + react + tailwind project"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write types**

Create `src/types.ts`:
```typescript
export type Category =
  | 'people'
  | 'health'
  | 'work'
  | 'moments'
  | 'nature'
  | 'learning'
  | 'default';

export type PlantType =
  | 'rose'
  | 'fern'
  | 'bamboo'
  | 'mushroom'
  | 'daisy'
  | 'cactus'
  | 'wildflower';

export type PlantStage = 1 | 2 | 3;

export interface Entry {
  id: string;
  body: string;
  category: Category;
  plantType: PlantType;
  plantStage: PlantStage;
  gridX: number;
  gridY: number;
  localDate: string; // YYYY-MM-DD
  createdAt: string; // ISO 8601
}

export interface GardenPlant {
  entryId: string;
  x: number;
  y: number;
  category: Category;
  plantType: PlantType;
  plantStage: PlantStage;
  body: string;
  localDate: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
}

export interface GardenResponse {
  plants: GardenPlant[];
  total: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Database Schema

**Files:**
- Create: `supabase/schema.sql`

- [ ] **Step 1: Write schema**

Create `supabase/schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body        text NOT NULL CHECK (char_length(body) BETWEEN 3 AND 280),
  category    text NOT NULL DEFAULT 'default',
  plant_type  text NOT NULL DEFAULT 'wildflower',
  plant_stage int  NOT NULL DEFAULT 1 CHECK (plant_stage IN (1, 2, 3)),
  grid_x      int  NOT NULL,
  grid_y      int  NOT NULL,
  local_date  date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS entries_grid_pos ON entries(grid_x, grid_y);
CREATE INDEX IF NOT EXISTS entries_created ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS entries_local_date ON entries(local_date);
```

- [ ] **Step 2: Apply schema in Supabase**

1. Go to your Supabase project → SQL Editor
2. Paste the contents of `supabase/schema.sql`
3. Click Run
4. Verify: go to Table Editor → you should see `entries` table with all columns

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add supabase schema for entries"
```

---

## Task 4: Classification System (TDD)

**Files:**
- Create: `src/lib/classify.ts`
- Test: `src/lib/classify.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/classify.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { classify } from './classify'

describe('classify', () => {
  it('detects people category from Chinese family words', () => {
    expect(classify('今天和妈妈视频聊天了')).toBe('people')
  })

  it('detects people category from friend words', () => {
    expect(classify('我的朋友给我发了消息')).toBe('people')
  })

  it('detects health category from sleep', () => {
    expect(classify('昨晚睡眠很好')).toBe('health')
  })

  it('detects health category from exercise', () => {
    expect(classify('今天去健身房运动了')).toBe('health')
  })

  it('detects work category from completion', () => {
    expect(classify('终于完成了这个项目')).toBe('work')
  })

  it('detects moments category from coffee', () => {
    expect(classify('早上的咖啡特别香')).toBe('moments')
  })

  it('detects nature category from sky', () => {
    expect(classify('天空今天很蓝')).toBe('nature')
  })

  it('detects learning category from reading', () => {
    expect(classify('读了一本很好的书')).toBe('learning')
  })

  it('returns default for unmatched text', () => {
    expect(classify('今天很开心')).toBe('default')
  })

  it('detects English keywords too', () => {
    expect(classify('Had coffee with a friend')).toBe('people')
  })

  it('is case insensitive', () => {
    expect(classify('Good SLEEP last night')).toBe('health')
  })

  it('matches first category when multiple keywords present', () => {
    // people keywords appear first in priority order
    expect(classify('朋友和我一起运动')).toBe('people')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- src/lib/classify.test.ts
```

Expected: FAIL — "Cannot find module './classify'"

- [ ] **Step 3: Implement classify.ts**

Create `src/lib/classify.ts`:
```typescript
import type { Category } from '../types'

const RULES: { category: Category; keywords: string[] }[] = [
  {
    category: 'people',
    keywords: [
      '朋友', '家人', '妈妈', '爸爸', '老师', '同事', '姐姐', '哥哥', '妹妹', '弟弟',
      '奶奶', '爷爷', '孩子', '伴侣', '老公', '老婆', '男友', '女友',
      'friend', 'family', 'mom', 'dad', 'sister', 'brother', 'colleague', 'partner',
    ],
  },
  {
    category: 'health',
    keywords: [
      '睡眠', '睡觉', '运动', '健身', '吃', '食物', '身体', '健康', '锻炼', '跑步',
      'sleep', 'exercise', 'food', 'health', 'workout', 'run', 'gym', 'meal', 'eat',
    ],
  },
  {
    category: 'work',
    keywords: [
      '工作', '项目', '完成', '升职', '学校', '考试', '成绩', '任务', '会议', '代码',
      'work', 'project', 'done', 'finished', 'job', 'school', 'exam', 'task', 'meeting',
    ],
  },
  {
    category: 'moments',
    keywords: [
      '咖啡', '阳光', '笑', '小事', '天气', '音乐', '电影', '书', '散步', '茶',
      'coffee', 'sunshine', 'laugh', 'music', 'movie', 'walk', 'tea', 'moment',
    ],
  },
  {
    category: 'nature',
    keywords: [
      '天空', '海', '雨', '山', '树', '花', '自然', '风', '星星', '月亮', '云',
      'sky', 'ocean', 'rain', 'mountain', 'tree', 'nature', 'wind', 'star', 'moon',
    ],
  },
  {
    category: 'learning',
    keywords: [
      '读', '学', '发现', '意识', '书', '知识', '思考', '理解', '研究',
      'read', 'learn', 'discover', 'realize', 'book', 'think', 'understand', 'study',
    ],
  },
]

export function classify(text: string): Category {
  const lower = text.toLowerCase()
  for (const { category, keywords } of RULES) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return category
    }
  }
  return 'default'
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- src/lib/classify.test.ts
```

Expected: All 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/classify.ts src/lib/classify.test.ts
git commit -m "feat: add keyword-based category classifier (TDD)"
```

---

## Task 5: Grid Allocation Algorithm (TDD)

**Files:**
- Create: `src/lib/grid.ts`
- Test: `src/lib/grid.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/grid.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { getSpiralPositions, findNextPosition } from './grid'

describe('getSpiralPositions', () => {
  it('returns 576 positions for a 24x24 grid', () => {
    const positions = getSpiralPositions()
    expect(positions).toHaveLength(576)
  })

  it('first position is center (12, 12)', () => {
    const positions = getSpiralPositions()
    expect(positions[0]).toEqual([12, 12])
  })

  it('all positions are within 0-23 bounds', () => {
    const positions = getSpiralPositions()
    for (const [x, y] of positions) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(23)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(23)
    }
  })

  it('contains no duplicate positions', () => {
    const positions = getSpiralPositions()
    const seen = new Set(positions.map(([x, y]) => `${x},${y}`))
    expect(seen.size).toBe(576)
  })

  it('positions are ordered by distance from center', () => {
    const positions = getSpiralPositions()
    const dist = ([x, y]: [number, number]) =>
      Math.abs(x - 12) + Math.abs(y - 12)
    for (let i = 1; i < positions.length; i++) {
      expect(dist(positions[i])).toBeGreaterThanOrEqual(dist(positions[i - 1]))
    }
  })
})

describe('findNextPosition', () => {
  it('returns center when grid is empty', () => {
    const pos = findNextPosition(new Set())
    expect(pos).toEqual([12, 12])
  })

  it('returns next spiral position when center is occupied', () => {
    const occupied = new Set(['12,12'])
    const pos = findNextPosition(occupied)
    expect(pos).not.toBeNull()
    expect(pos).not.toEqual([12, 12])
  })

  it('returns null when grid is full', () => {
    const occupied = new Set<string>()
    for (let x = 0; x < 24; x++)
      for (let y = 0; y < 24; y++)
        occupied.add(`${x},${y}`)
    expect(findNextPosition(occupied)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- src/lib/grid.test.ts
```

Expected: FAIL — "Cannot find module './grid'"

- [ ] **Step 3: Implement grid.ts**

Create `src/lib/grid.ts`:
```typescript
const GRID_SIZE = 24
const CENTER = 12

let _cache: [number, number][] | null = null

export function getSpiralPositions(): [number, number][] {
  if (_cache) return _cache

  const positions: [number, number][] = []
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      positions.push([x, y])
    }
  }

  positions.sort((a, b) => {
    const da = Math.abs(a[0] - CENTER) + Math.abs(a[1] - CENTER)
    const db = Math.abs(b[0] - CENTER) + Math.abs(b[1] - CENTER)
    if (da !== db) return da - db
    // Deterministic tiebreak: sort by x then y so order is stable
    if (a[0] !== b[0]) return a[0] - b[0]
    return a[1] - b[1]
  })

  _cache = positions
  return positions
}

export function findNextPosition(
  occupied: Set<string>
): [number, number] | null {
  for (const pos of getSpiralPositions()) {
    const key = `${pos[0]},${pos[1]}`
    if (!occupied.has(key)) return pos
  }
  return null
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- src/lib/grid.test.ts
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/grid.ts src/lib/grid.test.ts
git commit -m "feat: add spiral grid coordinate allocator (TDD)"
```

---

## Task 6: Plant Library

**Files:**
- Create: `src/lib/plants.ts`

- [ ] **Step 1: Create plant mapping and SVG definitions**

Create `src/lib/plants.ts`:
```typescript
import type { Category, PlantType, PlantStage } from '../types'

export const CATEGORY_TO_PLANT: Record<Category, PlantType> = {
  people: 'rose',
  health: 'fern',
  work: 'bamboo',
  moments: 'mushroom',
  nature: 'daisy',
  learning: 'cactus',
  default: 'wildflower',
}

// Each entry: [stage1_svg, stage2_svg, stage3_svg]
// viewBox "0 0 40 40", shapes centered for a 40×40 cell
export const PLANT_SVGS: Record<PlantType, Record<PlantStage, string>> = {
  rose: {
    1: `<line x1="20" y1="30" x2="20" y2="38" stroke="#4ade80" stroke-width="2"/>
        <ellipse cx="20" cy="27" rx="4" ry="5" fill="#f9a8d4"/>
        <ellipse cx="20" cy="25" rx="2.5" ry="3" fill="#f472b6"/>`,
    2: `<line x1="20" y1="28" x2="20" y2="38" stroke="#22c55e" stroke-width="2"/>
        <ellipse cx="15" cy="24" rx="4" ry="3" fill="#f9a8d4"/>
        <ellipse cx="25" cy="24" rx="4" ry="3" fill="#f9a8d4"/>
        <circle cx="20" cy="21" r="5" fill="#ec4899"/>
        <circle cx="20" cy="21" r="2.5" fill="#f472b6"/>`,
    3: `<line x1="20" y1="26" x2="20" y2="38" stroke="#16a34a" stroke-width="2.5"/>
        <ellipse cx="13" cy="22" rx="5" ry="3.5" fill="#fda4af"/>
        <ellipse cx="27" cy="22" rx="5" ry="3.5" fill="#fda4af"/>
        <ellipse cx="16" cy="14" rx="3.5" ry="5" fill="#f9a8d4"/>
        <ellipse cx="24" cy="14" rx="3.5" ry="5" fill="#f9a8d4"/>
        <circle cx="20" cy="18" r="6" fill="#ec4899"/>
        <circle cx="20" cy="18" r="3" fill="#be185d"/>`,
  },
  fern: {
    1: `<line x1="20" y1="10" x2="20" y2="38" stroke="#4ade80" stroke-width="2"/>
        <ellipse cx="15" cy="20" rx="6" ry="2.5" fill="#4ade80" transform="rotate(-30 15 20)"/>
        <ellipse cx="25" cy="20" rx="6" ry="2.5" fill="#4ade80" transform="rotate(30 25 20)"/>`,
    2: `<line x1="20" y1="8" x2="20" y2="38" stroke="#22c55e" stroke-width="2"/>
        <ellipse cx="14" cy="18" rx="7" ry="2.5" fill="#4ade80" transform="rotate(-35 14 18)"/>
        <ellipse cx="26" cy="18" rx="7" ry="2.5" fill="#4ade80" transform="rotate(35 26 18)"/>
        <ellipse cx="13" cy="26" rx="7" ry="2.5" fill="#22c55e" transform="rotate(-20 13 26)"/>
        <ellipse cx="27" cy="26" rx="7" ry="2.5" fill="#22c55e" transform="rotate(20 27 26)"/>`,
    3: `<line x1="20" y1="5" x2="20" y2="38" stroke="#16a34a" stroke-width="2.5"/>
        <ellipse cx="13" cy="13" rx="7" ry="2.5" fill="#4ade80" transform="rotate(-40 13 13)"/>
        <ellipse cx="27" cy="13" rx="7" ry="2.5" fill="#4ade80" transform="rotate(40 27 13)"/>
        <ellipse cx="12" cy="21" rx="7" ry="2.5" fill="#22c55e" transform="rotate(-30 12 21)"/>
        <ellipse cx="28" cy="21" rx="7" ry="2.5" fill="#22c55e" transform="rotate(30 28 21)"/>
        <ellipse cx="13" cy="29" rx="6" ry="2" fill="#16a34a" transform="rotate(-20 13 29)"/>
        <ellipse cx="27" cy="29" rx="6" ry="2" fill="#16a34a" transform="rotate(20 27 29)"/>`,
  },
  bamboo: {
    1: `<rect x="18" y="10" width="4" height="26" rx="2" fill="#a3e635"/>
        <rect x="17" y="22" width="6" height="3" rx="1" fill="#65a30d"/>`,
    2: `<rect x="13" y="10" width="5" height="26" rx="2.5" fill="#a3e635"/>
        <rect x="12" y="19" width="7" height="3" rx="1" fill="#65a30d"/>
        <rect x="12" y="28" width="7" height="3" rx="1" fill="#65a30d"/>
        <ellipse cx="11" cy="11" rx="5" ry="2" fill="#4ade80" transform="rotate(-20 11 11)"/>
        <rect x="22" y="13" width="5" height="23" rx="2.5" fill="#84cc16"/>
        <rect x="21" y="23" width="7" height="3" rx="1" fill="#4d7c0f"/>`,
    3: `<rect x="9" y="8" width="5" height="28" rx="2.5" fill="#a3e635"/>
        <rect x="8" y="17" width="7" height="3" rx="1" fill="#65a30d"/>
        <rect x="8" y="27" width="7" height="3" rx="1" fill="#65a30d"/>
        <rect x="18" y="5" width="5" height="31" rx="2.5" fill="#84cc16"/>
        <rect x="17" y="14" width="7" height="3" rx="1" fill="#4d7c0f"/>
        <rect x="17" y="24" width="7" height="3" rx="1" fill="#4d7c0f"/>
        <rect x="27" y="10" width="5" height="26" rx="2.5" fill="#bef264"/>
        <rect x="26" y="20" width="7" height="3" rx="1" fill="#a3e635"/>
        <ellipse cx="7" cy="10" rx="6" ry="2" fill="#4ade80" transform="rotate(-25 7 10)"/>
        <ellipse cx="33" cy="12" rx="6" ry="2" fill="#4ade80" transform="rotate(25 33 12)"/>`,
  },
  mushroom: {
    1: `<rect x="18" y="26" width="4" height="10" rx="1" fill="#fef3c7"/>
        <ellipse cx="20" cy="26" rx="8" ry="6" fill="#f59e0b"/>
        <circle cx="17" cy="23" r="1.5" fill="#fde68a"/>
        <circle cx="22" cy="22" r="1.5" fill="#fde68a"/>`,
    2: `<rect x="17" y="23" width="6" height="13" rx="2" fill="#fef9ee"/>
        <rect x="14" y="27" width="12" height="2.5" rx="1" fill="#e5ddd0"/>
        <ellipse cx="20" cy="22" rx="12" ry="8" fill="#d97706"/>
        <circle cx="15" cy="19" r="2" fill="#fbbf24"/>
        <circle cx="22" cy="17" r="2" fill="#fbbf24"/>
        <circle cx="26" cy="21" r="1.5" fill="#fbbf24"/>`,
    3: `<rect x="15" y="20" width="10" height="16" rx="3" fill="#fef9ee"/>
        <rect x="11" y="24" width="18" height="3" rx="1.5" fill="#e5ddd0"/>
        <ellipse cx="20" cy="19" rx="16" ry="10" fill="#b45309"/>
        <circle cx="13" cy="15" r="2.5" fill="#fbbf24"/>
        <circle cx="21" cy="12" r="2.5" fill="#fbbf24"/>
        <circle cx="28" cy="16" r="2" fill="#fbbf24"/>
        <circle cx="17" cy="20" r="1.5" fill="#fbbf24"/>
        <circle cx="25" cy="13" r="1.5" fill="#fbbf24"/>`,
  },
  daisy: {
    1: `<line x1="20" y1="23" x2="20" y2="36" stroke="#4ade80" stroke-width="2"/>
        <circle cx="20" cy="21" r="3" fill="#fbbf24"/>
        <ellipse cx="20" cy="14" rx="2.5" ry="5.5" fill="white"/>
        <ellipse cx="20" cy="28" rx="2.5" ry="5.5" fill="white"/>
        <ellipse cx="13" cy="21" rx="5.5" ry="2.5" fill="white"/>
        <ellipse cx="27" cy="21" rx="5.5" ry="2.5" fill="white"/>`,
    2: `<line x1="20" y1="25" x2="20" y2="37" stroke="#22c55e" stroke-width="2"/>
        <circle cx="20" cy="21" r="4" fill="#f59e0b"/>
        <ellipse cx="20" cy="12" rx="3" ry="7" fill="white"/>
        <ellipse cx="20" cy="30" rx="3" ry="7" fill="white"/>
        <ellipse cx="11" cy="21" rx="7" ry="3" fill="white"/>
        <ellipse cx="29" cy="21" rx="7" ry="3" fill="white"/>
        <ellipse cx="14" cy="15" rx="3" ry="6" fill="white" transform="rotate(45 14 15)"/>
        <ellipse cx="26" cy="15" rx="3" ry="6" fill="white" transform="rotate(-45 26 15)"/>`,
    3: `<line x1="20" y1="27" x2="20" y2="38" stroke="#16a34a" stroke-width="2.5"/>
        <circle cx="20" cy="20" r="5" fill="#f59e0b"/>
        <ellipse cx="20" cy="10" rx="3" ry="8" fill="white"/>
        <ellipse cx="20" cy="30" rx="3" ry="8" fill="white"/>
        <ellipse cx="10" cy="20" rx="8" ry="3" fill="white"/>
        <ellipse cx="30" cy="20" rx="8" ry="3" fill="white"/>
        <ellipse cx="12" cy="13" rx="3" ry="7" fill="white" transform="rotate(45 12 13)"/>
        <ellipse cx="28" cy="13" rx="3" ry="7" fill="white" transform="rotate(-45 28 13)"/>
        <ellipse cx="12" cy="27" rx="3" ry="7" fill="white" transform="rotate(-45 12 27)"/>
        <ellipse cx="28" cy="27" rx="3" ry="7" fill="white" transform="rotate(45 28 27)"/>`,
  },
  cactus: {
    1: `<rect x="15" y="14" width="10" height="22" rx="5" fill="#4ade80"/>
        <line x1="10" y1="24" x2="15" y2="24" stroke="#4ade80" stroke-width="2.5"/>
        <line x1="25" y1="20" x2="30" y2="20" stroke="#4ade80" stroke-width="2.5"/>`,
    2: `<rect x="14" y="10" width="12" height="28" rx="6" fill="#22c55e"/>
        <rect x="4" y="18" width="10" height="8" rx="4" fill="#4ade80"/>
        <line x1="4" y1="16" x2="4" y2="18" stroke="#4ade80" stroke-width="2.5"/>
        <line x1="28" y1="22" x2="28" y2="20" stroke="#22c55e" stroke-width="2"/>`,
    3: `<rect x="14" y="8" width="12" height="30" rx="6" fill="#16a34a"/>
        <rect x="3" y="16" width="11" height="9" rx="4.5" fill="#22c55e"/>
        <line x1="3" y1="14" x2="3" y2="16" stroke="#22c55e" stroke-width="2.5"/>
        <rect x="26" y="20" width="11" height="9" rx="4.5" fill="#22c55e"/>
        <line x1="37" y1="18" x2="37" y2="20" stroke="#22c55e" stroke-width="2.5"/>
        <circle cx="20" cy="8" r="5" fill="#f472b6"/>
        <circle cx="20" cy="8" r="2.5" fill="#fbbf24"/>`,
  },
  wildflower: {
    1: `<line x1="20" y1="25" x2="20" y2="36" stroke="#a3e635" stroke-width="2"/>
        <circle cx="20" cy="22" r="3.5" fill="#a78bfa"/>
        <circle cx="13" cy="18" r="3" fill="#c4b5fd"/>
        <circle cx="27" cy="18" r="3" fill="#c4b5fd"/>
        <circle cx="20" cy="13" r="3" fill="#c4b5fd"/>`,
    2: `<line x1="20" y1="26" x2="20" y2="37" stroke="#84cc16" stroke-width="2"/>
        <circle cx="20" cy="22" r="4" fill="#7c3aed"/>
        <circle cx="12" cy="17" r="3.5" fill="#a78bfa"/>
        <circle cx="28" cy="17" r="3.5" fill="#a78bfa"/>
        <circle cx="20" cy="11" r="3.5" fill="#a78bfa"/>
        <circle cx="14" cy="27" r="3" fill="#c4b5fd"/>
        <circle cx="26" cy="27" r="3" fill="#c4b5fd"/>
        <ellipse cx="13" cy="33" rx="5" ry="2" fill="#84cc16" transform="rotate(-15 13 33)"/>`,
    3: `<line x1="20" y1="28" x2="20" y2="38" stroke="#65a30d" stroke-width="2.5"/>
        <circle cx="20" cy="20" r="5" fill="#6d28d9"/>
        <circle cx="11" cy="16" r="4" fill="#8b5cf6"/>
        <circle cx="29" cy="16" r="4" fill="#8b5cf6"/>
        <circle cx="20" cy="9" r="4" fill="#8b5cf6"/>
        <circle cx="11" cy="24" r="4" fill="#a78bfa"/>
        <circle cx="29" cy="24" r="4" fill="#a78bfa"/>
        <circle cx="14" cy="10" r="3.5" fill="#c4b5fd"/>
        <circle cx="26" cy="10" r="3.5" fill="#c4b5fd"/>
        <ellipse cx="12" cy="33" rx="6" ry="2" fill="#84cc16" transform="rotate(-20 12 33)"/>
        <ellipse cx="28" cy="33" rx="6" ry="2" fill="#84cc16" transform="rotate(20 28 33)"/>`,
  },
}

export function getPlantForCategory(category: Category): PlantType {
  return CATEGORY_TO_PLANT[category]
}

export function getPlantStage(categoryCount: number): PlantStage {
  if (categoryCount >= 10) return 3
  if (categoryCount >= 3) return 2
  return 1
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/plants.ts
git commit -m "feat: add plant SVG library and category mapping"
```

---

## Task 7: Supabase Client + API Utilities

**Files:**
- Create: `api/_lib/supabase.ts`
- Create: `api/_lib/respond.ts`

- [ ] **Step 1: Create Supabase server client**

```bash
mkdir -p api/_lib
```

Create `api/_lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}
```

- [ ] **Step 2: Create response helpers**

Create `api/_lib/respond.ts`:
```typescript
import type { VercelResponse } from '@vercel/node'

export function ok<T>(res: VercelResponse, data: T, status = 200) {
  return res.status(status).json({ data, error: null })
}

export function err(res: VercelResponse, code: string, message: string, status = 400) {
  return res.status(status).json({ data: null, error: { code, message } })
}
```

- [ ] **Step 3: Install Vercel types**

```bash
npm install -D @vercel/node
```

- [ ] **Step 4: Commit**

```bash
git add api/_lib/
git commit -m "feat: add supabase server client and response helpers"
```

---

## Task 8: API — POST /api/v1/entries

**Files:**
- Create: `api/v1/entries.ts`

- [ ] **Step 1: Create the entries API route**

```bash
mkdir -p api/v1
```

Create `api/v1/entries.ts`:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabase } from '../_lib/supabase'
import { ok, err } from '../_lib/respond'
import { classify } from '../../src/lib/classify'
import { findNextPosition } from '../../src/lib/grid'
import { getPlantForCategory, getPlantStage } from '../../src/lib/plants'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return err(res, 'METHOD_NOT_ALLOWED', 'Use POST', 405)

  const { body, localDate } = req.body as { body?: string; localDate?: string }

  if (!body || body.trim().length < 3) {
    return err(res, 'VALIDATION', 'body must be at least 3 characters')
  }
  if (body.trim().length > 280) {
    return err(res, 'VALIDATION', 'body must be at most 280 characters')
  }
  if (!localDate || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return err(res, 'VALIDATION', 'localDate must be YYYY-MM-DD')
  }

  const supabase = getSupabase()

  // Get occupied grid positions
  const { data: existing, error: fetchError } = await supabase
    .from('entries')
    .select('grid_x, grid_y, category')

  if (fetchError) return err(res, 'DB_ERROR', fetchError.message, 500)

  const occupied = new Set((existing ?? []).map((e: { grid_x: number; grid_y: number }) => `${e.grid_x},${e.grid_y}`))
  const pos = findNextPosition(occupied)
  if (!pos) return err(res, 'GARDEN_FULL', 'The garden is full (576 plants max)', 409)

  // Count existing entries by category for stage calculation
  const category = classify(body)
  const categoryCount = (existing ?? []).filter((e: { category: string }) => e.category === category).length

  const plantType = getPlantForCategory(category)
  const plantStage = getPlantStage(categoryCount + 1) // +1 for this new entry

  const { data: entry, error: insertError } = await supabase
    .from('entries')
    .insert({
      body: body.trim(),
      category,
      plant_type: plantType,
      plant_stage: plantStage,
      grid_x: pos[0],
      grid_y: pos[1],
      local_date: localDate,
    })
    .select()
    .single()

  if (insertError) return err(res, 'DB_ERROR', insertError.message, 500)

  return ok(res, {
    id: entry.id,
    body: entry.body,
    category: entry.category,
    plantType: entry.plant_type,
    plantStage: entry.plant_stage,
    gridX: entry.grid_x,
    gridY: entry.grid_y,
    localDate: entry.local_date,
    createdAt: entry.created_at,
  }, 201)
}
```

- [ ] **Step 2: Test manually with curl (after setting up .env)**

```bash
cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env

npx vercel dev &
sleep 5

curl -X POST http://localhost:3000/api/v1/entries \
  -H "Content-Type: application/json" \
  -d '{"body":"今天和朋友喝咖啡，很开心","localDate":"2026-04-15"}'
```

Expected: `{"data":{"id":"...","category":"people","plantType":"rose",...},"error":null}`

- [ ] **Step 3: Commit**

```bash
git add api/v1/entries.ts
git commit -m "feat: add POST /api/v1/entries with classification and grid allocation"
```

---

## Task 9: API — GET /api/v1/garden

**Files:**
- Modify: `api/v1/entries.ts` — add GET handler for garden endpoint
- Create: `api/v1/garden.ts`

- [ ] **Step 1: Create garden endpoint**

Create `api/v1/garden.ts`:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabase } from '../_lib/supabase'
import { ok, err } from '../_lib/respond'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return err(res, 'METHOD_NOT_ALLOWED', 'Use GET', 405)

  const { from, to } = req.query as { from?: string; to?: string }

  const supabase = getSupabase()
  let query = supabase
    .from('entries')
    .select('id, body, category, plant_type, plant_stage, grid_x, grid_y, local_date, created_at')
    .order('created_at', { ascending: true })

  if (from) query = query.gte('local_date', from)
  if (to) query = query.lte('local_date', to)

  const { data, error } = await query

  if (error) return err(res, 'DB_ERROR', error.message, 500)

  const plants = (data ?? []).map((e: {
    id: string; body: string; category: string; plant_type: string;
    plant_stage: number; grid_x: number; grid_y: number; local_date: string
  }) => ({
    entryId: e.id,
    x: e.grid_x,
    y: e.grid_y,
    category: e.category,
    plantType: e.plant_type,
    plantStage: e.plant_stage,
    body: e.body,
    localDate: e.local_date,
  }))

  return ok(res, { plants, total: plants.length })
}
```

- [ ] **Step 2: Test with curl**

```bash
curl http://localhost:3000/api/v1/garden
```

Expected: `{"data":{"plants":[...],"total":1},"error":null}`

- [ ] **Step 3: Commit**

```bash
git add api/v1/garden.ts
git commit -m "feat: add GET /api/v1/garden"
```

---

## Task 10: API — DELETE /api/v1/entries/:id

**Files:**
- Create: `api/v1/entries/[id].ts`

- [ ] **Step 1: Create delete endpoint**

```bash
mkdir -p api/v1/entries
```

Create `api/v1/entries/[id].ts`:
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getSupabase } from '../../_lib/supabase'
import { ok, err } from '../../_lib/respond'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') return err(res, 'METHOD_NOT_ALLOWED', 'Use DELETE', 405)

  const { id } = req.query as { id: string }
  if (!id) return err(res, 'VALIDATION', 'id is required')

  const supabase = getSupabase()
  const { error } = await supabase.from('entries').delete().eq('id', id)

  if (error) return err(res, 'DB_ERROR', error.message, 500)

  return res.status(204).end()
}
```

- [ ] **Step 2: Test with curl**

```bash
# Use an actual ID from your earlier POST test
curl -X DELETE http://localhost:3000/api/v1/entries/<id>
```

Expected: HTTP 204, no body.

- [ ] **Step 3: Commit**

```bash
git add api/v1/entries/
git commit -m "feat: add DELETE /api/v1/entries/:id"
```

---

## Task 11: Frontend API Client

**Files:**
- Create: `src/lib/api.ts`

- [ ] **Step 1: Create API client**

Create `src/lib/api.ts`:
```typescript
import type { ApiResponse, Entry, GardenResponse } from '../types'

const BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const json: ApiResponse<T> = await res.json()
  if (json.error) throw new Error(json.error.message)
  return json.data as T
}

export const api = {
  createEntry: (body: string, localDate: string): Promise<Entry> =>
    request('/entries', {
      method: 'POST',
      body: JSON.stringify({ body, localDate }),
    }),

  getGarden: (from?: string, to?: string): Promise<GardenResponse> => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const qs = params.toString()
    return request(`/garden${qs ? `?${qs}` : ''}`)
  },

  deleteEntry: async (id: string): Promise<void> => {
    const res = await fetch(`${BASE}/entries/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete')
  },
}

export function todayLocalDate(): string {
  return new Date().toISOString().split('T')[0]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: add frontend API client"
```

---

## Task 12: Plant SVG Component

**Files:**
- Create: `src/components/Plant.tsx`

- [ ] **Step 1: Create Plant component**

Create `src/components/Plant.tsx`:
```typescript
import { PLANT_SVGS } from '../lib/plants'
import type { PlantType, PlantStage } from '../types'

interface Props {
  plantType: PlantType
  plantStage: PlantStage
  x: number        // pixel x (grid col * CELL_SIZE)
  y: number        // pixel y (grid row * CELL_SIZE)
  cellSize: number
  faded?: boolean
  onClick?: () => void
}

export function Plant({ plantType, plantStage, x, y, cellSize, faded = false, onClick }: Props) {
  const svgContent = PLANT_SVGS[plantType][plantStage]

  return (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={faded ? 0.25 : 1}
      style={{ cursor: onClick ? 'pointer' : 'default', transition: 'opacity 0.3s' }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `${plantType} plant, click to view entry` : undefined}
    >
      <rect width={cellSize} height={cellSize} fill="transparent" />
      <svg
        viewBox="0 0 40 40"
        width={cellSize}
        height={cellSize}
        overflow="visible"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </g>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Plant.tsx
git commit -m "feat: add Plant SVG component"
```

---

## Task 13: PlantPopup Component

**Files:**
- Create: `src/components/PlantPopup.tsx`

- [ ] **Step 1: Create PlantPopup**

Create `src/components/PlantPopup.tsx`:
```typescript
import { PLANT_SVGS } from '../lib/plants'
import type { GardenPlant } from '../types'

interface Props {
  plant: GardenPlant
  onClose: () => void
  onDelete: (id: string) => void
}

export function PlantPopup({ plant, onClose, onDelete }: Props) {
  const date = new Date(plant.localDate + 'T12:00:00')
  const formatted = date.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[#faf9f6] rounded-t-2xl w-full max-w-md p-6 pb-10 shadow-2xl border-t border-[#e8e2da] mb-0"
        style={{ animation: 'slideUp 0.25s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs text-[#a09890] uppercase tracking-widest mb-1">{formatted}</p>
            <p className="text-xs text-[#c4bdb5] capitalize">{plant.category} · {plant.plantType}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { onDelete(plant.entryId); onClose() }}
              className="text-xs text-[#c4bdb5] hover:text-red-400 transition-colors"
              aria-label="Delete entry"
            >
              删除
            </button>
            <button onClick={onClose} className="text-[#a09890] hover:text-[#5c4a30] text-xl leading-none" aria-label="Close">×</button>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="shrink-0">
            <svg
              viewBox="0 0 40 40"
              width="60"
              height="60"
              dangerouslySetInnerHTML={{ __html: PLANT_SVGS[plant.plantType][plant.plantStage] }}
            />
          </div>
          <p className="text-[#5c4a30] text-base leading-relaxed font-serif">{plant.body}</p>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PlantPopup.tsx
git commit -m "feat: add PlantPopup component"
```

---

## Task 14: GardenCanvas Component

**Files:**
- Create: `src/components/GardenCanvas.tsx`

- [ ] **Step 1: Create GardenCanvas**

Create `src/components/GardenCanvas.tsx`:
```typescript
import { useRef, useState, useCallback } from 'react'
import { Plant } from './Plant'
import { PlantPopup } from './PlantPopup'
import type { GardenPlant } from '../types'

const CELL_SIZE = 44
const GRID_SIZE = 24
const CANVAS = CELL_SIZE * GRID_SIZE // 1056px

interface Props {
  plants: GardenPlant[]
  activeMonth: string | null // 'YYYY-MM' or null for all
  onDelete: (id: string) => void
}

export function GardenCanvas({ plants, activeMonth, onDelete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<GardenPlant | null>(null)
  const [scale, setScale] = useState(0.65)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null)

  const isActive = (plant: GardenPlant) => {
    if (!activeMonth) return true
    return plant.localDate.startsWith(activeMonth)
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale((s) => Math.min(2, Math.max(0.3, s - e.deltaY * 0.001)))
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    drag.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drag.current) return
    setOffset({
      x: drag.current.ox + (e.clientX - drag.current.startX),
      y: drag.current.oy + (e.clientY - drag.current.startY),
    })
  }
  const handleMouseUp = () => { drag.current = null }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ touchAction: 'none' }}
    >
      <div
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          width: CANVAS,
          height: CANVAS,
          position: 'absolute',
          top: `calc(50% - ${CANVAS / 2}px)`,
          left: `calc(50% - ${CANVAS / 2}px)`,
        }}
      >
        <svg width={CANVAS} height={CANVAS}>
          {/* Garden background */}
          <rect width={CANVAS} height={CANVAS} fill="#f0ebe0" rx="4"/>
          {plants.map((plant) => (
            <Plant
              key={plant.entryId}
              plantType={plant.plantType}
              plantStage={plant.plantStage}
              x={plant.x * CELL_SIZE}
              y={plant.y * CELL_SIZE}
              cellSize={CELL_SIZE}
              faded={!isActive(plant)}
              onClick={() => setSelected(plant)}
            />
          ))}
        </svg>
      </div>

      {plants.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[#c4bdb5] text-sm font-serif">花园还是空的</p>
          <p className="text-[#d0c9c0] text-xs mt-1">点击 + 种下第一份感恩</p>
        </div>
      )}

      {selected && (
        <PlantPopup
          plant={selected}
          onClose={() => setSelected(null)}
          onDelete={(id) => { onDelete(id); setSelected(null) }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GardenCanvas.tsx
git commit -m "feat: add GardenCanvas with pan/zoom and plant rendering"
```

---

## Task 15: EntryModal Component

**Files:**
- Create: `src/components/EntryModal.tsx`

- [ ] **Step 1: Create EntryModal**

Create `src/components/EntryModal.tsx`:
```typescript
import { useState, useEffect, useRef } from 'react'
import { classify } from '../lib/classify'
import { CATEGORY_TO_PLANT, PLANT_SVGS, getPlantStage } from '../lib/plants'
import type { Category } from '../types'

interface Props {
  onSubmit: (body: string) => Promise<void>
  onClose: () => void
  existingCategoryCounts: Record<string, number>
}

const CATEGORY_LABELS: Record<Category, string> = {
  people: '人际', health: '健康', work: '成就',
  moments: '小确幸', nature: '自然', learning: '学习', default: '其他',
}

export function EntryModal({ onSubmit, onClose, existingCategoryCounts }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const category = text.trim().length >= 3 ? classify(text) : null
  const plantType = category ? CATEGORY_TO_PLANT[category] : null
  const stage = category
    ? getPlantStage((existingCategoryCounts[category] ?? 0) + 1)
    : 1
  const previewSvg = plantType ? PLANT_SVGS[plantType][stage] : null

  const handleSubmit = async () => {
    if (!text.trim() || text.trim().length < 3) return
    setLoading(true)
    try {
      await onSubmit(text.trim())
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onClose()
  }

  const charsLeft = 280 - text.length

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/20 backdrop-blur-sm">
      <div
        className="bg-[#faf9f6] rounded-t-2xl w-full max-w-md p-6 pb-10 shadow-2xl"
        style={{ animation: 'slideUp 0.25s ease-out' }}
      >
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs text-[#a09890] uppercase tracking-widest">今天，我感恩…</p>
          <button onClick={onClose} className="text-[#a09890] text-xl leading-none" aria-label="Close">×</button>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          onKeyDown={handleKeyDown}
          placeholder="写下让你感恩的事…"
          className="w-full min-h-[140px] bg-white border border-[#e0d9d0] rounded-xl p-4 text-[#5c4a30] text-base leading-relaxed font-serif resize-none focus:outline-none focus:border-[#b0a89e]"
          maxLength={280}
        />

        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center gap-3">
            {previewSvg && (
              <>
                <svg viewBox="0 0 40 40" width="36" height="36">
                  <g dangerouslySetInnerHTML={{ __html: previewSvg }} />
                </svg>
                <span className="text-xs text-[#a09890]">
                  {CATEGORY_LABELS[category!]}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#c4bdb5]">{charsLeft}</span>
            <button
              onClick={handleSubmit}
              disabled={text.trim().length < 3 || loading}
              className="bg-[#8b7355] disabled:bg-[#c4bdb5] text-white text-sm px-5 py-2 rounded-full transition-colors"
            >
              {loading ? '种下…' : '种下去'}
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-[#d0c9c0] mt-2">⌘↵ 快速提交</p>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EntryModal.tsx
git commit -m "feat: add EntryModal with real-time plant preview"
```

---

## Task 16: MonthFilter + AddButton

**Files:**
- Create: `src/components/MonthFilter.tsx`
- Create: `src/components/AddButton.tsx`

- [ ] **Step 1: Create MonthFilter**

Create `src/components/MonthFilter.tsx`:
```typescript
interface Props {
  months: string[]       // ['2026-04', '2026-03', ...] sorted desc
  active: string | null  // 'YYYY-MM' or null for all
  onChange: (month: string | null) => void
}

export function MonthFilter({ months, active, onChange }: Props) {
  if (months.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 px-4 scrollbar-hide">
      <button
        onClick={() => onChange(null)}
        className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
          !active
            ? 'bg-[#8b7355] text-white border-[#8b7355]'
            : 'text-[#a09890] border-[#e0d9d0] hover:border-[#b0a89e]'
        }`}
      >
        全部
      </button>
      {months.map((m) => {
        const [year, month] = m.split('-')
        const label = `${year}年${parseInt(month)}月`
        return (
          <button
            key={m}
            onClick={() => onChange(m === active ? null : m)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              m === active
                ? 'bg-[#8b7355] text-white border-[#8b7355]'
                : 'text-[#a09890] border-[#e0d9d0] hover:border-[#b0a89e]'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create AddButton**

Create `src/components/AddButton.tsx`:
```typescript
interface Props {
  onClick: () => void
}

export function AddButton({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label="写一条感恩记录"
      className="fixed bottom-20 right-5 z-30 w-14 h-14 bg-[#8b7355] text-white rounded-full shadow-lg text-3xl leading-none flex items-center justify-center hover:bg-[#7a6348] active:scale-95 transition-all"
    >
      +
    </button>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/MonthFilter.tsx src/components/AddButton.tsx
git commit -m "feat: add MonthFilter and AddButton components"
```

---

## Task 17: App Integration

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Wire everything together in App.tsx**

Replace `src/App.tsx` with:
```typescript
import { useState, useEffect, useCallback } from 'react'
import { GardenCanvas } from './components/GardenCanvas'
import { EntryModal } from './components/EntryModal'
import { MonthFilter } from './components/MonthFilter'
import { AddButton } from './components/AddButton'
import { api, todayLocalDate } from './lib/api'
import type { GardenPlant } from './types'

export default function App() {
  const [plants, setPlants] = useState<GardenPlant[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [activeMonth, setActiveMonth] = useState<string | null>(null)

  const loadGarden = useCallback(async () => {
    try {
      const res = await api.getGarden()
      setPlants(res.plants)
    } catch (e) {
      console.error('Failed to load garden', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadGarden() }, [loadGarden])

  const handleSubmit = async (body: string) => {
    const entry = await api.createEntry(body, todayLocalDate())
    const newPlant: GardenPlant = {
      entryId: entry.id,
      x: entry.gridX,
      y: entry.gridY,
      category: entry.category,
      plantType: entry.plantType,
      plantStage: entry.plantStage,
      body: entry.body,
      localDate: entry.localDate,
    }
    setPlants((prev) => [...prev, newPlant])
  }

  const handleDelete = async (id: string) => {
    await api.deleteEntry(id)
    setPlants((prev) => prev.filter((p) => p.entryId !== id))
  }

  // Derive unique months from plants, sorted descending
  const months = Array.from(
    new Set(plants.map((p) => p.localDate.slice(0, 7)))
  ).sort((a, b) => b.localeCompare(a))

  // Count entries per category for plant stage preview
  const categoryCounts: Record<string, number> = {}
  for (const p of plants) {
    categoryCounts[p.category] = (categoryCounts[p.category] ?? 0) + 1
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <p className="text-[#a09890] font-serif text-sm">花园生长中…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col">
      {/* Header */}
      <header className="text-center pt-5 pb-3 shrink-0">
        <h1 className="text-xs text-[#a09890] uppercase tracking-[4px]">感恩花园</h1>
        <p className="text-[#c4bdb5] text-xs mt-0.5">
          {plants.length} 株植物
        </p>
      </header>

      {/* Garden — fills remaining space */}
      <main className="flex-1 relative overflow-hidden">
        <GardenCanvas
          plants={plants}
          activeMonth={activeMonth}
          onDelete={handleDelete}
        />
      </main>

      {/* Month filter */}
      <div className="shrink-0 py-3 bg-[#faf9f6] border-t border-[#f0ebe0]">
        <MonthFilter months={months} active={activeMonth} onChange={setActiveMonth} />
      </div>

      <AddButton onClick={() => setShowModal(true)} />

      {showModal && (
        <EntryModal
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
          existingCategoryCounts={categoryCounts}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify the app in browser**

```bash
npm run dev
```

Open http://localhost:5173. You should see:
- "感恩花园" header
- Empty garden with "花园还是空的" message
- Brown + button in bottom right
- Clicking + opens the modal

Add a test entry. Verify:
- Plant appears in the garden
- Click the plant → popup shows entry text
- Month filter shows the current month

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: integrate all components in App — garden is functional"
```

---

## Task 18: PWA Config

**Files:**
- Modify: `index.html`
- Create: `public/manifest.json`
- Create: `public/icon-192.svg`, `public/icon-512.svg`

- [ ] **Step 1: Create PWA manifest**

Create `public/manifest.json`:
```json
{
  "name": "感恩花园",
  "short_name": "感恩花园",
  "description": "把感恩化为生长的花园",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#faf9f6",
  "theme_color": "#8b7355",
  "icons": [
    { "src": "/icon-192.svg", "sizes": "192x192", "type": "image/svg+xml" },
    { "src": "/icon-512.svg", "sizes": "512x512", "type": "image/svg+xml" }
  ]
}
```

- [ ] **Step 2: Create app icon SVGs**

Create `public/icon-192.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="40" fill="#faf9f6"/>
  <rect x="88" y="48" width="16" height="96" rx="8" fill="#a3e635"/>
  <rect x="80" y="80" width="32" height="10" rx="4" fill="#65a30d"/>
  <rect x="80" y="104" width="32" height="10" rx="4" fill="#65a30d"/>
  <ellipse cx="72" cy="62" rx="20" ry="8" fill="#4ade80" transform="rotate(-25 72 62)"/>
  <ellipse cx="120" cy="68" rx="20" ry="8" fill="#4ade80" transform="rotate(25 120 68)"/>
  <circle cx="96" cy="46" r="12" fill="#f472b6"/>
  <circle cx="96" cy="46" r="6" fill="#fbbf24"/>
</svg>
```

Create `public/icon-512.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#faf9f6"/>
  <rect x="236" y="128" width="40" height="256" rx="20" fill="#a3e635"/>
  <rect x="216" y="210" width="80" height="26" rx="10" fill="#65a30d"/>
  <rect x="216" y="276" width="80" height="26" rx="10" fill="#65a30d"/>
  <ellipse cx="192" cy="165" rx="52" ry="20" fill="#4ade80" transform="rotate(-25 192 165)"/>
  <ellipse cx="320" cy="180" rx="52" ry="20" fill="#4ade80" transform="rotate(25 320 180)"/>
  <circle cx="256" cy="122" r="32" fill="#f472b6"/>
  <circle cx="256" cy="122" r="16" fill="#fbbf24"/>
</svg>
```

- [ ] **Step 3: Update index.html**

Replace the `<head>` section of `index.html` with:
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/icon-192.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#8b7355" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="感恩花园" />
    <link rel="apple-touch-icon" href="/icon-192.svg" />
    <link rel="manifest" href="/manifest.json" />
    <title>感恩花园</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add public/ index.html
git commit -m "feat: add PWA manifest and icons for add-to-home-screen"
```

---

## Task 19: Vercel + Supabase Deployment

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Push to GitHub**

```bash
# Create a new repo at github.com, then:
git remote add origin https://github.com/<your-username>/gratitude-journal.git
git push -u origin main
```

- [ ] **Step 2: Import to Vercel**

1. Go to https://vercel.com/new
2. Click "Import Git Repository" → select `gratitude-journal`
3. Framework Preset: **Vite**
4. Click "Deploy" — the first deploy will fail because env vars aren't set yet

- [ ] **Step 3: Add environment variables in Vercel**

Go to your Vercel project → Settings → Environment Variables. Add:

| Key | Value | Environments |
|-----|-------|-------------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (from Supabase → Settings → API) | Production, Preview, Development |

- [ ] **Step 4: Redeploy**

Go to Deployments → click the failed deploy → "Redeploy".

Expected: build succeeds, app is live at `https://gratitude-journal-xxx.vercel.app`

- [ ] **Step 5: Verify production**

Open the Vercel URL. Add a gratitude entry. Verify:
- Plant appears in garden
- Page reload shows plant is persisted

- [ ] **Step 6: Add to home screen (iPhone)**

On iPhone Safari:
1. Open your Vercel URL
2. Tap the Share button → "添加到主屏幕"
3. Confirm — app icon appears on home screen
4. Open from home screen: runs full-screen, no browser chrome

- [ ] **Step 7: Final commit tag**

```bash
git tag v1.0.0
git push --tags
```

---

## Running All Tests

```bash
npm test
```

Expected: All tests in `classify.test.ts` and `grid.test.ts` pass.

```bash
npm run build
```

Expected: No TypeScript errors, `dist/` created.
