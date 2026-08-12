import { expect, test } from '@playwright/test'

test('affiche le brouillon de traduction shimaore', async ({ page }) => {
  await page.route('**/api/i18n/draft-shimaore', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ swahili: 'Karibu', shimaore: 'Karibuni' }),
    })
  })

  await page.goto('/outils/traduction-shimaore')
  await page.getByLabel('Texte en français').fill('Bienvenue')
  await page.getByRole('button', { name: 'Traduire' }).click()

  await expect(page.getByText('Swahili : Karibu')).toBeVisible()
  await expect(page.getByText('Shimaore : Karibuni')).toBeVisible()
})

test('affiche un message clair quand le service est indisponible', async ({ page }) => {
  await page.route('**/api/i18n/draft-shimaore', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'translation_unconfigured' }),
    })
  })

  await page.goto('/outils/traduction-shimaore')
  await page.getByLabel('Texte en français').fill('Bienvenue')
  await page.getByRole('button', { name: 'Traduire' }).click()

  await expect(
    page.getByText('L’outil n’est pas configuré (clé Hugging Face manquante).'),
  ).toBeVisible()
})
