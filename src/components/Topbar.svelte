<script lang="ts">
  import { app, activeChart, dateLabel, renameActive } from '../lib/state.svelte'
  import { encodeShare } from '../lib/share'

  let copied = $state(false)
  let copyTimer: ReturnType<typeof setTimeout> | null = null

  const chart = $derived(activeChart())

  function showSidebar() {
    app.sidebarOpen = true
  }

  function onName(e: Event) {
    renameActive((e.currentTarget as HTMLInputElement).value)
  }

  function toggleEditor() {
    app.editorOpen = !app.editorOpen
  }

  function toggleTheme() {
    app.theme = app.theme === 'dark' ? 'light' : 'dark'
  }

  async function share() {
    const fragment = await encodeShare({ name: chart.name, code: chart.code })
    try {
      await navigator.clipboard.writeText(`${location.origin}/${fragment}`)
    } catch {
      return
    }
    copied = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      copied = false
      copyTimer = null
    }, 2000)
  }

  $effect(() => {
    return () => {
      if (copyTimer) clearTimeout(copyTimer)
    }
  })
</script>

<header class="topbar">
  <div class="topbar-left">
    {#if !app.sidebarOpen}
      <button class="btn square" onclick={showSidebar} title="Show sidebar">»</button>
    {/if}
    <input
      class="name-input"
      spellcheck="false"
      aria-label="Chart name"
      value={chart.name}
      oninput={onName}
    />
    <button
      class="btn editor-toggle"
      onclick={toggleEditor}
      title="Toggle editor"
      aria-pressed={app.editorOpen ? 'true' : 'false'}
    >
      <span class="editor-glyph"></span>
      Editor
    </button>
  </div>
  <div class="topbar-right">
    <span class="date-label">{dateLabel(chart.updated)}</span>
    <button class="btn" onclick={toggleTheme} title="Toggle theme">
      {app.theme === 'dark' ? 'Dark' : 'Light'}
    </button>
    <button class="btn" onclick={share} title="Share chart">
      {copied ? 'Copied' : 'Share'}
    </button>
  </div>
</header>

<style>
  .topbar {
    block-size: 53px;
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-inline: 18px 14px;
    border-block-end: 1px solid var(--border);
    background: var(--panel);
    position: relative;
    z-index: 30;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-inline-size: 0;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: none;
  }

  .btn {
    display: flex;
    align-items: center;
    gap: 7px;
    border: 1px solid var(--border-strong);
    background: var(--panel);
    color: var(--text-2);
    cursor: pointer;
    block-size: 32px;
    padding-inline: 12px;
    border-radius: var(--radius-lg);
    font-size: var(--fs-code);
    font-weight: 500;
    flex: none;

    &:hover {
      background: var(--hover);
    }

    &.square {
      inline-size: 32px;
      padding: 0;
      justify-content: center;
      font-size: var(--fs-heading);
      line-height: 1;
    }
  }

  .name-input {
    border: 1px solid transparent;
    background: transparent;
    color: var(--text);
    font-size: var(--fs-heading);
    font-weight: 600;
    letter-spacing: -0.01em;
    padding: 6px 9px;
    border-radius: var(--radius-md);
    inline-size: min(300px, 36vw);
    min-inline-size: 0;

    &:hover {
      border-color: var(--border);
    }

    &:focus-visible {
      outline: none;
      border-color: var(--border-strong);
    }
  }

  .editor-toggle {
    font-weight: 600;
    padding-inline: 14px;

    &[aria-pressed='true'] {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--accent-ink);
    }
  }

  .editor-glyph {
    inline-size: 12px;
    block-size: 12px;
    border: 1.6px solid currentColor;
    border-inline-start-width: 5px;
    border-radius: 3px;
  }

  .date-label {
    font-size: var(--fs-small);
    color: var(--muted);
    white-space: nowrap;
    margin-inline-end: 2px;
  }
</style>
