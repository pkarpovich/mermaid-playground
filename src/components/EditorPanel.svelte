<script lang="ts">
  import { activeChart, app, updateActiveCode } from '../lib/state.svelte'
  import { highlight } from '../lib/highlight'

  let gutter: HTMLDivElement
  let pre: HTMLPreElement
  let textarea: HTMLTextAreaElement

  const code = $derived(activeChart().code)
  const lineNumbers = $derived(
    Array.from({ length: code.split('\n').length }, (_, i) => i + 1).join('\n'),
  )

  function onInput(e: Event) {
    updateActiveCode((e.currentTarget as HTMLTextAreaElement).value)
  }

  function onScroll() {
    pre.scrollTop = textarea.scrollTop
    pre.scrollLeft = textarea.scrollLeft
    gutter.scrollTop = textarea.scrollTop
  }

  function close() {
    app.editorOpen = false
  }
</script>

<div class="editor-panel" data-open={app.editorOpen ? 'true' : 'false'}>
  <div class="editor-head">
    <span class="editor-label">Editor</span>
    <button class="icon-btn" onclick={close} title="Hide editor">×</button>
  </div>
  <div class="editor-body">
    <div class="gutter" bind:this={gutter}>{lineNumbers}</div>
    <div class="code-wrap">
      <pre
        class="hl"
        aria-hidden="true"
        bind:this={pre}
      >{@html highlight(code)}</pre>
      <textarea
        class="code"
        spellcheck="false"
        autocapitalize="off"
        wrap="off"
        aria-label="Mermaid source"
        value={code}
        oninput={onInput}
        onscroll={onScroll}
        bind:this={textarea}
      ></textarea>
    </div>
  </div>
  <div class="editor-status">
    <span class="status-dot" class:error={app.error !== null}></span>
    <span class="status-text">{app.error ? 'Invalid syntax' : 'Rendered · live preview'}</span>
  </div>
</div>

<style>
  .editor-panel {
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    inline-size: min(420px, 52%);
    z-index: 25;
    display: flex;
    flex-direction: column;
    background: var(--panel);
    box-shadow: var(--shadow);
    transition:
      translate var(--dur-panel) var(--ease-panel),
      opacity var(--dur-panel) ease;

    &[data-open='false'] {
      opacity: 0;
      pointer-events: none;
      translate: -103% 0;
    }
  }

  .editor-head {
    block-size: 42px;
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-inline: 16px 10px;
    border-block-end: 1px solid var(--border);
  }

  .editor-label {
    font-size: var(--fs-caption);
    font-weight: 600;
    letter-spacing: 0.08em;
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
  }

  .editor-body {
    flex: 1;
    min-block-size: 0;
    display: flex;
  }

  .gutter {
    flex: none;
    inline-size: 46px;
    overflow: hidden;
    padding-block: 14px;
    padding-inline: 0 8px;
    text-align: end;
    font-family: var(--font-mono);
    font-size: var(--fs-code);
    line-height: var(--code-leading);
    color: var(--muted);
    background: var(--panel-2);
    border-inline-end: 1px solid var(--border);
    white-space: pre;
    user-select: none;
  }

  .code-wrap {
    position: relative;
    flex: 1;
    min-inline-size: 0;
  }

  .hl,
  .code {
    position: absolute;
    inset: 0;
    margin: 0;
    padding: 14px 16px;
    overflow: auto;
    white-space: pre;
    font-family: var(--font-mono);
    font-size: var(--fs-code);
    line-height: var(--code-leading);
    tab-size: 2;
  }

  .hl {
    color: var(--text);
    pointer-events: none;

    & :global(.tk-key) {
      color: var(--tok-key);
      font-weight: 600;
    }

    & :global(.tk-arrow) {
      color: var(--tok-arrow);
      font-weight: 600;
    }

    & :global(.tk-str) {
      color: var(--tok-str);
    }

    & :global(.tk-comment) {
      color: var(--tok-comment);
      font-style: italic;
    }
  }

  .code {
    border: none;
    resize: none;
    background: transparent;
    color: transparent;
    caret-color: var(--accent);

    &:focus {
      outline: none;
    }

    &::selection {
      background: var(--selection);
    }
  }

  .editor-status {
    flex: none;
    block-size: 34px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding-inline: 16px;
    border-block-start: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: var(--fs-status);
  }

  .status-dot {
    inline-size: 7px;
    block-size: 7px;
    border-radius: 50%;
    background: var(--ok);
    flex: none;

    &.error {
      background: var(--danger);
    }
  }

  .status-text {
    color: var(--text-2);
  }
</style>
