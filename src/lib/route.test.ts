import { describe, expect, it } from 'vitest'
import { chartHash, parseChartHash } from './route'

describe('chartHash', () => {
  it('builds a #/c/ fragment from an id', () => {
    expect(chartHash('abc12345')).toBe('#/c/abc12345')
  })
})

describe('parseChartHash', () => {
  it('roundtrips ids produced by chartHash', () => {
    expect(parseChartHash(chartHash('abc12345'))).toBe('abc12345')
  })

  it('rejects share fragments', () => {
    expect(parseChartHash('#code:eNqrVspLzE0=')).toBeNull()
  })

  it('rejects empty, malformed and oversized ids', () => {
    expect(parseChartHash('')).toBeNull()
    expect(parseChartHash('#/c/')).toBeNull()
    expect(parseChartHash('#/c/UPPER')).toBeNull()
    expect(parseChartHash('#/c/has space')).toBeNull()
    expect(parseChartHash('#/c/' + 'a'.repeat(17))).toBeNull()
    expect(parseChartHash('#/chart/abc12345')).toBeNull()
  })
})
