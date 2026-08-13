import { expect, test } from '@playwright/test'

test('affiche les liens correspondant à la question', async ({ page }) => {
  await page.route('**/api/assistant-liens', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        matches: [
          { title: 'Séisme', type: 'resource', url: '/ressources' },
          { title: 'Quiz : Seisme', type: 'quiz', url: '/quiz' },
        ],
        refused: false,
      }),
    })
  })

  await page.goto('/assistant-liens')
  await page.getByLabel('Votre question').fill('les risques par rapport aux séismes')
  await page.getByRole('button', { name: 'Rechercher' }).click()

  await expect(page.getByRole('link', { name: /Séisme/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Quiz : Seisme/ })).toBeVisible()
})

test('affiche un message de repli quand aucune correspondance n’est trouvée', async ({
  page,
}) => {
  await page.route('**/api/assistant-liens', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ matches: [], refused: true }),
    })
  })

  await page.goto('/assistant-liens')
  await page.getByLabel('Votre question').fill('une question hors sujet')
  await page.getByRole('button', { name: 'Rechercher' }).click()

  await expect(
    page.getByText('Aucun contenu du site ne correspond clairement à cette question.'),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voir toutes les ressources' })).toBeVisible()
})
