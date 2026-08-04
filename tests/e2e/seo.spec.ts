import { expect, test } from '@playwright/test'

test('les balises SEO changent selon la route', async ({ page }) => {
  await page.goto('/diagnostic')

  await expect(page).toHaveTitle('Diagnostic - Resilience 976')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Répondez au diagnostic de préparation sans compte et sans base de données.',
  )
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://exemple.fr/diagnostic',
  )

  await page.goto('/ressources')

  await expect(page).toHaveTitle('Ressources - Resilience 976')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://exemple.fr/ressources',
  )
})
