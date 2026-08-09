import { expect, test } from '@playwright/test'

async function completeDiagnosticWithLowestScores(
  page: import('@playwright/test').Page,
) {
  await page.goto('/diagnostic')

  for (let index = 0; index < 24; index += 1) {
    await page.locator('.question-card input[type="radio"]').first().check()
    const finalButton = page.getByRole('button', {
      name: 'Voir mes résultats',
    })

    if (await finalButton.isVisible()) {
      await finalButton.click()
      return
    }

    await page.getByRole('button', { name: 'Continuer' }).click()
  }
}

async function openNavigationIfNeeded(page: import('@playwright/test').Page) {
  const menuButton = page.getByRole('button', { name: 'Menu' })

  if (await menuButton.isVisible()) {
    await menuButton.click()
  }
}

test('parcours accueil diagnostic résultats et PDF', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Êtes-vous prêt face aux risques ?' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Commencer le diagnostic' }).click()
  await expect(page.getByRole('heading', { name: 'Diagnostic' })).toBeVisible()

  await completeDiagnosticWithLowestScores(page)

  await expect(page).toHaveURL(/\/resultats/)
  await expect(
    page.getByRole('heading', { name: 'Votre niveau de préparation' }),
  ).toBeVisible()
  await expect(page.getByText('Préparation insuffisante')).toBeVisible()
  await expect(page.getByText('Vos 3 priorités immédiates')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await expect(
    page.getByRole('button', { name: 'Imprimer le certificat' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Télécharger le certificat' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe('certificat-resilience-976.pdf')
})

test('reprise locale du diagnostic sur le même appareil', async ({ page }) => {
  await page.goto('/diagnostic')

  await page.locator('.question-card input[type="radio"]').first().check()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByText('Question 2 / 24')).toBeVisible()

  await page.reload()

  await expect(page.getByText('Question 2 / 24')).toBeVisible()
})

test('checklist et kit restent accessibles sans compte', async ({ page }) => {
  await completeDiagnosticWithLowestScores(page)

  await page.getByRole('link', { name: 'Ouvrir la checklist' }).click()
  await expect(
    page.getByRole('heading', { name: 'Ma checklist de préparation' }),
  ).toBeVisible()
  await page.locator('input[type="checkbox"]').first().check()
  await expect(page.getByText('Checklist complétée')).toBeVisible()
  await page.getByRole('button', { name: '+ Prévenir un proche' }).click()
  await expect(page.getByText('Prévenir un proche').last()).toBeVisible()

  const checklistDownloadPromise = page.waitForEvent('download')
  await page
    .getByRole('button', { name: 'Télécharger ma checklist PDF' })
    .click()
  const checklistDownload = await checklistDownloadPromise

  expect(checklistDownload.suggestedFilename()).toBe(
    'checklist-resilience-976.pdf',
  )

  await openNavigationIfNeeded(page)
  await page.getByRole('link', { name: 'Kit' }).click()
  await expect(
    page.getByRole('heading', { name: 'Mon kit personnalisé' }),
  ).toBeVisible()
  await expect(
    page.getByText('Réserve d’eau selon recommandation officielle validée'),
  ).toBeVisible()
})

test('formulaire experimentation utilisateurs exporte des retours anonymes', async ({
  page,
}) => {
  await page.goto('/')
  await openNavigationIfNeeded(page)
  await page.getByRole('link', { name: 'Expérimentation' }).click()

  await expect(
    page.getByRole('heading', { name: 'Questionnaire de test' }),
  ).toBeVisible()
  await page.getByLabel('Durée totale en minutes').fill('12')
  await page
    .getByLabel('Quelle action utile avez-vous découverte ?')
    .fill('Préparer le kit')
  await page.getByRole('button', { name: 'Enregistrer le retour' }).click()

  await expect(page.getByText('1 retour(s) enregistré(s)')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toBe(
    'retours-utilisateurs-resilience-976.csv',
  )
})
