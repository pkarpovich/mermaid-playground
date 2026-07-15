import { describe, expect, it } from 'vitest'
import { clamp, fitView, resetView, zoomAt } from './viewport'

describe('clamp', () => {
  it('returns the value inside the range', () => {
    expect(clamp(2, 0.1, 4)).toBe(2)
  })

  it('clamps below the minimum', () => {
    expect(clamp(-5, 0.1, 4)).toBe(0.1)
  })

  it('clamps above the maximum', () => {
    expect(clamp(99, 0.1, 4)).toBe(4)
  })
})

describe('fitView', () => {
  it('applies the 0.88 factor and centers the content', () => {
    const view = fitView({ w: 200, h: 100 }, 800, 600)
    expect(view.scale).toBeCloseTo(3.52, 10)
    expect(view.tx).toBeCloseTo(48, 10)
    expect(view.ty).toBeCloseTo(124, 10)
  })

  it('clamps huge content to the minimum scale', () => {
    const view = fitView({ w: 100000, h: 100000 }, 100, 100)
    expect(view.scale).toBe(0.1)
  })

  it('clamps tiny content to the maximum scale', () => {
    const view = fitView({ w: 1, h: 1 }, 1000, 1000)
    expect(view.scale).toBe(4)
  })
})

describe('zoomAt', () => {
  it('keeps the point under the cursor fixed', () => {
    const view = { scale: 1.5, tx: 40, ty: 60 }
    const cx = 250
    const cy = 180
    const next = zoomAt(view, 1.7, cx, cy)
    const beforeX = (cx - view.tx) / view.scale
    const beforeY = (cy - view.ty) / view.scale
    const afterX = (cx - next.tx) / next.scale
    const afterY = (cy - next.ty) / next.scale
    expect(afterX).toBeCloseTo(beforeX, 10)
    expect(afterY).toBeCloseTo(beforeY, 10)
  })

  it('clamps the resulting scale at the maximum', () => {
    const next = zoomAt({ scale: 3, tx: 0, ty: 0 }, 2, 100, 100)
    expect(next.scale).toBe(4)
  })

  it('clamps the resulting scale at the minimum', () => {
    const next = zoomAt({ scale: 0.15, tx: 0, ty: 0 }, 0.1, 100, 100)
    expect(next.scale).toBe(0.1)
  })
})

describe('resetView', () => {
  it('centers known content at scale 1', () => {
    const view = resetView({ w: 300, h: 200 }, 900, 500)
    expect(view).toEqual({ scale: 1, tx: 300, ty: 150 })
  })

  it('falls back to the origin when the size is unknown', () => {
    expect(resetView(null, 900, 500)).toEqual({ scale: 1, tx: 0, ty: 0 })
  })
})
