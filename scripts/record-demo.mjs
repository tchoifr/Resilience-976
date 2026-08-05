// Génère une vidéo de démonstration du parcours utilisateur (accueil, diagnostic,
// résultats + certificat PDF, checklist + PDF, kit, ressources, vidéos) via
// Playwright, pour la communication/présentation du site. N'est pas une suite de
// tests : les pauses et scrolls sont volontairement lents pour rester regardables.
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
const DOWNLOADS_DIR = path.join(VIDEO_DIR, 'downloads')

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
  await page.waitForTimeout(800)

  // --- Diagnostic : réponses variées pour un score non nul ---
  let index = 0
  for (;;) {
    const options = page.locator('.question-card input[type="radio"]')
    const count = await options.count()
    const choice = index % count
    await options.nth(choice).check()
    await page.waitForTimeout(500)

    await page.locator('.cluster .button--primary').click()
    await page.waitForTimeout(500)

    if (page.url().includes('/resultats')) {
      break
    }

    index += 1
  }

  // --- Résultats + téléchargement et lecture du certificat PDF ---
  await page.waitForTimeout(1200)
  await smoothScrollToBottom(page, 500)
  await scrollToTop(page)

  await downloadAndViewPdf(page, '.cluster .button--primary', BASE_URL + '/resultats')

  // --- Checklist + téléchargement et lecture du PDF ---
  await page.locator('nav a[href="/checklist"]').click()
  await page.waitForTimeout(1000)
  await smoothScrollToBottom(page, 450)
  await scrollToTop(page)

  await downloadAndViewPdf(page, '.cluster .button--primary', BASE_URL + '/checklist')

  // --- Kit / Ressources ---
  for (const href of ['/kit', '/ressources']) {
    await page.locator(`nav a[href="${href}"]`).click()
    await page.waitForTimeout(1000)
    await smoothScrollToBottom(page, 450)
    await scrollToTop(page)
    await page.waitForTimeout(400)
  }

  // --- Vidéos : liste, ouverture de la première, quiz, retour à la liste ---
  await page.locator('nav a[href="/videos"]').click()
  await page.waitForTimeout(1000)
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

  await page.waitForTimeout(800)
  await context.close()
  await browser.close()

  console.log('done')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
