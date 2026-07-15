import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addChart,
  app,
  activeChart,
  applyShared,
  dateLabel,
  deleteChart,
  loadState,
  NEW_SAMPLE,
  persistState,
  renameActive,
  SAMPLE,
  selectChart,
  updateActiveCode,
} from './state.svelte'

class MemoryStorage {
  private data = new Map<string, string>()

  get length(): number {
    return this.data.size
  }

  clear(): void {
    this.data.clear()
  }

  getItem(key: string): string | null {
    const value = this.data.get(key)
    return value === undefined ? null : value
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage() as unknown as Storage
  loadState()
  app.error = null
  app.editorOpen = true
  app.sidebarOpen = true
})

describe('loadState', () => {
  it('seeds one App login flow chart with theme light on empty storage', () => {
    loadState()
    expect(app.charts).toHaveLength(1)
    expect(app.charts[0].name).toBe('App login flow')
    expect(app.charts[0].code).toBe(SAMPLE)
    expect(app.activeId).toBe(app.charts[0].id)
    expect(app.theme).toBe('light')
  })

  it('seeds with theme light on corrupt JSON', () => {
    localStorage.setItem('mpl-1a', '{not valid json')
    loadState()
    expect(app.charts).toHaveLength(1)
    expect(app.charts[0].name).toBe('App login flow')
    expect(app.theme).toBe('light')
  })

  it('seeds when parsed data has an empty charts array', () => {
    localStorage.setItem('mpl-1a', JSON.stringify({ charts: [], activeId: 'x', theme: 'dark' }))
    loadState()
    expect(app.charts).toHaveLength(1)
    expect(app.theme).toBe('light')
  })

  it('loads a valid persisted document unchanged, preserving a dark theme', () => {
    const stored = {
      charts: [
        { id: 'aaa11111', name: 'Kept', code: 'flowchart TD\n  A --> B', updated: 123 },
        { id: 'bbb22222', name: 'Second', code: 'graph LR\n  X --> Y', updated: 456 },
      ],
      activeId: 'bbb22222',
      theme: 'dark',
    }
    localStorage.setItem('mpl-1a', JSON.stringify(stored))
    loadState()
    expect(app.charts).toEqual(stored.charts)
    expect(app.activeId).toBe('bbb22222')
    expect(app.theme).toBe('dark')
  })

  it('falls back to the first chart when the persisted activeId matches none', () => {
    const stored = {
      charts: [
        { id: 'aaa11111', name: 'Kept', code: 'flowchart TD\n  A --> B', updated: 123 },
        { id: 'bbb22222', name: 'Second', code: 'graph LR\n  X --> Y', updated: 456 },
      ],
      activeId: 'ghost999',
      theme: 'light',
    }
    localStorage.setItem('mpl-1a', JSON.stringify(stored))
    loadState()
    expect(app.activeId).toBe('aaa11111')
    expect(activeChart().id).toBe('aaa11111')
  })
})

describe('persistState', () => {
  it('writes only charts, activeId and theme', () => {
    app.theme = 'dark'
    persistState()
    const raw = localStorage.getItem('mpl-1a')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw as string)
    expect(Object.keys(parsed).sort()).toEqual(['activeId', 'charts', 'theme'])
    expect(parsed.charts).toHaveLength(1)
    expect(parsed.charts[0]).toMatchObject({ name: 'App login flow', code: SAMPLE })
    expect(parsed.activeId).toBe(app.activeId)
    expect(parsed.theme).toBe('dark')
  })

  it('roundtrips through loadState', () => {
    addChart()
    renameActive('Persisted chart')
    persistState()
    const before = app.charts.map((c) => ({ ...c }))
    const beforeActive = app.activeId
    loadState()
    expect(app.charts).toEqual(before)
    expect(app.activeId).toBe(beforeActive)
  })
})

describe('selectChart', () => {
  it('changes the active chart', () => {
    const firstId = app.activeId
    addChart()
    const newId = app.activeId
    expect(newId).not.toBe(firstId)
    selectChart(firstId)
    expect(app.activeId).toBe(firstId)
    selectChart(newId)
    expect(app.activeId).toBe(newId)
  })

  it('clears a stale error when switching charts', () => {
    addChart()
    const other = app.charts[1].id
    app.error = 'Invalid syntax'
    selectChart(other)
    expect(app.error).toBeNull()
  })
})

describe('addChart', () => {
  it('prepends Untitled N and makes it active', () => {
    const before = app.charts.length
    addChart()
    expect(app.charts).toHaveLength(before + 1)
    expect(app.charts[0].name).toBe('Untitled ' + (before + 1))
    expect(app.charts[0].code).toBe(NEW_SAMPLE)
    expect(app.activeId).toBe(app.charts[0].id)
  })
})

describe('deleteChart', () => {
  it('selects the first remaining chart when deleting the active one', () => {
    addChart()
    const activeId = app.activeId
    const remainingId = app.charts[1].id
    deleteChart(activeId)
    expect(app.charts).toHaveLength(1)
    expect(app.activeId).toBe(remainingId)
  })

  it('keeps the active selection when deleting a different chart', () => {
    addChart()
    const activeId = app.activeId
    const otherId = app.charts[1].id
    deleteChart(otherId)
    expect(app.charts).toHaveLength(1)
    expect(app.activeId).toBe(activeId)
  })

  it('reseeds when the last chart is deleted', () => {
    const onlyId = app.activeId
    deleteChart(onlyId)
    expect(app.charts).toHaveLength(1)
    expect(app.charts[0].name).toBe('App login flow')
    expect(app.charts[0].code).toBe(SAMPLE)
    expect(app.activeId).toBe(app.charts[0].id)
    expect(app.charts[0].id).not.toBe(onlyId)
  })

  it('does not change the theme when reseeding the last chart', () => {
    app.theme = 'dark'
    deleteChart(app.activeId)
    expect(app.theme).toBe('dark')
  })
})

describe('renameActive', () => {
  it('sets the name and bumps updated', () => {
    const chart = activeChart()
    chart.updated = 0
    renameActive('New name')
    expect(chart.name).toBe('New name')
    expect(chart.updated).toBeGreaterThan(0)
  })
})

describe('updateActiveCode', () => {
  it('sets the code and bumps updated', () => {
    const chart = activeChart()
    chart.updated = 0
    updateActiveCode('flowchart LR\n  A --> B')
    expect(chart.code).toBe('flowchart LR\n  A --> B')
    expect(chart.updated).toBeGreaterThan(0)
  })
})

describe('applyShared', () => {
  it('selects the existing chart with identical code instead of adding', () => {
    const originalId = activeChart().id
    addChart()
    expect(app.activeId).not.toBe(originalId)
    applyShared({ name: 'ignored', code: SAMPLE })
    expect(app.charts).toHaveLength(2)
    expect(app.activeId).toBe(originalId)
  })

  it('prepends and selects a new chart for unseen code', () => {
    const code = 'flowchart TD\n  X --> Y'
    applyShared({ name: 'Imported', code })
    expect(app.charts).toHaveLength(2)
    expect(app.charts[0]).toMatchObject({ name: 'Imported', code })
    expect(app.activeId).toBe(app.charts[0].id)
  })
})

describe('dateLabel', () => {
  const base = 1_700_000_000_000

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(base)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns just now under 45 seconds', () => {
    expect(dateLabel(base - 10_000)).toBe('Edited just now')
  })

  it('returns minutes ago under an hour, rounding to nearest minute', () => {
    expect(dateLabel(base - 5 * 60_000)).toBe('Edited 5m ago')
    expect(dateLabel(base - 59.8 * 60_000)).toBe('Edited 60m ago')
  })

  it('returns hours ago under a day', () => {
    expect(dateLabel(base - 3 * 3_600_000)).toBe('Edited 3h ago')
  })

  it('returns a month-day date beyond a day', () => {
    const ts = base - 3 * 86_400_000
    const label = dateLabel(ts)
    expect(label).toMatch(/^Edited [A-Z][a-z]{2} \d{1,2}$/)
    expect(label).toBe(
      'Edited ' + new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    )
  })
})
