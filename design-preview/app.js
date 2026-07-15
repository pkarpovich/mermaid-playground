const STORE_KEY = 'mpl-1a';

const SAMPLE = `flowchart TD
    A([User opens app]) --> B{Signed in?}
    B -->|Yes| C[Load dashboard]
    B -->|No| D[Show login]
    D --> E[Enter credentials]
    E --> F{Valid?}
    F -->|Yes| C
    F -->|No| D
    C --> G([Ready])`;

const NEW_SAMPLE = `flowchart LR
    A[Start] --> B[Step]
    B --> C([Done])`;

const KEYWORDS = /\b(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|subgraph|end|participant|actor|loop|alt|else|opt|par|and|rect|note|activate|deactivate|class|state|direction|title|section|TD|TB|LR|RL|BT)\b/g;
const ARROWS = /(--&gt;&gt;|-&gt;&gt;|--&gt;|---|-\.-&gt;|-\.-|==&gt;|===|--x|--o|\.\.&gt;|::|--)/g;
const BRACKETS = /(\[[^\]]*\]|\{[^}]*\}|\([^)]*\)|\|[^|]*\|)/g;

const $ = (id) => document.getElementById(id);
const el = {
  sidebar: $('sidebar'),
  sidebarHide: $('sidebar-hide'),
  sidebarShow: $('sidebar-show'),
  addChart: $('add-chart'),
  chartList: $('chart-list'),
  name: $('chart-name'),
  date: $('active-date'),
  themeToggle: $('theme-toggle'),
  editorToggle: $('editor-toggle'),
  editorHide: $('editor-hide'),
  editorPanel: $('editor-panel'),
  gutter: $('gutter'),
  highlight: $('highlight'),
  code: $('code'),
  statusDot: $('status-dot'),
  statusText: $('status-text'),
  viewer: $('viewer'),
  stage: $('stage'),
  errorCard: $('error-card'),
  errorMsg: $('error-msg'),
  zoomIn: $('zoom-in'),
  zoomOut: $('zoom-out'),
  zoomReset: $('zoom-reset'),
  zoomFit: $('zoom-fit'),
};

function uid() { return Math.random().toString(36).slice(2, 10); }
function makeSeed() { return { id: uid(), name: 'App login flow', code: SAMPLE, updated: Date.now() }; }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

function load() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(STORE_KEY)); } catch {}
  if (!data || !data.charts || !data.charts.length) {
    const seed = makeSeed();
    data = { charts: [seed], activeId: seed.id, theme: 'light' };
  }
  return data;
}

const state = load();
state.theme = state.theme || 'light';
let error = null;
let editorOpen = true;
let sidebarOpen = true;
const view = { scale: 1, tx: 0, ty: 0 };
let pan = null;
let renderTimer = null;

function active() {
  return state.charts.find((c) => c.id === state.activeId) || state.charts[0];
}

function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      charts: state.charts,
      activeId: state.activeId,
      theme: state.theme,
    }));
  } catch {}
}

function dateLabel(ts) {
  const d = Date.now() - ts;
  if (d < 45000) return 'Edited just now';
  if (d < 3600000) return 'Edited ' + Math.round(d / 60000) + 'm ago';
  if (d < 86400000) return 'Edited ' + Math.round(d / 3600000) + 'h ago';
  return 'Edited ' + new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function highlightCode(code) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return code.split('\n').map((line) => {
    if (/^\s*%%/.test(line)) return '<span class="tk-comment">' + esc(line) + '</span>';
    let h = esc(line);
    h = h.replace(KEYWORDS, '<span class="tk-key">$1</span>');
    h = h.replace(ARROWS, '<span class="tk-arrow">$1</span>');
    h = h.replace(BRACKETS, '<span class="tk-str">$1</span>');
    return h.length ? h : ' ';
  }).join('\n');
}

function updateHighlight() { el.highlight.innerHTML = highlightCode(el.code.value); }

function updateGutter() {
  const n = el.code.value.split('\n').length;
  let s = '';
  for (let i = 1; i <= n; i++) s += i + '\n';
  el.gutter.textContent = s;
}

function syncScroll() {
  el.highlight.scrollTop = el.code.scrollTop;
  el.highlight.scrollLeft = el.code.scrollLeft;
  el.gutter.scrollTop = el.code.scrollTop;
}

function syncEditor() {
  const c = active();
  el.code.value = c ? c.code : '';
  updateHighlight();
  updateGutter();
}

function chartRow(c) {
  const row = document.createElement('div');
  row.className = 'chart-row' + (c.id === state.activeId ? ' active' : '');
  row.addEventListener('click', () => selectChart(c.id));

  const top = document.createElement('div');
  top.className = 'chart-row-top';
  const dot = document.createElement('span');
  dot.className = 'chart-dot';
  const name = document.createElement('span');
  name.className = 'chart-name';
  name.textContent = c.name || 'Untitled';
  top.append(dot, name);

  const date = document.createElement('span');
  date.className = 'chart-date';
  date.textContent = dateLabel(c.updated);

  const del = document.createElement('button');
  del.className = 'del';
  del.title = 'Delete';
  del.textContent = '×';
  del.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteChart(c.id);
  });

  row.append(top, date, del);
  return row;
}

function renderChartList() {
  el.chartList.replaceChildren(...state.charts.map(chartRow));
}

function updateStatus() {
  const bad = !!error;
  el.statusDot.classList.toggle('error', bad);
  el.statusText.textContent = bad ? 'Invalid syntax' : 'Rendered · live preview';
  el.errorCard.hidden = !bad;
  el.errorMsg.textContent = error || '';
}

function updateChrome() {
  const c = active();
  if (document.activeElement !== el.name) el.name.value = c ? c.name : '';
  el.date.textContent = c ? dateLabel(c.updated) : '';
  el.themeToggle.textContent = state.theme === 'dark' ? 'Dark' : 'Light';
  document.documentElement.dataset.theme = state.theme;
  el.editorToggle.setAttribute('aria-pressed', String(editorOpen));
  el.editorPanel.dataset.open = String(editorOpen);
  el.sidebar.dataset.open = String(sidebarOpen);
  el.sidebarShow.hidden = sidebarOpen;
  updateStatus();
}

function ensureMermaid(cb) {
  if (window.mermaid) { cb(); return; }
  setTimeout(() => ensureMermaid(cb), 60);
}

function initMermaid() {
  window.mermaid.initialize({
    startOnLoad: false,
    theme: state.theme === 'dark' ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    htmlLabels: false,
    flowchart: { curve: 'basis', htmlLabels: false },
  });
}

function cleanErr(e) {
  let m = e && e.message ? e.message : String(e);
  m = m.replace(/^error:/i, '').trim();
  return m.split('\n').filter((l) => l.trim()).slice(0, 3).join(' ').slice(0, 260);
}

function normalizeSvg() {
  const svg = el.stage.querySelector('svg');
  if (!svg) return;
  svg.style.maxWidth = 'none';
  svg.style.display = 'block';
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if (vb && vb.width) {
    svg.style.width = vb.width + 'px';
    svg.style.height = vb.height + 'px';
  }
}

function renderChart() {
  ensureMermaid(async () => {
    const c = active();
    if (!c) return;
    initMermaid();
    try {
      await window.mermaid.parse(c.code);
    } catch (err) {
      error = cleanErr(err);
      updateStatus();
      return;
    }
    try {
      const { svg } = await window.mermaid.render('m' + uid(), c.code);
      el.stage.innerHTML = svg;
      normalizeSvg();
      error = null;
      updateStatus();
      fit();
    } catch (err) {
      error = cleanErr(err);
      updateStatus();
    }
  });
}

function applyTransform() {
  el.stage.style.transform = `translate(${view.tx}px,${view.ty}px) scale(${view.scale})`;
}

function setScalePct() {
  el.zoomReset.textContent = Math.round(view.scale * 100) + '%';
}

function svgSize() {
  const svg = el.stage.querySelector('svg');
  if (!svg) return null;
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if (vb && vb.width) return { w: vb.width, h: vb.height };
  const r = svg.getBoundingClientRect();
  return { w: r.width, h: r.height };
}

function fit() {
  const sz = svgSize();
  if (!sz) return;
  const cw = el.viewer.clientWidth;
  const ch = el.viewer.clientHeight;
  view.scale = clamp(Math.min(cw / sz.w, ch / sz.h) * 0.88, 0.1, 4);
  view.tx = (cw - sz.w * view.scale) / 2;
  view.ty = (ch - sz.h * view.scale) / 2;
  applyTransform();
  setScalePct();
}

function resetView() {
  const sz = svgSize();
  view.scale = 1;
  if (sz) {
    view.tx = (el.viewer.clientWidth - sz.w) / 2;
    view.ty = (el.viewer.clientHeight - sz.h) / 2;
  } else {
    view.tx = 0;
    view.ty = 0;
  }
  applyTransform();
  setScalePct();
}

function zoomBy(f) {
  const cx = el.viewer.clientWidth / 2;
  const cy = el.viewer.clientHeight / 2;
  const ns = clamp(view.scale * f, 0.1, 4);
  const k = ns / view.scale;
  view.tx = cx - (cx - view.tx) * k;
  view.ty = cy - (cy - view.ty) * k;
  view.scale = ns;
  applyTransform();
  setScalePct();
}

function onWheel(e) {
  e.preventDefault();
  const r = el.viewer.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;
  const factor = Math.exp(-e.deltaY * 0.0015);
  const ns = clamp(view.scale * factor, 0.1, 4);
  const k = ns / view.scale;
  view.tx = mx - (mx - view.tx) * k;
  view.ty = my - (my - view.ty) * k;
  view.scale = ns;
  applyTransform();
  setScalePct();
}

function onPointerDown(e) {
  if (e.button !== 0) return;
  pan = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
  try { el.viewer.setPointerCapture(e.pointerId); } catch {}
  el.viewer.classList.add('panning');
}

function onPointerMove(e) {
  if (!pan) return;
  view.tx = pan.tx + (e.clientX - pan.x);
  view.ty = pan.ty + (e.clientY - pan.y);
  applyTransform();
}

function onPointerUp(e) {
  pan = null;
  el.viewer.classList.remove('panning');
  try { el.viewer.releasePointerCapture(e.pointerId); } catch {}
}

function selectChart(id) {
  if (id === state.activeId) return;
  state.activeId = id;
  error = null;
  syncEditor();
  persist();
  renderChartList();
  updateChrome();
  renderChart();
}

function addChart() {
  const ch = { id: uid(), name: 'Untitled ' + (state.charts.length + 1), code: NEW_SAMPLE, updated: Date.now() };
  state.charts.unshift(ch);
  state.activeId = ch.id;
  error = null;
  syncEditor();
  persist();
  renderChartList();
  updateChrome();
  renderChart();
}

function deleteChart(id) {
  state.charts = state.charts.filter((c) => c.id !== id);
  if (!state.charts.length) {
    const seed = makeSeed();
    state.charts = [seed];
    state.activeId = seed.id;
  } else if (id === state.activeId) {
    state.activeId = state.charts[0].id;
  }
  error = null;
  syncEditor();
  persist();
  renderChartList();
  updateChrome();
  renderChart();
}

function onNameInput() {
  const c = active();
  if (!c) return;
  c.name = el.name.value;
  c.updated = Date.now();
  persist();
  renderChartList();
  el.date.textContent = dateLabel(c.updated);
}

function onCodeInput() {
  const c = active();
  if (!c) return;
  c.code = el.code.value;
  c.updated = Date.now();
  updateHighlight();
  updateGutter();
  persist();
  renderChartList();
  el.date.textContent = dateLabel(c.updated);
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderChart, 320);
}

function toggleEditor() {
  editorOpen = !editorOpen;
  updateChrome();
  setTimeout(fit, 310);
}

function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  updateChrome();
  setTimeout(fit, 320);
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  persist();
  updateChrome();
  renderChart();
}

el.sidebarHide.addEventListener('click', toggleSidebar);
el.sidebarShow.addEventListener('click', toggleSidebar);
el.addChart.addEventListener('click', addChart);
el.name.addEventListener('input', onNameInput);
el.editorToggle.addEventListener('click', toggleEditor);
el.editorHide.addEventListener('click', toggleEditor);
el.themeToggle.addEventListener('click', toggleTheme);
el.code.addEventListener('input', onCodeInput);
el.code.addEventListener('scroll', syncScroll);
el.viewer.addEventListener('wheel', onWheel, { passive: false });
el.viewer.addEventListener('pointerdown', onPointerDown);
el.viewer.addEventListener('pointermove', onPointerMove);
el.viewer.addEventListener('pointerup', onPointerUp);
el.viewer.addEventListener('pointerleave', onPointerUp);
el.zoomIn.addEventListener('click', () => zoomBy(1.2));
el.zoomOut.addEventListener('click', () => zoomBy(1 / 1.2));
el.zoomReset.addEventListener('click', resetView);
el.zoomFit.addEventListener('click', fit);
window.addEventListener('resize', fit);

syncEditor();
renderChartList();
updateChrome();
setScalePct();
renderChart();
