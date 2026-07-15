# Svelte Rewrite of Mermaid Playground

## Overview

Rewrite the Mermaid Playground design preview (vanilla HTML/CSS/JS, kept in `design-preview/`) as a client-side SPA: Svelte 5 (runes) + Vite 8 + TypeScript, packaged with pnpm, deployed to Cloudflare Workers static assets with GitHub autodeploy (CF Workers Builds).

The app: a Mermaid diagram editor with live preview - sidebar with a saved-chart list, code editor panel with syntax highlighting and line numbers, pan/zoom canvas, syntax-error toast, light/dark theme, localStorage persistence. New capability on top of the preview: sharing a chart via a self-contained URL fragment (compressed code in the link, no backend).

`design-preview/` is the visual and behavioral reference and ships in this repo. This plan additionally writes all parity-critical semantics inline (Technical Details) so tasks do not depend on reading the preview code.

Feature list (each maps to a proof in Task 13):

1. Saved-chart sidebar (add / select / rename / delete)
2. Code editor with syntax highlighting, line-number gutter, status bar
3. Pan/zoom canvas with zoombar (in/out/percent-reset/fit)
4. Syntax-error toast; last good diagram stays on canvas
5. Light/dark theme, persisted
6. localStorage persistence under key `mpl-1a`, format-compatible with the preview
7. Share via `#code:` URL fragment (encode on Share click, import on load)

### Non-goals (v1)

- No backend, no KV short links, no OG previews - link sharing is URL-fragment only (KV shortener is a possible later step, architecture must not block it)
- No SvelteKit, no routing, no SSR
- The original design explored two navigation layouts: (a) sidebar with chart list plus a slim topbar - this is what `design-preview/` implements and what this plan builds (`Topbar.svelte` is part of variant (a)); (b) a topbar-only navigation without a sidebar, where charts are switched via a dropdown in the header. Only (a) is in scope; do not build (b)
- No editor features beyond the preview: no Tab indentation, no autocomplete, no minimap
- No live URL<->editor sync: the link is transport, localStorage is the source of truth
- No prefers-color-scheme detection: first-run theme is `light`
- No i18n, no mobile-specific layout work beyond what the CSS already gives

### Rejected alternatives

- SvelteKit + adapter-cloudflare: rejected - no routing/SSR/API in scope; plain Vite SPA is smaller and simpler
- pako dependency for compression: rejected - native `CompressionStream('deflate-raw')` covers it with zero deps (target browsers: latest Chrome, Safari 26+)
- CF Pages: rejected in favor of Workers static assets - CF's current recommendation for new projects; future KV endpoint lands in the same Worker without migration
- mermaid `securityLevel: 'loose'` (the in-repo `design-preview/app.js` uses it): rejected - diagrams arrive via share links from strangers; use `'strict'`
- Keeping mermaid on CDN: rejected - npm dep with dynamic import gives a versioned, self-contained build
- agent-browser-driven e2e: rejected - it is a machine-local tool unavailable to cold execution sessions; the committed Playwright suite is the source of truth for e2e

## Skills to invoke

This plan is self-contained: every rule needed to execute it is written inline. If the skills below are available in the session, they may be loaded for background; when they are absent or conflict with this plan, the plan wins.

- `css-baseline` - optional background reading; its enforceable rules are fully materialized in Code-Quality Rules below, which is the authoritative CSS ruleset for this plan
- `agent-browser` - optional, for ad-hoc in-session visual checks only; all acceptance-relevant e2e lives in the committed Playwright suite (`pnpm e2e`)

## Context (from discovery)

- Repo root: `design-preview/index.html`, `design-preview/styles.css`, `design-preview/app.js` (after Task 1 moves them) - working vanilla implementation, verified in browser (rendering, CRUD, themes, persistence, error states)
- State before Task 1 (superseded once Task 1 is marked done): not a git repo, no package.json, directory otherwise empty
- Version policy: install whatever the package registry resolves during scaffolding; it must fall inside these ranges (verified stable 2026-07-14): `svelte >=5.56 <6`, `vite >=8.1 <9`, `mermaid >=11.16 <12`, `pnpm 11.x`, `@playwright/test 1.x`. Verify by reading package.json/pnpm-lock.yaml after install. No web research step is required or expected during implementation or review
- localStorage key `mpl-1a` already holds user data written by the preview; the new app must read it unchanged

## Development Approach

- **Testing approach: Regular** (code first, then tests in the same task)
- Complete each task fully before moving to the next
- Every task ends with the Validation Commands green
- Update this plan file when scope changes during implementation
- Commits: local commits per task are fine; repo creation and pushing are user-driven post-completion steps - never run `gh repo create` or `git push` as part of this plan

## Validation Commands

Run after each task; all must be green before marking the task complete:

- `pnpm test` - unit tests (Vitest)
- `pnpm check` - svelte-check
- `pnpm build` - production build
- `pnpm e2e` - Playwright suite (exists from Task 11 onward; requires one-time `pnpm exec playwright install chromium` - add `--with-deps` in containerized environments)

## Code-Quality Rules (verify before marking each task complete)

Visual/behavioral parity with `design-preview/` is judged SOLELY by `tokens.test.ts`, `parity.spec.ts`, and the behaviors enumerated in Technical Details. Reviewers must not raise parity findings by comparing code or rendered output against `design-preview/` beyond those checks.

### CSS (authoritative ruleset; applies to `src/app.css` and every `<style>` block)

- `@layer reset, base, components` in `src/app.css`; no `!important` anywhere
- Native nesting; flat selectors inside Svelte scoped styles (Svelte scoping replaces BEM/@scope)
- Logical properties only: `inline-size`, `block-size`, `padding-inline`, `margin-block`, `border-inline-start`, `inset-inline-end` (no `width`/`height`/`margin-left`/...)
- Colors in `oklch()`; theming via `color-scheme` + `light-dark()` on tokens; derived states via `color-mix()`; no hex/rgb in component rules
- Design-token discipline, checked mechanically: (1) every COLOR token listed in Technical Details / Design tokens exists in `src/app.css` and matches the preview (guarded by `tokens.test.ts`); non-color tokens are covered by the px -> rem table and parity.spec.ts, not otherwise reviewed; (2) the CSS gate is the committed `scripts/css-gate.sh` (created in Task 2): it extracts CSS scope ONLY (`src/**/*.css` in full, plus `<style>`...`</style>` block contents of `src/**/*.svelte` via awk) and greps that extraction for `#[0-9a-fA-F]{3,8}`, `rgb(`, `rgba(`, `hsl(`, `!important`, `100vh`, and the anchored physical-property regex `(^|[{;[:space:]])(width|height|margin-(left|right|top|bottom)|padding-(left|right|top|bottom)|left|right|top|bottom)[[:space:]]*:` - by construction `line-height:`, `scrollbar-width:`, and `border-*-width:` do NOT match and are allowed. Script exits 0 (no matches) = rule passes; matches outside `<style>` blocks (JS/TS string literals for imperative `element.style` writes) are out of scope and must not be flagged; other repeated literals are NOT violations
- `100dvh` not `100vh`; standard `scrollbar-width`/`scrollbar-color` (no `::-webkit-scrollbar`); `prefers-reduced-motion` block present, placed OUTSIDE any `@layer` (unlayered declarations beat all layers) and without `!important` - acceptance is block-present-unlayered plus the `!important` grep staying empty, runtime effectiveness is not separately reviewed; `translate` property (not `transform`) for the editor-panel slide
- No vendor prefixes, no `@supports` fallbacks
- Grid/Flexbox for layout; `position: absolute` only for true overlays (editor panel, zoombar, error toast)
- Font sizes in rem; line-height unitless
- Declared exceptions (do not "fix"): no `field-sizing` on the editor textarea (fixed-box overlay editor); px sizes for design-spec structural elements (sidebar 248px, topbar 53px, control heights); the canvas `.stage` uses `transform` (not `translate`) because pan/zoom writes a combined translate+scale matrix imperatively

### TypeScript / Svelte

- `pnpm check` (svelte-check) clean; no `any`, no `@ts-ignore`
- No comments/docstrings in code - clear names instead (user convention)
- Early-return style; imports at top of file
- Rune discipline: `$derived` for computed values, `$effect` only for real side effects (DOM writes, timers, storage); cleanup functions for timers/listeners

## Testing Strategy

- **Unit (Vitest)**: pure modules - `share.ts`, `highlight.ts`, `viewport.ts`, `state.svelte.ts` actions, `mermaid.ts` error cleaner, token parity check
- **E2E (Playwright, committed in `e2e/`)**: `pnpm e2e` runs chromium against the built app via Playwright's webServer (`vite preview`); covers smoke scenarios, the share acceptance scenario, and the finite visual-parity checklist. The suite is the only acceptance-relevant e2e mechanism
- Playwright specifics: single project (chromium), `use: { baseURL }` from webServer, storage isolated per test via fresh browser contexts

## Progress Tracking

- Mark completed items with `[x]` immediately when done
- Add newly discovered tasks with ➕ prefix
- Document issues/blockers with ⚠️ prefix

## Solution Overview

Pure client-side SPA. One reactive singleton (`$state`) holds charts/activeId/theme/UI flags; components import it directly (no prop drilling - single-screen app). Declarative rendering for lists, highlight, labels, and chrome; deliberately imperative islands behind `bind:this` + `$effect` for mermaid SVG injection, pan/zoom transforms, and editor scroll-sync. Sharing is a pure encode/decode module over the native CompressionStream API. Deploy artifact is `dist/` served by a config-only Cloudflare Worker.

## Technical Details

### Data model and persistence

- `Chart = { id: string, name: string, code: string, updated: number }` - id is 8-char base36 random, `updated` is epoch ms
- Persisted JSON under localStorage key `mpl-1a` (unchanged from preview): `{ charts: Chart[], activeId: string, theme: 'light' | 'dark' }`
- UI flags (`editorOpen`, `sidebarOpen`, `error`) are session state, not persisted
- Load failure or empty storage -> seed with one chart named `App login flow` containing SAMPLE (below), `theme: 'light'` (matching the preview; no prefers-color-scheme detection); corrupted JSON must not crash
- Delete last chart -> reseed; delete active chart -> select first remaining
- New chart: name `Untitled N` (N = count+1), code NEW_SAMPLE, inserted at list head, becomes active

SAMPLE (seed chart, exact content):

```
flowchart TD
    A([User opens app]) --> B{Signed in?}
    B -->|Yes| C[Load dashboard]
    B -->|No| D[Show login]
    D --> E[Enter credentials]
    E --> F{Valid?}
    F -->|Yes| C
    F -->|No| D
    C --> G([Ready])
```

NEW_SAMPLE: `flowchart LR` / `A[Start] --> B[Step]` / `B --> C([Done])` (three lines, 4-space indent on lines 2-3).

### Design tokens

- `design-preview/styles.css` already expresses color tokens as `light-dark(<light>, <dark>)` pairs at `:root`; its `:root[data-theme="dark"]` block overrides ONLY `color-scheme` and `--shadow`. The new `src/app.css` keeps the same `light-dark()` shape with values converted to oklch
- Color tokens under test (exhaustive list): `--bg`, `--panel`, `--panel-2`, `--text`, `--text-2`, `--muted`, `--border`, `--border-strong`, `--hover`, `--accent`, `--accent-ink`, `--accent-soft`, `--danger`, `--grid-dot`, `--tok-key`, `--tok-arrow`, `--tok-str`, `--tok-comment`, plus `--ok` (single value, no light-dark pair - compared as the same value for both themes)
- Excluded from color comparison: `--selection` (ported verbatim as `color-mix(in oklch, var(--accent) 22%, transparent)`), `--shadow` (ported from the preview `:root` value and the dark-block override with its color stops converted to oklch-with-alpha, so the CSS gate stays rgb-free; presence-only assertion)
- `tokens.test.ts` contract: ONE parser for both files - light = first `light-dark()` argument, dark = second (`--ok`: the single declared value counts for both themes). Color difference is culori `differenceCiede2000()` (0-100 Lab scale; do NOT use the euclidean OKLab/OKLCH variants - their ~0-1 scale makes the gate vacuous). For every listed token the test FAILS if it is missing from `src/app.css` or if deltaE2000 >= 2 for either theme; for tokens whose preview value carries alpha (`--grid-dot`), additionally assert the culori-parsed `.alpha` values are exactly equal for both themes (difference functions ignore alpha). Fidelity is defined solely by this test - a passing test means the conversion is correct, no manual recomputation
- Font scale, px -> rem mapping (root font untouched at browser default): 11px -> 0.6875rem, 11.5px -> 0.71875rem, 12px -> 0.75rem, 12.5px -> 0.78125rem, 13px -> 0.8125rem, 13.5px -> 0.84375rem, 14px -> 0.875rem, 15px -> 0.9375rem; code line-height unitless `calc(20 / 13)`
- Non-color tokens (radii, durations, easing, structural px sizes) carry over numerically unchanged; they are covered by the px -> rem table and parity.spec.ts structural measurements, and are not otherwise reviewed

### Date labels

`dateLabel(ts)`: delta < 45s -> `Edited just now`; < 1h -> `Edited Nm ago`; < 24h -> `Edited Nh ago`; else `Edited <Mon> <D>` (en-US, e.g. `Edited Jul 15`). N = `Math.round` of elapsed minutes/hours (59.8 min -> `Edited 60m ago`), matching the preview.

### Share format

- Fragment: `#code:` + base64url(deflate-raw(UTF-8 JSON `{"n": name, "c": code}`)), base64url without padding
- `encodeShare(chart) -> Promise<string>` (fragment only), `decodeShare(hash) -> Promise<{name, code} | null>`; any decode failure (bad prefix, bad base64, inflate error, bad JSON) returns null - never throws
- Startup with a `#code:` hash: decode; if a chart with identical `code` exists -> select it; else prepend new chart with the shared name, select, persist; then `history.replaceState` to clean the hash. Decode failure -> error toast `Broken share link`, app continues normally
- Expected scale (non-binding estimate): a ~4KB diagram source compresses to roughly 2K chars; the enforced bound is < 2500 chars, tested in share.test.ts against a synthetic ~4KB in-test input (Task 4) and in share.spec.ts against `e2e/fixtures/large-er.mmd` (Task 11)

### Viewport math (lib/viewport.ts, pure)

- View = `{ scale, tx, ty }`; scale clamped to [0.1, 4] everywhere
- `fit`: scale = min(cw/w, ch/h) * 0.88 clamped; tx/ty center the content
- `zoomAt(view, factor, cx, cy)`: new scale clamped, then tx = cx - (cx - tx) * k where k = newScale/oldScale (same for ty) - zoom toward the pointer
- Wheel factor: `exp(-deltaY * 0.0015)`; zoom buttons: factor 1.2 and 1/1.2 at viewport center; reset: scale 1 centered
- Pan: pointer-capture drag updating tx/ty; `cursor: grab`/`grabbing`
- The view object is intentionally NON-reactive (plain object, direct `style.transform` writes); only the percent label is `$state`
- Refit triggers: after mermaid render, on window resize, and exactly 320ms after an editor or sidebar toggle (transition duration 300ms + 20ms margin)

### Mermaid integration (lib/mermaid.ts)

- `import('mermaid')` dynamic, memoized -> separate chunk; UI must not wait for it
- initialize per render: `startOnLoad: false`, `securityLevel: 'strict'`, `theme: 'default' | 'dark'` from app theme, `htmlLabels: false`, `flowchart: { curve: 'basis', htmlLabels: false }`, fontFamily IBM Plex Sans stack
- Flow: `parse(code)` first - on failure return cleaned error and keep the previous SVG on stage; else `render('m' + randomId, code)`, caller injects `svg` string into stage, normalizes (`max-width: none`, explicit px width/height from viewBox), then fits
- Error cleaning: strip leading `error:`, collapse to first 3 non-empty lines joined by space, cap at 260 chars
- Render debounce on code input: 320ms; immediate render on chart switch and theme toggle

### Syntax highlighting (lib/highlight.ts)

- `highlight(code) -> string` (HTML). Processing order per line, and it matters:
  1. If the line starts with optional spaces + `%%` -> the whole escaped line becomes one `tk-comment` span; no other passes run
  2. Escape `& < >` first
  3. Keyword pass wraps matches in `tk-key` spans
  4. Arrow pass wraps matches in `tk-arrow` spans
  5. Bracket pass wraps matches in `tk-str` spans
- Each pass is ONE combined alternation regex applied in a single `String.replace` call; never loop per keyword/arrow - the emitted span markup contains the word `class`, which is itself in the keyword list, and a rescan would corrupt it. Keep the keyword alternation in the listed order (`stateDiagram-v2` before `stateDiagram`). A single replace never rescans its own replacement text; cross-pass safety holds because arrow and bracket patterns do not occur in the span markup
- Later passes run over text that already contains span tags from earlier passes; a bracket span may therefore wrap an earlier keyword/arrow span (e.g. `[Load dashboard]` where a keyword sits inside). This nesting is intended: the innermost span's class wins visually
- Keywords (`tk-key`), word-bounded: flowchart, graph, sequenceDiagram, classDiagram, stateDiagram-v2, stateDiagram, erDiagram, gantt, pie, journey, gitGraph, mindmap, timeline, quadrantChart, requirementDiagram, subgraph, end, participant, actor, loop, alt, else, opt, par, and, rect, note, activate, deactivate, class, state, direction, title, section, TD, TB, LR, RL, BT
- Arrows (`tk-arrow`), matched against ESCAPED text: `--&gt;&gt;`, `-&gt;&gt;`, `--&gt;`, `---`, `-.-&gt;`, `-.-`, `==&gt;`, `===`, `--x`, `--o`, `..&gt;`, `::`, `--`
- Bracketed spans (`tk-str`): `[...]`, `{...}`, `(...)`, `|...|`
- Empty line -> single space (preserves line height under the transparent textarea)

### Editor mechanics

Transparent-text textarea (visible caret) stacked over a `<pre>` rendering `{@html highlight(code)}`, plus a line-number gutter; identical font/line-height/padding metrics across all three; `onscroll` syncs pre and gutter to the textarea.

Data flow is one-way through the store: the textarea uses `value={activeChart().code}` plus `oninput` calling the `updateActiveCode(value)` action (NOT `bind:value` - mutation goes through the action so `updated` bumps and persistence triggers uniformly). The topbar name input uses the same pattern with `renameActive(value)`.

Status bar: green dot + `Rendered · live preview`, or danger dot + `Invalid syntax` with the error toast visible bottom-left.

### Share button UX

`Share` button in topbar-right, using the same CSS class as the theme toggle (zero Share-specific style rules; only the label swaps): builds the link for the active chart, `navigator.clipboard.writeText`, button label swaps to `Copied` and reverts after 2000ms.

### Theme

`data-theme` attribute on `<html>` set by `$effect`; CSS does the rest via `color-scheme` + `light-dark()`. Theme toggle re-renders mermaid with the matching mermaid theme.

### Sidebar collapse (observable contract)

End-state assertions (the transition itself is not asserted): collapsed -> sidebar `inline-size` computes to 0, content clipped (inner wrapper stays 248px), border-color computes to transparent, show-sidebar button visible at the left edge of the topbar; expanded -> `inline-size` 248px, border-color equals the border token, show-sidebar button absent. The collapse/expand transition uses the duration/easing tokens. These end-state facts are the entire acceptance bar for the sidebar.

## What Goes Where

- **Implementation Steps**: everything below - code, tests, configs, docs
- **Post-Completion**: repo creation/push and CF dashboard connection (user-driven), first production deploy verification

## Implementation Steps

### Task 1: Repo restructure and Vite+Svelte scaffold

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `tsconfig.json`, `svelte.config.js`, `index.html`, `src/main.ts`, `src/App.svelte`, `src/app.css` (stub), `src/vite-env.d.ts`, `.gitignore`
- Move: `index.html`, `styles.css`, `app.js` -> `design-preview/` (the three reference each other relatively; moved together the preview stays openable standalone)

- [x] `git init`; move the three vanilla files into `design-preview/`; commit as baseline
- [x] scaffold Vite + Svelte + TS via `pnpm create vite` (svelte-ts template); versions must land in the ranges pinned in Context (verify in package.json/pnpm-lock.yaml; no web research); set `packageManager` field (pnpm 11)
- [x] add Vitest; wire `test`, `check`, `dev`, `build`, `preview` scripts; configure vitest to compile `.svelte.ts` rune modules via the svelte vite plugin
- [x] `index.html`: title `Mermaid Playground`, Google Fonts preconnect + IBM Plex Sans (400/500/600/700) and IBM Plex Mono (400/500/600)
- [x] add a trivial placeholder test; `pnpm test`, `pnpm check`, `pnpm build` all green

### Task 2: Design tokens in app.css (oklch, light-dark)

**Files:**
- Modify: `src/app.css`
- Create: `src/lib/tokens.test.ts`, `scripts/css-gate.sh`

- [ ] port all `:root` tokens from `design-preview/styles.css` into `src/app.css` under `@layer base` per the Design tokens spec in Technical Details (light-dark() color pairs, px -> rem font scale, radii/durations unchanged, selection via `color-mix()`)
- [ ] convert every color to oklch (culori as devDependency); fidelity is defined solely by `tokens.test.ts` - a passing test means the conversion is correct, no manual recomputation
- [ ] add `@layer reset` (box-sizing, margins, `button/input/textarea` font inherit) and base body rules, scrollbar properties, `prefers-reduced-motion` block (unlayered, no `!important` - per Code-Quality Rules)
- [ ] create `scripts/css-gate.sh` implementing the CSS gate exactly as defined in Code-Quality Rules (style-scope extraction + pattern greps, exit 0 = clean); run it - must exit 0
- [ ] write `tokens.test.ts` implementing exactly the contract in Technical Details / Design tokens (one light-dark() parser for both files, exhaustive token list, differenceCiede2000 < 2 both themes, alpha equality for --grid-dot, FAIL on missing token)
- [ ] Validation Commands green before next task

### Task 3: highlight.ts

**Files:**
- Create: `src/lib/highlight.ts`, `src/lib/highlight.test.ts`

- [ ] implement `highlight(code: string): string` per Technical Details, preserving the specified pass order (comment short-circuit; escape; keywords; arrows; brackets; nesting allowed)
- [ ] tests: HTML escaping of `& < >` and `<script>` payloads (XSS guard); each token class produced; arrows matched in escaped form; keyword inside brackets yields nested spans (bracket span containing a tk-key span); `%%` comment line short-circuits; empty line -> space; multi-line join
- [ ] Validation Commands green before next task

### Task 4: share.ts

**Files:**
- Create: `src/lib/share.ts`, `src/lib/share.test.ts`

- [ ] implement `encodeShare` / `decodeShare` per Technical Details (CompressionStream/DecompressionStream `deflate-raw`, base64url without padding, `#code:` prefix, null-not-throw decode)
- [ ] tests: roundtrip ASCII + Cyrillic + emoji code and names; wrong prefix -> null; corrupt base64 -> null; truncated payload -> null; empty string -> null; a ~4KB input built from repeated realistic mermaid-like lines with varied identifiers (NOT random bytes - the bound assumes diagram-source redundancy) encodes to a fragment under 2500 chars; if this assertion fails, fix the input, never weaken the threshold
- [ ] Validation Commands green before next task

### Task 5: state.svelte.ts (store + actions)

**Files:**
- Create: `src/lib/state.svelte.ts`, `src/lib/state.svelte.test.ts`
- Modify: `vite.config.ts` (vitest environment for localStorage if needed)

- [ ] define `Chart`, the `app` `$state` singleton (charts, activeId, theme, editorOpen, sidebarOpen, error), `activeChart()` lookup
- [ ] implement `loadState()` (localStorage `mpl-1a`, corrupt/empty -> seed with `theme: 'light'`) and `persistState()` (charts/activeId/theme only); SAMPLE/NEW_SAMPLE constants; `dateLabel(ts)`
- [ ] implement actions: `selectChart`, `addChart`, `deleteChart` (last -> reseed, active -> first), `renameActive(name)`, `updateActiveCode(code)` (both set the field AND bump `updated = Date.now()`), `applyShared({name, code})` with exact-code dedupe -> select existing
- [ ] tests: seed on empty and on corrupt JSON (theme 'light'); add/select behavior; renameActive and updateActiveCode set field + bump `updated`; delete-active and delete-last semantics; applyShared dedupe and prepend; dateLabel all four branches; persist writes expected schema
- [ ] Validation Commands green before next task

### Task 6: mermaid.ts

**Files:**
- Create: `src/lib/mermaid.ts`, `src/lib/mermaid.test.ts`

- [ ] implement memoized dynamic import, per-render `initialize` with the exact options from Technical Details, `parse`-then-`render` flow returning `{ svg } | { error }`, exported `cleanErr`
- [ ] no chunk assertion in this task: `src/lib/mermaid.ts` is not imported by anything until Task 7, so no mermaid chunk exists yet; the chunk gate runs in Task 10 and Task 13 once the import is wired
- [ ] tests: `cleanErr` (strips `error:` prefix, 3-line collapse, 260-char cap); options object matches spec (snapshot of the init config)
- [ ] Validation Commands green before next task

### Task 7: viewport.ts + Canvas.svelte

**Files:**
- Create: `src/lib/viewport.ts`, `src/lib/viewport.test.ts`, `src/components/Canvas.svelte`

- [ ] implement pure `viewport.ts`: `fitView`, `zoomAt`, `resetView`, clamp - exact formulas from Technical Details
- [ ] implement `Canvas.svelte`: dot-grid viewer, stage (`bind:this`), non-reactive view object with direct transform writes, wheel/pointer handlers (pointer capture, grabbing cursor), zoombar (minus / percent-reset / plus / divider / Fit), error toast bottom-left, reactive `scalePct` label
- [ ] render `$effect`: watches active chart id+code+theme, 320ms debounce on code changes only, cleanup clears timer; error path keeps previous SVG and sets `app.error`; success injects SVG, normalizes size from viewBox, fits
- [ ] window resize -> refit listener with `$effect` cleanup
- [ ] tests: viewport.ts full coverage (fit centering + 0.88 factor + clamping at both ends, zoomAt invariant "point under cursor stays", reset centering); interactive canvas behavior is asserted by `e2e/smoke.spec.ts` (Task 11)
- [ ] Validation Commands green before next task

### Task 8: EditorPanel.svelte

**Files:**
- Create: `src/components/EditorPanel.svelte`

- [ ] layout consists of: header (EDITOR label + close button), gutter + highlight `<pre>{@html}` + transparent textarea (spellcheck/autocap off, wrap off), status bar (dot + text)
- [ ] textarea wiring per Technical Details / Editor mechanics: `value={activeChart().code}` + `oninput` -> `updateActiveCode` (no bind:value)
- [ ] gutter line numbers as `$derived` from code; `onscroll` sync textarea -> pre + gutter; identical font metrics via shared tokens
- [ ] slide animation: `translate` + opacity via `data-open`, duration/easing tokens, `pointer-events: none` when closed
- [ ] tests: unit coverage for this task's logic already lives in `highlight.test.ts` and `state.svelte.test.ts` (updateActiveCode); interactive behavior (typing -> highlight/gutter/render, scroll sync, panel slide) is asserted by `e2e/smoke.spec.ts` scenarios "editor typing" and "editor toggle" (Task 11)
- [ ] Validation Commands green before next task

### Task 9: Sidebar.svelte + Topbar.svelte

**Files:**
- Create: `src/components/Sidebar.svelte`, `src/components/Topbar.svelte`

- [ ] Sidebar: brand row (accent diamond logo, Mermaid / Playground, hide button), CHARTS header + add button, `{#each}` chart rows (active dot/weight/bg, date label, hover-revealed delete with stopPropagation)
- [ ] sidebar collapse implements the observable contract in Technical Details / Sidebar collapse
- [ ] Topbar: show-sidebar button (only when collapsed), name input (`value={activeChart().name}` + `oninput` -> `renameActive`; transparent border, hover -> border token, focus-visible -> border-strong token with outline none - styling detail, not an acceptance criterion), Editor toggle (pressed = accent), date label, theme toggle, Share button
- [ ] Share flow: click -> `encodeShare(active)` -> clipboard -> label `Copied`, reverting after 2000ms (state-driven, timer cleaned up)
- [ ] tests: action-level coverage lives in `state.svelte.test.ts`; interactive behavior (add/select/rename/delete, collapse, share copy) is asserted by `e2e/smoke.spec.ts` and `e2e/share.spec.ts` (Task 11)
- [ ] Validation Commands green before next task

### Task 10: App.svelte wiring + startup

**Files:**
- Modify: `src/App.svelte`, `src/main.ts`, `src/app.css`

- [ ] compose layout: sidebar + main column (topbar + workspace with Canvas overlay children EditorPanel), app-shell grid/flex with a 248px sidebar column and 53px topbar row (asserted by parity.spec.ts), `100dvh`
- [ ] startup sequence in `main.ts`/App init: `loadState()`; if `location.hash` starts with `#code:` -> `decodeShare` -> `applyShared` or `Broken share link` error toast -> `history.replaceState` clean hash
- [ ] persist `$effect` with the reads INSIDE the effect body: `const json = JSON.stringify({ charts: app.charts, activeId: app.activeId, theme: app.theme })` then `localStorage.setItem` - the deep read during stringify registers every nested dependency, so in-place code/name mutations retrigger it (an effect that only touches the references does not); `$effect`: `data-theme` on `<html>`; editor/sidebar toggles trigger delayed refit (Canvas listens via shared state)
- [ ] remove scaffold leftovers (demo counter, svg assets)
- [ ] bundle check with explicit pass condition: `pnpm build` output shows a separate mermaid async chunk AND the entry JS chunk is < 100 KB gzip as printed by vite build; both conditions met = pass
- [ ] tests: startup import logic is unit-covered via `applyShared`/`decodeShare` tests (Tasks 4-5); full startup flow is asserted by `e2e/share.spec.ts` (Task 11)
- [ ] Validation Commands green before next task

### Task 11: Playwright e2e suite (smoke, share, parity)

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`, `e2e/share.spec.ts`, `e2e/parity.spec.ts`, `e2e/fixtures/large-er.mmd`
- Modify: `package.json` (`e2e` script, `@playwright/test` devDependency)

- [ ] add `@playwright/test`; `playwright.config.ts` with chromium project and `webServer` running `pnpm preview` (build served on a fixed port); `pnpm e2e` script = `playwright test`; document the one-time `pnpm exec playwright install chromium` in README later (Task 12)
- [ ] create `e2e/fixtures/large-er.mmd`: a fully synthetic erDiagram fixture, file size 3800-4400 bytes (authoritative bound, check with `wc -c`); ~110 lines / ~13 entities with attribute comments is non-binding guidance; invent all entity and attribute names (generic e-commerce or CRM domain)
- [ ] `smoke.spec.ts`: seed chart renders an SVG on load; typing invalid code shows error toast + `Invalid syntax` status while the last SVG stays on stage; fixing the code recovers; add/rename/delete chart flows (delete-last reseeds); theme toggle sets `data-theme="dark"` and re-renders; reload preserves charts and theme (localStorage); zoom assertions: from 100% one '+' click -> label `120%`, one '-' -> `100%`, clicking the percent label resets to `100%`, Fit puts the SVG bounding box fully inside the viewer; editor toggle slides the panel (panel gets `data-open="false"`, canvas refits); sidebar collapse end-state assertions per Technical Details / Sidebar collapse
- [ ] `share.spec.ts` (acceptance scenario): create the context with `permissions: ['clipboard-read', 'clipboard-write']` (chromium API) and read the copied URL via `page.evaluate(() => navigator.clipboard.readText())`; paste the fixture into the editor -> click Share -> parse the copied URL with `new URL(...)`: same origin, hash starts with `#code:`, total length < 2500 chars (URL shape is `${origin}/#code:<payload>`) -> open that URL in a FRESH browser context (empty localStorage) -> the diagram renders and the chart name matches; opening the same URL again in that context does NOT create a duplicate chart; a mangled `#code:` URL shows `Broken share link` and the app still seeds normally
- [ ] `parity.spec.ts` (finite checklist, pass = all assertions green): sidebar width 248px and topbar height 53px via getBoundingClientRect; the enumerated regions exist in both themes (sidebar brand row, CHARTS list, name input, Editor toggle, theme toggle, Share button, zoombar, status bar); body background and text colors in both themes equal the token values from `src/app.css` (computed-style comparison). Explicitly NOT criteria: anti-aliasing, font hinting, mermaid SVG internals, screenshot pixel diffs. Token color fidelity is already guarded by `tokens.test.ts` and is not re-judged here
- [ ] run `pnpm e2e`; fix regressions found
- [ ] Validation Commands green (now including `pnpm e2e`) before next task

### Task 12: Cloudflare deploy config

**Files:**
- Create: `wrangler.jsonc`, `README.md`
- Modify: `package.json`, `.gitignore`

- [ ] `wrangler.jsonc`: name `mermaid-playground`, `compatibility_date: "2026-07-15"`, `assets.directory: ./dist` (config-only Worker, no script); reviewers must not flag the date's recency - config acceptance is the dry-run check below
- [ ] add wrangler as devDependency + `deploy:cf` script (`pnpm build` then `wrangler deploy`); the name avoids pnpm's built-in `deploy` command which shadows package scripts; pass condition: package.json has a script literally named `deploy:cf` and NO script named `deploy`; never invoke `deploy:cf` during implementation or review (it needs CF credentials) - deploy correctness is covered by the dry-run check below; use `deploy:cf` consistently everywhere including README
- [ ] config acceptance (in-repo, no external docs): `wrangler dev` serves the built app locally (index.html returns 200 and the app title renders) AND `wrangler deploy --dry-run` exits 0; both green = config verified
- [ ] README.md: what it is; dev/test/build/e2e commands matching package.json scripts verbatim (including `pnpm exec playwright install chromium` one-time step); share-format note (`#code:` prefix, deflate-raw + base64url); deploy section: `pnpm deploy:cf` local deploy, plus the autodeploy steps copied exactly from Post-Completion in this plan (CF dashboard OAuth connect, build command `pnpm build`, deploy command `npx wrangler deploy`) - do not research CF docs
- [ ] Validation Commands green before next task

### Task 13: Verify acceptance criteria

- [ ] feature checklist, each proven by the named test: (1) sidebar CRUD -> `smoke.spec.ts` add/rename/delete; (2) editor highlight/gutter/status -> `highlight.test.ts` + smoke typing scenario; (3) pan/zoom + zoombar -> `viewport.test.ts` + smoke zoom assertions; (4) error toast + last-good-SVG -> smoke invalid-code scenario; (5) theme -> smoke theme scenario; (6) `mpl-1a` persistence -> `state.svelte.test.ts` + smoke reload scenario; (7) share -> `share.test.ts` + `share.spec.ts`
- [ ] non-goal greps, all must be empty: `grep -ri sveltekit package.json src`, `grep -rn "keydown" src/components/EditorPanel.svelte` (no Tab handler), `grep -rn "router\|route(" src` (no routing), `grep -rn "i18n" package.json src`
- [ ] full suite green: `pnpm test`, `pnpm check`, `pnpm build`, `pnpm e2e`
- [ ] bundle condition from Task 10 re-verified on the final build (separate mermaid chunk, entry < 100 KB gzip)
- [ ] CSS gate: run `scripts/css-gate.sh`; exits 0
- [ ] localStorage compatibility: seed `mpl-1a` with a value in the preview's format (charts + activeId + theme), load the app, charts appear unchanged (covered as a `share.spec.ts`/smoke setup step with a pre-seeded context)

### Task 14: Finalize docs

- [ ] README consistency check, all three must hold: commands match package.json scripts verbatim; share-format note states `#code:` + deflate-raw + base64url exactly as `share.ts` implements; deploy section names `deploy:cf`. All three match = done
- [ ] move this plan to `docs/plans/completed/`
- [ ] do NOT run `gh repo create` and do NOT push - repo creation and pushing are user-driven; record readiness in the progress log and leave the handoff to Post-Completion

## Post-Completion

**Manual steps (user):**
- Create the GitHub repo (name/visibility of the user's choosing) and push
- Connect the repo to Cloudflare Workers Builds in the CF dashboard (OAuth): build command `pnpm build`, deploy command `npx wrangler deploy`; verify push-to-main deploys and branch preview deploys
- Open the production URL, run the share acceptance scenario once end-to-end from a phone or second machine

**Deferred (explicitly out of v1):**
- KV short-link endpoint in the same Worker (`POST /api/charts` + `GET /api/charts/:id`) if/when long links become annoying
- OG preview cards (requires the KV path - fragment links cannot carry server-rendered previews)
