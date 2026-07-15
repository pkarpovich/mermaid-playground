export interface View {
  scale: number
  tx: number
  ty: number
}

export interface Size {
  w: number
  h: number
}

const MIN_SCALE = 0.1
const MAX_SCALE = 4
const FIT_MARGIN = 0.88

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function fitView(size: Size, cw: number, ch: number): View {
  const scale = clamp(Math.min(cw / size.w, ch / size.h) * FIT_MARGIN, MIN_SCALE, MAX_SCALE)
  return {
    scale,
    tx: (cw - size.w * scale) / 2,
    ty: (ch - size.h * scale) / 2,
  }
}

export function zoomAt(view: View, factor: number, cx: number, cy: number): View {
  const scale = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE)
  const k = scale / view.scale
  return {
    scale,
    tx: cx - (cx - view.tx) * k,
    ty: cy - (cy - view.ty) * k,
  }
}

export function resetView(size: Size | null, cw: number, ch: number): View {
  if (!size) return { scale: 1, tx: 0, ty: 0 }
  return {
    scale: 1,
    tx: (cw - size.w) / 2,
    ty: (ch - size.h) / 2,
  }
}
