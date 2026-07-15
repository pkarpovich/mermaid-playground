import type { Mermaid, MermaidConfig } from 'mermaid'

type Theme = 'light' | 'dark'

export type RenderResult = { svg: string } | { error: string }

const FONT_FAMILY = "'IBM Plex Sans', system-ui, sans-serif"

export function mermaidConfig(theme: Theme): MermaidConfig {
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: theme === 'dark' ? 'dark' : 'default',
    fontFamily: FONT_FAMILY,
    htmlLabels: false,
    flowchart: { curve: 'basis', htmlLabels: false },
  }
}

export function cleanErr(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message
    .replace(/^error:/i, '')
    .trim()
    .split('\n')
    .filter((line) => line.trim())
    .slice(0, 3)
    .join(' ')
    .slice(0, 260)
}

let loader: Promise<Mermaid> | null = null

function loadMermaid(): Promise<Mermaid> {
  if (!loader) {
    loader = import('mermaid').then((module) => module.default)
    loader.catch(() => {
      loader = null
    })
  }
  return loader
}

function renderId(): string {
  return 'm' + Math.random().toString(36).slice(2, 10)
}

export async function renderDiagram(code: string, theme: Theme): Promise<RenderResult> {
  let mermaid: Mermaid
  try {
    mermaid = await loadMermaid()
    mermaid.initialize(mermaidConfig(theme))
  } catch (error) {
    return { error: cleanErr(error) }
  }
  try {
    await mermaid.parse(code)
  } catch (error) {
    return { error: cleanErr(error) }
  }
  try {
    const { svg } = await mermaid.render(renderId(), code)
    return { svg }
  } catch (error) {
    return { error: cleanErr(error) }
  }
}
