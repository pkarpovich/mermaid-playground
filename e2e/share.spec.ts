import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const fixture = readFileSync(new URL('./fixtures/large-er.mmd', import.meta.url), 'utf8')
const SHARED_NAME = 'Shared ER Diagram'

async function waitForDiagram(page: Page) {
  await expect(page.locator('.stage svg')).toBeVisible()
}

test('share round-trips through a copied URL without duplicating on re-open', async ({
  page,
  context,
  browser,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  await page.goto('/')
  await waitForDiagram(page)

  await page.locator('.name-input').fill(SHARED_NAME)
  await page.locator('textarea.code').fill(fixture)
  await waitForDiagram(page)

  const shareBtn = page.getByTitle('Share chart')
  await shareBtn.click()
  await expect(shareBtn).toHaveText('Copied')

  const copied = await page.evaluate(() => navigator.clipboard.readText())

  const origin = new URL(page.url()).origin
  const parsed = new URL(copied)
  expect(parsed.origin).toBe(origin)
  expect(parsed.hash.startsWith('#code:')).toBe(true)
  expect(copied.length).toBeLessThan(2500)

  const fresh = await browser.newContext()
  const p2 = await fresh.newPage()

  await p2.goto(copied)
  await waitForDiagram(p2)
  await expect(p2.locator('.name-input')).toHaveValue(SHARED_NAME)
  await expect(p2.locator('.chart-row')).toHaveCount(2)

  await p2.goto(copied)
  await waitForDiagram(p2)
  await expect(p2.locator('.name-input')).toHaveValue(SHARED_NAME)
  await expect(p2.locator('.chart-row')).toHaveCount(2)

  await fresh.close()
})

test('a mangled share URL shows Broken share link and still seeds normally', async ({
  browser,
  baseURL,
}) => {
  const fresh = await browser.newContext()
  const p = await fresh.newPage()

  await p.goto(`${baseURL}/#code:@@@not-valid-base64@@@`)

  await expect(p.locator('.error-card')).toBeVisible()
  await expect(p.locator('.error-msg')).toHaveText('Broken share link')
  await waitForDiagram(p)
  await expect(p.locator('.chart-row')).toHaveCount(1)
  await expect(p.locator('.name-input')).toHaveValue('App login flow')

  await fresh.close()
})
