<script lang="ts">
  import { activeChart, app } from '../lib/state.svelte'
  import { renderDiagram } from '../lib/mermaid'
  import { fitView, resetView, zoomAt, type Size } from '../lib/viewport'

  type Theme = 'light' | 'dark'

  let viewer: HTMLDivElement
  let stage: HTMLDivElement
  let panning = $state(false)
  let scalePct = $state(100)

  const view = { scale: 1, tx: 0, ty: 0 }
  let pan: { x: number; y: number; tx: number; ty: number } | null = null

  let prevId: string | null = null
  let prevTheme: Theme | null = null
  let renderSeq = 0

  function applyTransform() {
    stage.style.transform = `translate(${view.tx}px,${view.ty}px) scale(${view.scale})`
  }

  function setScalePct() {
    scalePct = Math.round(view.scale * 100)
  }

  function svgSize(): Size | null {
    const svg = stage.querySelector('svg')
    if (!svg) return null
    const vb = svg.viewBox.baseVal
    if (vb.width) return { w: vb.width, h: vb.height }
    const r = svg.getBoundingClientRect()
    return { w: r.width, h: r.height }
  }

  function fit() {
    const size = svgSize()
    if (!size) return
    Object.assign(view, fitView(size, viewer.clientWidth, viewer.clientHeight))
    applyTransform()
    setScalePct()
  }

  function reset() {
    Object.assign(view, resetView(svgSize(), viewer.clientWidth, viewer.clientHeight))
    applyTransform()
    setScalePct()
  }

  function zoomButton(factor: number) {
    Object.assign(view, zoomAt(view, factor, viewer.clientWidth / 2, viewer.clientHeight / 2))
    applyTransform()
    setScalePct()
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const r = viewer.getBoundingClientRect()
    Object.assign(view, zoomAt(view, Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top))
    applyTransform()
    setScalePct()
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    pan = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty }
    viewer.setPointerCapture(e.pointerId)
    panning = true
  }

  function onPointerMove(e: PointerEvent) {
    if (!pan) return
    view.tx = pan.tx + (e.clientX - pan.x)
    view.ty = pan.ty + (e.clientY - pan.y)
    applyTransform()
  }

  function onPointerUp(e: PointerEvent) {
    pan = null
    panning = false
    if (viewer.hasPointerCapture(e.pointerId)) viewer.releasePointerCapture(e.pointerId)
  }

  function normalizeSvg() {
    const svg = stage.querySelector('svg')
    if (!svg) return
    svg.style.maxWidth = 'none'
    svg.style.display = 'block'
    const vb = svg.viewBox.baseVal
    if (vb.width) {
      svg.style.width = `${vb.width}px`
      svg.style.height = `${vb.height}px`
    }
  }

  async function doRender(code: string, theme: Theme) {
    const seq = ++renderSeq
    const result = await renderDiagram(code, theme)
    if (seq !== renderSeq) return
    if ('error' in result) {
      app.error = result.error
      return
    }
    app.error = null
    stage.innerHTML = result.svg
    normalizeSvg()
    fit()
  }

  $effect(() => {
    const chart = activeChart()
    const id = chart.id
    const code = chart.code
    const theme = app.theme

    const immediate = id !== prevId || theme !== prevTheme
    prevId = id
    prevTheme = theme

    if (immediate) {
      void doRender(code, theme)
      return
    }

    const timer = setTimeout(() => void doRender(code, theme), 320)
    return () => clearTimeout(timer)
  })

  $effect(() => {
    const onResize = () => fit()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  })

  $effect(() => {
    app.editorOpen
    app.sidebarOpen
    const timer = setTimeout(fit, 320)
    return () => clearTimeout(timer)
  })
</script>

<div
  class="viewer"
  class:panning
  role="application"
  aria-label="Diagram canvas"
  bind:this={viewer}
  onwheel={onWheel}
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointerleave={onPointerUp}
>
  <div class="stage" bind:this={stage}></div>
</div>

<div class="error-wrap">
  <div class="error-card" hidden={!app.error}>
    <span class="error-dot"></span>
    <div class="error-body">
      <div class="error-title">Syntax error</div>
      <div class="error-msg">{app.error}</div>
    </div>
  </div>
</div>

<div class="zoombar">
  <button class="icon-btn" onclick={() => zoomButton(1 / 1.2)} title="Zoom out">−</button>
  <button class="icon-btn zoom-pct" onclick={reset} title="Reset to 100%">{scalePct}%</button>
  <button class="icon-btn" onclick={() => zoomButton(1.2)} title="Zoom in">+</button>
  <div class="zoombar-sep"></div>
  <button class="icon-btn zoom-fit" onclick={fit} title="Fit to screen">Fit</button>
</div>

<style>
  .viewer {
    position: absolute;
    inset: 0;
    overflow: hidden;
    cursor: grab;
    touch-action: none;
    background-color: var(--bg);
    background-image: radial-gradient(var(--grid-dot) 1.1px, transparent 1.1px);
    background-size: 22px 22px;

    &.panning {
      cursor: grabbing;
    }
  }

  .stage {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    transform-origin: 0 0;
    will-change: transform;

    & :global(svg) {
      display: block;
    }
  }

  .error-wrap {
    position: absolute;
    inset-inline-start: 16px;
    inset-block-end: 16px;
    z-index: 20;
    max-inline-size: min(560px, 60%);
    pointer-events: none;
  }

  .error-card {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    background: var(--panel);
    border: 1px solid var(--border-strong);
    border-inline-start: 3px solid var(--danger);
    border-radius: 10px;
    padding: 10px 13px;
    box-shadow: var(--shadow);
    pointer-events: auto;

    &[hidden] {
      display: none;
    }
  }

  .error-dot {
    inline-size: 8px;
    block-size: 8px;
    border-radius: 50%;
    background: var(--danger);
    flex: none;
    margin-block-start: 5px;
  }

  .error-body {
    min-inline-size: 0;
  }

  .error-title {
    font-size: var(--fs-caption);
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--danger);
    margin-block-end: 2px;
  }

  .error-msg {
    font-family: var(--font-mono);
    font-size: var(--fs-small);
    color: var(--text-2);
    line-height: 1.45;
    word-break: break-word;
  }

  .zoombar {
    position: absolute;
    inset-inline-end: 16px;
    inset-block-end: 16px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--panel);
    border: 1px solid var(--border-strong);
    border-radius: 11px;
    padding: 5px;
    box-shadow: var(--shadow);
  }

  .icon-btn {
    border: none;
    background: transparent;
    color: var(--text-2);
    cursor: pointer;
    inline-size: 30px;
    block-size: 30px;
    border-radius: var(--radius-sm);
    font-size: 19px;
    line-height: 1;
    padding: 0;
    flex: none;

    &:hover {
      background: var(--hover);
    }
  }

  .zoom-pct {
    inline-size: auto;
    min-inline-size: 52px;
    padding-inline: 6px;
    font-family: var(--font-mono);
    font-size: var(--fs-control);
    font-weight: 500;
    color: var(--text);
  }

  .zoom-fit {
    inline-size: auto;
    padding-inline: 11px;
    font-size: var(--fs-control);
    font-weight: 500;
  }

  .zoombar-sep {
    inline-size: 1px;
    block-size: 20px;
    background: var(--border);
    margin-inline: 2px;
  }
</style>
