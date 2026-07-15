import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function assertRegions(page: Page) {
  await expect(page.locator('.brand')).toBeVisible()
  await expect(page.locator('.charts-label')).toHaveText('Charts')
  await expect(page.locator('.chart-list')).toBeVisible()
  await expect(page.locator('.name-input')).toBeVisible()
  await expect(page.locator('.editor-toggle')).toBeVisible()
  await expect(page.getByTitle('Toggle theme')).toBeVisible()
  await expect(page.getByTitle('Share chart')).toBeVisible()
  await expect(page.locator('.zoombar')).toBeVisible()
  await expect(page.locator('.editor-status')).toBeVisible()
}

async function assertBodyMatchesTokens(page: Page) {
  const colors = await page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.backgroundColor = 'var(--bg)'
    probe.style.color = 'var(--text)'
    document.body.appendChild(probe)
    const probeStyle = getComputedStyle(probe)
    const tokenBg = probeStyle.backgroundColor
    const tokenText = probeStyle.color
    probe.remove()
    const bodyStyle = getComputedStyle(document.body)
    return { tokenBg, tokenText, bodyBg: bodyStyle.backgroundColor, bodyText: bodyStyle.color }
  })
  expect(colors.bodyBg).toBe(colors.tokenBg)
  expect(colors.bodyText).toBe(colors.tokenText)
}

test('structural sizes match the design spec', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.stage svg')).toBeVisible()

  const sidebar = await page.locator('.sidebar').boundingBox()
  const topbar = await page.locator('.topbar').boundingBox()
  expect(sidebar?.width).toBeCloseTo(248, 0)
  expect(topbar?.height).toBeCloseTo(53, 0)
})

test('regions and token colors hold in both themes', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.stage svg')).toBeVisible()

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await assertRegions(page)
  await assertBodyMatchesTokens(page)

  await page.getByTitle('Toggle theme').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await assertRegions(page)
  await assertBodyMatchesTokens(page)
})
