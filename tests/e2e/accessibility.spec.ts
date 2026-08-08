import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const pages = [
  '/',
  '/diagnostic',
  '/ressources',
  '/tableau-de-bord',
  '/experimentation-utilisateurs',
  '/mentions-legales',
]

for (const path of pages) {
  test(`accessibilite automatique ${path}`, async ({ page }) => {
    await page.goto(path)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })
}

test('navigation clavier du parcours principal desktop', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'Le parcours clavier complet est valide sur navigation desktop.',
  )

  await page.goto('/')

  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Aller au contenu' }),
  ).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Commencer le diagnostic' }),
  ).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/diagnostic/)
  await expect(page.getByRole('heading', { name: 'Diagnostic' })).toBeVisible()

  await page.locator('.question-card input[type="radio"]').first().focus()
  await page.keyboard.press('Space')
  await expect(
    page.locator('.question-card input[type="radio"]').first(),
  ).toBeChecked()

  await page.getByRole('button', { name: 'Continuer' }).focus()
  await expect(page.getByRole('button', { name: 'Continuer' })).toBeFocused()
})

test('zoom 200 pour les pages critiques sans debordement horizontal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 720 })

  for (const path of [
    '/',
    '/diagnostic',
    '/ressources',
    '/tableau-de-bord',
    '/experimentation-utilisateurs',
    '/mentions-legales',
  ]) {
    await page.goto(path)
    await page.addStyleTag({ content: 'html { zoom: 2; }' })

    const hasHorizontalOverflow = await page.evaluate(() => {
      return (
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth
      )
    })

    expect(
      hasHorizontalOverflow,
      `${path} ne doit pas deborder a zoom 200`,
    ).toBe(false)
  }
})

test('contenu comprehensible lorsque les images ne chargent pas', async ({
  page,
}) => {
  await page.route(/\.(png|jpg|jpeg|webp|svg)$/i, (route) => route.abort())
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Êtes-vous prêt face aux risques ?' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Commencer le diagnostic' }),
  ).toBeVisible()
  await expect(page.getByText('Confidentialité')).toBeVisible()
})

test('checklist imprimable en mode print', async ({ page }) => {
  await page.goto('/checklist')
  await page.emulateMedia({ media: 'print' })

  await expect(
    page.getByRole('heading', { name: 'Ma checklist de préparation' }),
  ).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(() => {
    return (
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth
    )
  })

  expect(hasHorizontalOverflow).toBe(false)
})
