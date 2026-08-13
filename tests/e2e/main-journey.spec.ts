import { expect, test } from '@playwright/test'

async function completeDiagnosticWithLowestScores(
  page: import('@playwright/test').Page,
) {
  await page.goto('/diagnostic')

  // Le diagnostic presente un theme par ecran, soit quatre questions : il faut
  // toutes les renseigner avant que « Continuer » s'active. Attendre le
  // libelle du theme avant de cocher evite de repondre sur l'ecran precedent,
  // encore affiche le temps du rendu.
  for (let theme = 1; theme <= 6; theme += 1) {
    await expect(page.getByText(`Thème ${theme} sur 6`).first()).toBeVisible()

    const cards = page.locator('.question-card')
    await expect(cards).toHaveCount(4)
    const count = await cards.count()

    for (let index = 0; index < count; index += 1) {
      await cards.nth(index).locator('input[type="radio"]').first().check()
    }

    const nextButton = page.getByRole('button', { name: 'Continuer' })

    if (await nextButton.isVisible()) {
      await nextButton.click()
      continue
    }

    // Dernier theme : confirmation puis acces aux resultats.
    await page.getByRole('button', { name: 'Confirmer le diagnostic' }).click()
    await page.getByRole('button', { name: 'Voir mes résultats' }).click()
    return
  }
}

async function openNavigationIfNeeded(page: import('@playwright/test').Page) {
  const menuButton = page.getByRole('button', { name: 'Menu' })

  if (await menuButton.isVisible()) {
    await menuButton.click()
  }
}

// Les entrees du parcours vivent desormais dans le sous-menu « Mon plan »,
// replie par defaut. Les liens sont cherches dans l'en-tete uniquement : le
// pied de page reprend les memes libelles, un selecteur global serait
// ambigu.
async function clickInNavGroup(
  page: import('@playwright/test').Page,
  group: string,
  link: string,
) {
  const nav = page.locator('#main-navigation')
  await nav.getByRole('button', { name: group }).click()
  await nav.getByRole('link', { name: link, exact: true }).click()
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

  const cards = page.locator('.question-card')
  await expect(cards).toHaveCount(4)

  for (let index = 0; index < 4; index += 1) {
    await cards.nth(index).locator('input[type="radio"]').first().check()
  }

  await page.getByRole('button', { name: 'Continuer' }).click()
  await expect(page.getByText('Thème 2 sur 6').first()).toBeVisible()

  await page.reload()

  // La reprise doit rouvrir le bon theme et conserver les reponses du premier.
  await expect(page.getByText('Thème 2 sur 6').first()).toBeVisible()
  await page.getByRole('button', { name: 'Précédent' }).click()
  await expect(page.locator('.question-card input[type="radio"]:checked')).toHaveCount(4)
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
  await clickInNavGroup(page, 'Mon plan', 'Kit')
  await expect(
    page.getByRole('heading', { name: 'Mon kit personnalisé' }),
  ).toBeVisible()
  await expect(
    page.getByText('Réserve d’eau selon recommandation officielle validée'),
  ).toBeVisible()
})

test('formulaire experimentation utilisateurs enregistre un retour anonyme', async ({
  page,
}) => {
  await page.goto('/')
  // Le formulaire a quitte le menu principal : ce n'est pas une destination
  // mais un retour d'experience, il vit desormais dans le pied de page sous
  // un libelle que le visiteur comprend.
  await page.getByRole('link', { name: 'Donner mon avis' }).click()

  await expect(
    page.getByRole('heading', { name: 'Donnez votre avis sur le site' }),
  ).toBeVisible()
  await page.getByLabel('Durée totale en minutes').fill('12')
  await page
    .getByLabel('Quelle action utile avez-vous découverte ?')
    .fill('Préparer le kit')
  await page.getByRole('button', { name: 'Envoyer mon avis' }).click()

  await expect(page.getByText('1 retour(s) enregistré(s)')).toBeVisible()

  // Les exports CSV et JSON servaient a l'usage interne et n'avaient aucun
  // sens pour le visiteur qui remplit le formulaire : ils ont ete retires.
  // Le formulaire public ne propose donc plus que l'enregistrement du retour.
  await expect(page.getByRole('button', { name: 'Export CSV' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Export JSON' })).toHaveCount(0)
})
