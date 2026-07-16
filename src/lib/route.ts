import { app, selectChart, applyShared } from './state.svelte'
import { decodeShare } from './share'

const PREFIX = '#/c/'

export function chartHash(id: string): string {
  return PREFIX + id
}

export function parseChartHash(hash: string): string | null {
  if (!hash.startsWith(PREFIX)) return null
  const id = hash.slice(PREFIX.length)
  return /^[a-z0-9]{1,16}$/.test(id) ? id : null
}

let ready = false

function hasChart(id: string): boolean {
  return app.charts.some((c) => c.id === id)
}

function writeHash(id: string, method: 'pushState' | 'replaceState'): void {
  const target = chartHash(id)
  if (location.hash === target) return
  history[method](null, '', target)
}

export function syncActiveHash(id: string): void {
  if (!ready) return
  writeHash(id, 'pushState')
}

async function handleShareHash(hash: string): Promise<void> {
  const shared = await decodeShare(hash)
  if (shared) applyShared(shared)
  else app.error = 'Broken share link'
  writeHash(app.activeId, 'replaceState')
}

function onHashChange(): void {
  const hash = location.hash
  if (hash.startsWith('#code:')) {
    void handleShareHash(hash)
    return
  }
  const id = parseChartHash(hash)
  if (id === app.activeId) return
  if (id && hasChart(id)) {
    selectChart(id)
    return
  }
  writeHash(app.activeId, 'replaceState')
}

export async function initRoute(): Promise<void> {
  const hash = location.hash
  if (hash.startsWith('#code:')) {
    await handleShareHash(hash)
  } else {
    const id = parseChartHash(hash)
    if (id && hasChart(id) && id !== app.activeId) selectChart(id)
    writeHash(app.activeId, 'replaceState')
  }
  ready = true
  window.addEventListener('hashchange', onHashChange)
}
