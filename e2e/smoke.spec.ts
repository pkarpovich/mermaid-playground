import { expect, test } from '@playwright/test'

const INVALID_CODE = 'this is definitely not a valid mermaid diagram {{{'
const VALID_CODE = 'flowchart LR\n    A[One] --> B[Two]\n    B --> C([Done])'

const PREVIEW_STATE = {
  charts: [
    { id: 'aaaa1111', name: 'Preview chart one', code: 'flowchart TD\n    A[One] --> B[Two]', updated: 1700000000000 },
    { id: 'bbbb2222', name: 'Preview chart two', code: 'flowchart LR\n    X[Start] --> Y([End])', updated: 1700000001000 },
  ],
  activeId: 'bbbb2222',
  theme: 'dark',
}

async function waitForDiagram(page: import('@playwright/test').Page) {
  await expect(page.locator('.stage svg')).toBeVisible()
}

test('seed chart renders an SVG on load', async ({ page }) => {
  await page.goto('/')
  await waitForDiagram(page)
  await expect(page.locator('.chart-row')).toHaveCount(1)
  await expect(page.locator('.name-input')).toHaveValue('App login flow')
})

test('invalid code shows error toast and keeps last good SVG, then recovers', async ({ page }) => {
  await page.goto('/')
  await waitForDiagram(page)

  await page.locator('textarea.code').fill(INVALID_CODE)

  await expect(page.locator('.error-card')).toBeVisible()
  await expect(page.locator('.status-text')).toHaveText('Invalid syntax')
  await expect(page.locator('.stage svg')).toBeVisible()

  await page.locator('textarea.code').fill(VALID_CODE)

  await expect(page.locator('.error-card')).toBeHidden()
  await expect(page.locator('.status-text')).toHaveText('Rendered · live preview')
  await expect(page.locator('.stage svg')).toBeVisible()
})

test('add, rename, and delete chart flows including delete-last reseed', async ({ page }) => {
  await page.goto('/')
  await waitForDiagram(page)

  await page.getByTitle('New chart').click()
  await expect(page.locator('.chart-row')).toHaveCount(2)
  await expect(page.locator('.chart-row').first()).toHaveClass(/active/)
  await expect(page.locator('.name-input')).toHaveValue('Untitled 2')

  await page.locator('.name-input').fill('Renamed chart')
  await expect(page.locator('.chart-row.active .chart-name')).toHaveText('Renamed chart')

  const firstRow = page.locator('.chart-row').first()
  await firstRow.hover()
  await firstRow.getByTitle('Delete').click()
  await expect(page.locator('.chart-row')).toHaveCount(1)

  const lastRow = page.locator('.chart-row').first()
  await lastRow.hover()
  await lastRow.getByTitle('Delete').click()
  await expect(page.locator('.chart-row')).toHaveCount(1)
  await expect(page.locator('.name-input')).toHaveValue('App login flow')
})

test('theme toggle sets data-theme and reload preserves charts and theme', async ({ page }) => {
  await page.goto('/')
  await waitForDiagram(page)

  await page.getByTitle('New chart').click()
  await page.locator('.name-input').fill('Persisted chart')
  await expect(page.locator('.chart-row')).toHaveCount(2)

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByTitle('Toggle theme').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await waitForDiagram(page)

  await page.reload()
  await waitForDiagram(page)
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('.chart-row')).toHaveCount(2)
  await expect(page.locator('.name-input')).toHaveValue('Persisted chart')
})

test('pre-seeded mpl-1a in the preview format loads unchanged', async ({ page }) => {
  await page.addInitScript((seed) => {
    localStorage.setItem('mpl-1a', seed)
  }, JSON.stringify(PREVIEW_STATE))

  await page.goto('/')
  await waitForDiagram(page)

  await expect(page.locator('.chart-row')).toHaveCount(2)
  await expect(page.locator('.chart-name')).toHaveText(['Preview chart one', 'Preview chart two'])
  await expect(page.locator('.name-input')).toHaveValue('Preview chart two')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('zoombar in, out, reset, and fit behave as specified', async ({ page }) => {
  await page.goto('/')
  await waitForDiagram(page)

  const pct = page.getByTitle('Reset to 100%')

  await pct.click()
  await expect(pct).toHaveText('100%')

  await page.getByTitle('Zoom in').click()
  await expect(pct).toHaveText('120%')

  await page.getByTitle('Zoom out').click()
  await expect(pct).toHaveText('100%')

  await page.getByTitle('Zoom in').click()
  await expect(pct).toHaveText('120%')
  await pct.click()
  await expect(pct).toHaveText('100%')

  await page.getByTitle('Fit to screen').click()

  const viewerBox = await page.locator('.viewer').boundingBox()
  const svgBox = await page.locator('.stage svg').boundingBox()
  expect(viewerBox).not.toBeNull()
  expect(svgBox).not.toBeNull()
  if (!viewerBox || !svgBox) return
  const tolerance = 1
  expect(svgBox.x).toBeGreaterThanOrEqual(viewerBox.x - tolerance)
  expect(svgBox.y).toBeGreaterThanOrEqual(viewerBox.y - tolerance)
  expect(svgBox.x + svgBox.width).toBeLessThanOrEqual(viewerBox.x + viewerBox.width + tolerance)
  expect(svgBox.y + svgBox.height).toBeLessThanOrEqual(viewerBox.y + viewerBox.height + tolerance)
})

test('editor toggle slides the panel closed', async ({ page }) => {
  await page.goto('/')
  await waitForDiagram(page)

  const panel = page.locator('.editor-panel')
  await expect(panel).toHaveAttribute('data-open', 'true')

  await page.getByTitle('Toggle editor').click()
  await expect(panel).toHaveAttribute('data-open', 'false')

  await page.getByTitle('Toggle editor').click()
  await expect(panel).toHaveAttribute('data-open', 'true')
})

test('editor fullscreen toggle expands the panel to the full workspace width', async ({ page }) => {
  await page.goto('/')
  await waitForDiagram(page)

  const panel = page.locator('.editor-panel')
  const initialWidth = (await panel.boundingBox())?.width ?? 0
  expect(initialWidth).toBeLessThan(500)

  await page.getByTitle('Expand editor').click()
  const workspaceWidth = await page
    .locator('.workspace')
    .evaluate((el) => el.getBoundingClientRect().width)
  await expect
    .poll(async () => (await panel.boundingBox())?.width ?? 0)
    .toBeGreaterThan(workspaceWidth - 2)

  await page.getByTitle('Exit full screen').click()
  await expect
    .poll(async () => (await panel.boundingBox())?.width ?? 0)
    .toBeLessThan(500)
})

test('editor and sidebar visibility survive a reload', async ({ page }) => {
  await page.goto('/')
  await waitForDiagram(page)

  await page.getByTitle('Toggle editor').click()
  await expect(page.locator('.editor-panel')).toHaveAttribute('data-open', 'false')
  await page.getByTitle('Hide sidebar').click()
  await expect(page.getByTitle('Show sidebar')).toBeVisible()

  await page.reload()
  await waitForDiagram(page)
  await expect(page.locator('.editor-panel')).toHaveAttribute('data-open', 'false')
  await expect(page.getByTitle('Show sidebar')).toBeVisible()
})

test('sidebar collapse end-state contract', async ({ page }) => {
  await page.goto('/')
  await waitForDiagram(page)

  const sidebar = page.locator('.sidebar')
  const inner = page.locator('.sidebar-inner')

  await expect(sidebar).toHaveCSS('width', '248px')
  await expect(page.getByTitle('Show sidebar')).toHaveCount(0)
  const expandedBorder = await sidebar.evaluate(
    (el) => getComputedStyle(el).borderInlineEndColor,
  )
  expect(expandedBorder).not.toBe('rgba(0, 0, 0, 0)')

  await page.getByTitle('Hide sidebar').click()

  await expect
    .poll(async () => (await sidebar.boundingBox())?.width ?? Infinity)
    .toBeLessThan(2)
  await expect(inner).toHaveCSS('width', '248px')
  await expect(sidebar).toHaveCSS('border-inline-end-color', 'rgba(0, 0, 0, 0)')
  await expect(page.getByTitle('Show sidebar')).toBeVisible()

  await page.getByTitle('Show sidebar').click()
  await expect(sidebar).toHaveCSS('width', '248px')
  await expect(page.getByTitle('Show sidebar')).toHaveCount(0)
})
