import { describe, expect, it } from 'vitest'
import { cleanErr, mermaidConfig } from './mermaid'

describe('cleanErr', () => {
  it('strips a leading error: prefix case-insensitively', () => {
    expect(cleanErr(new Error('Error: bad syntax'))).toBe('bad syntax')
    expect(cleanErr(new Error('error: bad syntax'))).toBe('bad syntax')
  })

  it('keeps only the first 3 non-empty lines joined by a space', () => {
    const message = 'error: one\n\ntwo\nthree\nfour\nfive'
    expect(cleanErr(new Error(message))).toBe('one two three')
  })

  it('caps the result at 260 characters', () => {
    const long = 'x'.repeat(400)
    expect(cleanErr(new Error(long))).toHaveLength(260)
  })

  it('coerces non-Error values to string', () => {
    expect(cleanErr('error: plain string')).toBe('plain string')
  })
})

describe('mermaidConfig', () => {
  it('produces the strict light config', () => {
    expect(mermaidConfig('light')).toMatchInlineSnapshot(`
      {
        "flowchart": {
          "curve": "basis",
          "htmlLabels": false,
        },
        "fontFamily": "'IBM Plex Sans', system-ui, sans-serif",
        "htmlLabels": false,
        "securityLevel": "strict",
        "startOnLoad": false,
        "theme": "default",
      }
    `)
  })

  it('maps the dark theme onto mermaid theme "dark"', () => {
    expect(mermaidConfig('dark').theme).toBe('dark')
  })
})
