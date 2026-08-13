// Génère une vidéo de démonstration du parcours utilisateur (accueil,
// diagnostic, résultats + certificat PDF, checklist + PDF, kit + PDF,
// ressources, vidéos, quiz interactif + attestation PDF, mises en situation,
// pages réglementaires) via Playwright, pour la communication/présentation du
// site. N'est pas une suite de tests : les pauses et scrolls sont
// volontairement lents pour rester regardables.
//
// Prérequis : le site doit tourner (ex. `npm run preview -- --port 4174`).
//
// Usage :
//   node scripts/record-demo.mjs <baseUrl> <outputDir> [locale]
//   node scripts/record-demo.mjs http://127.0.0.1:4174 ./demo-video fr
//   node scripts/record-demo.mjs http://127.0.0.1:4174 ./demo-video swb

// window/document below run inside page.evaluate (browser context, not Node).
/* eslint-disable no-undef */

import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import { chromium } from 'playwright'

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4174'
const VIDEO_DIR = process.argv[3] ?? './demo-video'
const LOCALE = process.argv[4] ?? 'fr'
// Chemin absolu : les PDF sont ensuite ouverts via une URL file://, qui ne
// sait pas resoudre un chemin relatif au dossier de travail.
const DOWNLOADS_DIR = path.resolve(VIDEO_DIR, 'downloads')

// Les boutons de telechargement PDF portent tous l'icone « download » du jeu
// maison : viser son trace evite de dependre du libelle, donc de la langue.
const DOWNLOAD_BUTTON =
  'button:has(svg path[d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4"])'

async function smoothScrollToBottom(page, stepPause = 350) {
  const height = await page.evaluate(() => document.body.scrollHeight)
  const viewport = page.viewportSize()?.height ?? 800
  let scrolled = 0

  while (scrolled < height) {
    scrolled += Math.round(viewport * 0.6)
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), scrolled)
    await page.waitForTimeout(stepPause)
  }

  await page.waitForTimeout(600)
}

async function scrollToTop(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await page.waitForTimeout(500)
}

// Télécharge le PDF déclenché par un clic, l'ouvre dans le visualiseur PDF natif
// de Chromium (même onglet, pour rester dans la même vidéo), le fait défiler
// jusqu'en bas, puis revient sur `returnUrl`.
async function downloadAndViewPdf(page, buttonSelector, returnUrl) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator(buttonSelector).click(),
  ])

  const destPath = path.join(DOWNLOADS_DIR, download.suggestedFilename())
  await download.saveAs(destPath)
  await page.waitForTimeout(800)

  await page.goto('file:///' + destPath.replace(/\\/g, '/'))
  await page.waitForTimeout(1500)

  const viewportHeight = page.viewportSize()?.height ?? 800
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.wheel(0, viewportHeight * 0.7)
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(800)

  await page.goto(returnUrl)
  await page.waitForTimeout(800)
}

// Les entrees du parcours vivent dans des sous-menus replies : il faut ouvrir
// le groupe avant de cliquer le lien. Le groupe est designe par sa position
// (0 = « Mon plan », 1 = « Se former ») pour rester independant de la langue.
// Une pause separe les deux gestes pour que le menu se voie a l'ecran.
async function navigateFromMenu(page, groupIndex, href) {
  const nav = page.locator('#main-navigation')

  await nav.locator('.nav-group__toggle').nth(groupIndex).click()
  await page.waitForTimeout(600)
  await nav.locator(`a[href="${href}"]`).click()
  await page.waitForTimeout(1000)
}

// Le diagnostic presente un theme par ecran, soit quatre questions : il faut
// toutes les renseigner avant que « Continuer » s'active. Les reponses sont
// variees d'une question a l'autre pour obtenir un score intermediaire, plus
// parlant en demonstration qu'un score nul ou parfait.
async function completeDiagnostic(page) {
  const progress = page.locator('.theme-progress__segments')
  const themeCount = Number(await progress.getAttribute('aria-valuemax'))
  let answered = 0

  for (let theme = 1; theme <= themeCount; theme += 1) {
    // La barre de progression porte le rang du theme affiche : l'attendre
    // evite de repondre sur l'ecran precedent, encore rendu.
    await page.waitForFunction(
      (rank) =>
        document
          .querySelector('.theme-progress__segments')
          ?.getAttribute('aria-valuenow') === String(rank),
      theme,
    )
    await page.waitForTimeout(600)

    const cards = page.locator('.question-card')
    const cardCount = await cards.count()

    for (let index = 0; index < cardCount; index += 1) {
      const options = cards.nth(index).locator('input[type="radio"]')
      const optionCount = await options.count()

      if (optionCount > 0) {
        await options.nth(answered % optionCount).check()
        await page.waitForTimeout(350)
      }

      answered += 1
    }

    // Les quatre questions d'un theme ne tiennent pas dans un ecran : on les
    // parcourt avant de continuer, sinon la moitie du diagnostic n'apparait
    // jamais dans la video.
    await smoothScrollToBottom(page, 250)
    await scrollToTop(page)

    // Un seul bouton principal a chaque ecran : « Continuer », puis
    // « Confirmer le diagnostic » au dernier theme.
    await page.locator('.cluster .button--primary').click()
    await page.waitForTimeout(theme === themeCount ? 1200 : 700)

    if (theme < themeCount) {
      continue
    }

    // Le diagnostic confirme remplace le formulaire par le recapitulatif des
    // reponses : on le montre avant d'ouvrir les resultats.
    await smoothScrollToBottom(page, 450)
    await scrollToTop(page)
    await page.locator('.cluster .button--primary').click()
    await page.waitForTimeout(1000)
    return
  }
}

async function visitStaticPage(page, href) {
  await page.locator(`footer nav a[href="${href}"]`).click()
  await page.waitForTimeout(1000)
  await smoothScrollToBottom(page, 450)
  await scrollToTop(page)
}

async function main() {
  await mkdir(DOWNLOADS_DIR, { recursive: true })

  // Le Chromium fourni par Playwright a son visualiseur PDF intégré désactivé
  // (toute navigation vers un PDF déclenche un téléchargement au lieu d'un rendu
  // inline). On utilise le Chrome installé sur la machine, qui le conserve, pour
  // pouvoir afficher et faire défiler le PDF dans la même vidéo.
  const browser = await chromium.launch({ channel: 'chrome' })
  const context = await browser.newContext({
    viewport: { width: 1366, height: 800 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1366, height: 800 } },
    acceptDownloads: true,
  })
  const page = await context.newPage()
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('[browser console]', msg.text())
    }
  })
  page.on('pageerror', (error) => console.error('[browser pageerror]', error.message))

  // --- Accueil + choix de la langue ---
  await page.goto(BASE_URL + '/')
  await page.waitForTimeout(1000)

  if (LOCALE !== 'fr') {
    await page.locator('.language-switcher select').selectOption(LOCALE)
    await page.waitForTimeout(1000)
  }

  await page.waitForTimeout(400)
  await smoothScrollToBottom(page)
  await scrollToTop(page)

  await page.locator('.hero-actions .link-button--primary').click()
  await page.waitForSelector('.question-card input[type="radio"]')
  await page.waitForTimeout(800)

  // --- Diagnostic : six themes de quatre questions ---
  await completeDiagnostic(page)

  // --- Résultats + téléchargement et lecture du certificat PDF ---
  await page.waitForTimeout(1200)
  await smoothScrollToBottom(page, 500)
  await scrollToTop(page)

  await downloadAndViewPdf(
    page,
    DOWNLOAD_BUTTON,
    BASE_URL + '/resultats',
  )

  // --- Checklist + téléchargement et lecture du PDF ---
  await navigateFromMenu(page, 0, '/checklist')
  await smoothScrollToBottom(page, 450)
  await scrollToTop(page)

  await downloadAndViewPdf(
    page,
    DOWNLOAD_BUTTON,
    BASE_URL + '/checklist',
  )

  // --- Kit : ajuster le foyer, puis télécharger et lire le PDF ---
  await navigateFromMenu(page, 0, '/kit')

  const childrenStepper = page.locator('.household-grid .stepper').nth(1)
  await childrenStepper.locator('.button--secondary').nth(1).click()
  await page.waitForTimeout(500)

  await smoothScrollToBottom(page, 450)
  await scrollToTop(page)

  await downloadAndViewPdf(
    page,
    DOWNLOAD_BUTTON,
    BASE_URL + '/kit',
  )

  // --- Ressources ---
  await page.locator('#main-navigation a[href="/ressources"]').click()
  await page.waitForTimeout(1000)
  await smoothScrollToBottom(page, 450)
  await scrollToTop(page)
  await page.waitForTimeout(400)

  // --- Vidéos : liste, ouverture de la première, quiz, retour à la liste ---
  await navigateFromMenu(page, 1, '/videos')
  await smoothScrollToBottom(page, 450)
  await scrollToTop(page)

  await page.locator('.video-card').first().locator('.link-button--primary').click()
  await page.waitForTimeout(1000)
  await smoothScrollToBottom(page, 450)
  await scrollToTop(page)

  await page.locator('.video-quiz input[type="radio"]').first().check()
  await page.waitForTimeout(600)
  await page.locator('.cluster .button--primary').first().click()
  await page.waitForTimeout(1200)

  await page.locator('.back-link').click()
  await page.waitForTimeout(1000)

  // --- Quiz interactif : tirage aléatoire, score en direct, attestation PDF ---
  await navigateFromMenu(page, 1, '/quiz')

  await page.locator('.cluster .button--primary').click()
  await page.waitForTimeout(700)

  for (let step = 0; step < 8; step += 1) {
    await page.locator('.video-quiz input[type="radio"]').first().check()
    await page.waitForTimeout(400)
    await page.locator('.cluster .button--primary').click()
    await page.waitForTimeout(700)
    await page.locator('.cluster .button--primary').click()
    await page.waitForTimeout(700)
  }

  await smoothScrollToBottom(page, 450)
  await scrollToTop(page)

  await downloadAndViewPdf(
    page,
    DOWNLOAD_BUTTON,
    BASE_URL + '/quiz',
  )

  // --- Mises en situation : un scénario complet jusqu'au débrief ---
  await navigateFromMenu(page, 1, '/mises-en-situation')
  await smoothScrollToBottom(page, 450)
  await scrollToTop(page)

  await page.locator('.link-button--primary').first().click()
  await page.waitForTimeout(1000)

  for (let step = 0; step < 3; step += 1) {
    await page.locator('.video-quiz input[type="radio"]').first().check()
    await page.waitForTimeout(400)
    await page.locator('.cluster .button--primary').click()
    await page.waitForTimeout(900)
  }

  await smoothScrollToBottom(page, 450)
  await scrollToTop(page)
  await page.waitForTimeout(600)

  // --- Pages réglementaires (mentions légales, confidentialité, accessibilité, support) ---
  await visitStaticPage(page, '/mentions-legales')
  await visitStaticPage(page, '/politique-de-confidentialite')
  await visitStaticPage(page, '/declaration-accessibilite')
  await visitStaticPage(page, '/support')

  await page.waitForTimeout(800)
  await context.close()
  await browser.close()

  console.log('done')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
