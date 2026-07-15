<script lang="ts">
  import { app, dateLabel, selectChart, addChart, deleteChart } from '../lib/state.svelte'

  function hide() {
    app.sidebarOpen = false
  }

  const select = (id: string) => () => selectChart(id)

  const rowKey = (id: string) => (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    selectChart(id)
  }

  const remove = (id: string) => (e: MouseEvent) => {
    e.stopPropagation()
    deleteChart(id)
  }
</script>

<aside class="sidebar" data-open={app.sidebarOpen ? 'true' : 'false'}>
  <div class="sidebar-inner">
    <div class="brand">
      <span class="logo"></span>
      <span class="brand-name">Mermaid</span>
      <span class="brand-sub">Playground</span>
      <button class="icon-btn" onclick={hide} title="Hide sidebar">«</button>
    </div>
    <div class="charts-head">
      <span class="charts-label">Charts</span>
      <button class="icon-btn add" onclick={addChart} title="New chart">+</button>
    </div>
    <div class="chart-list">
      {#each app.charts as chart (chart.id)}
        <div
          class="chart-row"
          class:active={chart.id === app.activeId}
          role="button"
          tabindex="0"
          onclick={select(chart.id)}
          onkeydown={rowKey(chart.id)}
        >
          <div class="chart-row-top">
            <span class="chart-dot"></span>
            <span class="chart-name">{chart.name || 'Untitled'}</span>
          </div>
          <span class="chart-date">{dateLabel(chart.updated)}</span>
          <button class="del" onclick={remove(chart.id)} title="Delete">×</button>
        </div>
      {/each}
    </div>
  </div>
</aside>

<style>
  .sidebar {
    flex: none;
    inline-size: var(--sidebar-w);
    overflow: hidden;
    background: var(--panel-2);
    border-inline-end: 1px solid var(--border);
    transition:
      inline-size var(--dur-panel) var(--ease-panel),
      border-color var(--dur-panel);

    &[data-open='false'] {
      inline-size: 0;
      border-inline-end-color: transparent;
    }
  }

  .sidebar-inner {
    inline-size: var(--sidebar-w);
    block-size: 100%;
    display: flex;
    flex-direction: column;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 16px 10px 14px 18px;
  }

  .logo {
    inline-size: 16px;
    block-size: 16px;
    background: var(--accent);
    border-radius: 4px;
    rotate: 45deg;
    flex: none;
  }

  .brand-name {
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .brand-sub {
    color: var(--muted);
    flex: 1;
    white-space: nowrap;
  }

  .charts-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px 6px 18px;
  }

  .charts-label {
    font-size: var(--fs-caption);
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .icon-btn {
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    inline-size: 28px;
    block-size: 28px;
    border-radius: var(--radius-sm);
    font-size: var(--fs-heading);
    line-height: 1;
    padding: 0;
    flex: none;

    &:hover {
      background: var(--hover);
    }

    &.add {
      inline-size: 26px;
      block-size: 26px;
      color: var(--text-2);
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .chart-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 10px 12px;
  }

  .chart-row {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 9px 11px;
    margin-block-end: 3px;
    border-radius: var(--radius-lg);
    cursor: pointer;

    &:hover {
      background: var(--hover);
    }

    &:hover .del {
      opacity: 1;
    }

    &.active {
      background: var(--accent-soft);
    }

    &.active .chart-dot {
      background: var(--accent);
    }

    &.active .chart-name {
      font-weight: 600;
      color: var(--text);
    }
  }

  .chart-row-top {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .chart-dot {
    inline-size: 5px;
    block-size: 5px;
    border-radius: 50%;
    background: var(--border-strong);
    flex: none;
  }

  .chart-name {
    color: var(--text-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: var(--fs-list);
  }

  .chart-date {
    font-size: var(--fs-caption);
    color: var(--muted);
    padding-inline-start: 12px;
  }

  .del {
    position: absolute;
    inset-inline-end: 7px;
    inset-block-start: 8px;
    opacity: 0;
    transition: opacity 0.12s;
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    inline-size: 22px;
    block-size: 22px;
    border-radius: var(--radius-xs);
    font-size: var(--fs-heading);
    line-height: 1;
    padding: 0;
  }
</style>
