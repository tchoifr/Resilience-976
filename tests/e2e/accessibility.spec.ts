import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const pages = ['/', '/diagnostic', '/ressources', '/mentions-legales']

for (const path of pages) {
  test(`accessibilite automatique ${path}`, async ({ page }) => {
    await page.goto(path)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })
}
