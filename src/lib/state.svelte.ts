export interface Chart {
  id: string
  name: string
  code: string
  updated: number
}

type Theme = 'light' | 'dark'

interface AppState {
  charts: Chart[]
  activeId: string
  theme: Theme
  editorOpen: boolean
  sidebarOpen: boolean
  error: string | null
}

export const SAMPLE = `flowchart TD
    A([User opens app]) --> B{Signed in?}
    B -->|Yes| C[Load dashboard]
    B -->|No| D[Show login]
    D --> E[Enter credentials]
    E --> F{Valid?}
    F -->|Yes| C
    F -->|No| D
    C --> G([Ready])`

export const NEW_SAMPLE = `flowchart LR
    A[Start] --> B[Step]
    B --> C([Done])`

const STORE_KEY = 'mpl-1a'

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function makeSeed(): Chart {
  return { id: uid(), name: 'App login flow', code: SAMPLE, updated: Date.now() }
}

const seed = makeSeed()

export const app: AppState = $state({
  charts: [seed],
  activeId: seed.id,
  theme: 'light',
  editorOpen: true,
  sidebarOpen: true,
  error: null,
})

export function activeChart(): Chart {
  return app.charts.find((c) => c.id === app.activeId) ?? app.charts[0]
}

function isChart(value: unknown): value is Chart {
  if (typeof value !== 'object' || value === null) return false
  const c = value as Record<string, unknown>
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.code === 'string' &&
    typeof c.updated === 'number'
  )
}

function isPersisted(value: unknown): value is { charts: Chart[]; activeId: unknown; theme: unknown } {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return Array.isArray(v.charts) && v.charts.length > 0 && v.charts.every(isChart)
}

export function loadState(): void {
  let data: unknown = null
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) data = JSON.parse(raw)
  } catch {
    data = null
  }
  if (isPersisted(data)) {
    app.charts = data.charts
    const hasActive = data.charts.some((c) => c.id === data.activeId)
    app.activeId = hasActive ? (data.activeId as string) : data.charts[0].id
    app.theme = data.theme === 'dark' ? 'dark' : 'light'
    return
  }
  const fresh = makeSeed()
  app.charts = [fresh]
  app.activeId = fresh.id
  app.theme = 'light'
}

export function persistState(): void {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ charts: app.charts, activeId: app.activeId, theme: app.theme }),
    )
  } catch {
    return
  }
}

export function dateLabel(ts: number): string {
  const d = Date.now() - ts
  if (d < 45000) return 'Edited just now'
  if (d < 3600000) return 'Edited ' + Math.round(d / 60000) + 'm ago'
  if (d < 86400000) return 'Edited ' + Math.round(d / 3600000) + 'h ago'
  return 'Edited ' + new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function selectChart(id: string): void {
  if (id === app.activeId) return
  app.activeId = id
  app.error = null
}

export function addChart(): void {
  const chart: Chart = {
    id: uid(),
    name: 'Untitled ' + (app.charts.length + 1),
    code: NEW_SAMPLE,
    updated: Date.now(),
  }
  app.charts.unshift(chart)
  app.activeId = chart.id
  app.error = null
}

export function deleteChart(id: string): void {
  app.charts = app.charts.filter((c) => c.id !== id)
  if (!app.charts.length) {
    const fresh = makeSeed()
    app.charts = [fresh]
    app.activeId = fresh.id
  } else if (id === app.activeId) {
    app.activeId = app.charts[0].id
  }
  app.error = null
}

export function renameActive(name: string): void {
  const chart = activeChart()
  if (!chart) return
  chart.name = name
  chart.updated = Date.now()
}

export function updateActiveCode(code: string): void {
  const chart = activeChart()
  if (!chart) return
  chart.code = code
  chart.updated = Date.now()
}

export function applyShared(shared: { name: string; code: string }): void {
  const existing = app.charts.find((c) => c.code === shared.code)
  if (existing) {
    app.activeId = existing.id
    return
  }
  const chart: Chart = { id: uid(), name: shared.name, code: shared.code, updated: Date.now() }
  app.charts.unshift(chart)
  app.activeId = chart.id
}
