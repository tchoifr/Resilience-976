import { expect, test } from '@playwright/test'

test('le parcours mobile 360px ne crée pas de scroll horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await page.goto('/')

  const hasHorizontalOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth
  })

  expect(hasHorizontalOverflow).toBe(false)
  await expect(page.getByRole('link', { name: 'Commencer le diagnostic' })).toBeVisible()
})
