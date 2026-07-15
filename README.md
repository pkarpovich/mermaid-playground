# Mermaid Playground

A client-side Mermaid diagram editor with live preview. Svelte 5 (runes) + Vite + TypeScript, no backend.

- Saved-chart sidebar (add / select / rename / delete)
- Code editor with syntax highlighting, line-number gutter, status bar
- Pan/zoom canvas with a zoombar (in / out / percent-reset / fit)
- Syntax-error toast; the last good diagram stays on the canvas
- Light/dark theme, persisted
- localStorage persistence under key `mpl-1a`
- Share a chart via a self-contained URL fragment (no backend)

## Commands

```
pnpm dev      # start the dev server
pnpm test     # unit tests (Vitest)
pnpm check    # svelte-check
pnpm build    # production build to dist/
pnpm preview  # serve the production build locally
pnpm e2e      # Playwright end-to-end suite
```

The e2e suite needs a one-time browser install:

```
pnpm exec playwright install chromium
```

## Share format

Clicking Share copies a link whose fragment carries the whole chart, so no server is involved:

`#code:` + base64url(deflate-raw(UTF-8 JSON `{"n": name, "c": code}`)) without padding.

Opening such a link imports the chart on load and then cleans the hash. A broken fragment shows a `Broken share link` toast and the app continues normally.

## Deploy

Deployed to Cloudflare Workers static assets. A local deploy from your machine:

```
pnpm deploy:cf   # pnpm build && wrangler deploy
```

### Autodeploy (Cloudflare Workers Builds)

Connect the repo to Cloudflare Workers Builds in the Cloudflare dashboard (OAuth):

- Build command: `pnpm build`
- Deploy command: `npx wrangler deploy`

Push-to-main triggers a production deploy; other branches get preview deploys.
