import { readFileSync } from 'node:fs'
import { differenceCiede2000, parse } from 'culori'
import { describe, expect, it } from 'vitest'

const previewCss = readFileSync(new URL('../../design-preview/styles.css', import.meta.url), 'utf8')
const appCss = readFileSync(new URL('../app.css', import.meta.url), 'utf8')

const COLOR_TOKENS = [
  '--bg',
  '--panel',
  '--panel-2',
  '--text',
  '--text-2',
  '--muted',
  '--border',
  '--border-strong',
  '--hover',
  '--accent',
  '--accent-ink',
  '--accent-soft',
  '--danger',
  '--grid-dot',
  '--tok-key',
  '--tok-arrow',
  '--tok-str',
  '--tok-comment',
  '--ok',
]

const ALPHA_TOKENS = new Set(['--grid-dot'])

const deltaE = differenceCiede2000()

function extractDeclaration(css: string, token: string): string | null {
  const match = css.match(new RegExp(`(?:^|[\\s;{])${token}\\s*:\\s*([^;]+);`))
  return match ? match[1].trim() : null
}

function splitTopLevel(value: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of value) {
    if (char === '(') depth++
    if (char === ')') depth--
    if (char === ',' && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  parts.push(current)
  return parts.map((part) => part.trim())
}

function themePair(value: string): { light: string; dark: string } {
  const match = value.match(/^light-dark\(([\s\S]*)\)$/)
  if (!match) return { light: value, dark: value }
  const [light, dark] = splitTopLevel(match[1])
  return { light, dark }
}

function themeValues(css: string, token: string): { light: string; dark: string } | null {
  const declaration = extractDeclaration(css, token)
  if (!declaration) return null
  return themePair(declaration)
}

describe('design token parity', () => {
  for (const token of COLOR_TOKENS) {
    it(`${token} matches the preview in both themes`, () => {
      const preview = themeValues(previewCss, token)
      const app = themeValues(appCss, token)

      expect(preview, `${token} missing from preview`).not.toBeNull()
      expect(app, `${token} missing from src/app.css`).not.toBeNull()
      if (!preview || !app) return

      for (const theme of ['light', 'dark'] as const) {
        const previewColor = parse(preview[theme])
        const appColor = parse(app[theme])
        expect(previewColor, `${token} ${theme} unparseable in preview`).toBeDefined()
        expect(appColor, `${token} ${theme} unparseable in src/app.css`).toBeDefined()
        if (!previewColor || !appColor) continue

        expect(deltaE(previewColor, appColor), `${token} ${theme} deltaE2000`).toBeLessThan(2)

        if (ALPHA_TOKENS.has(token)) {
          const previewAlpha = previewColor.alpha ?? 1
          const appAlpha = appColor.alpha ?? 1
          expect(appAlpha, `${token} ${theme} alpha`).toBe(previewAlpha)
        }
      }
    })
  }
})
