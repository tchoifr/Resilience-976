/* global console */
// Rejoue l'audit Lighthouse sur les pages publiques suivies, en mobile puis en
// desktop, et imprime le tableau de synthese en markdown.
//
// Le site doit deja tourner. Pour mesurer ce que verra un visiteur, servir le
// build de production et laisser /api joignable :
//
//   npm run analytics:server
//   npm run build && npm run preview -- --port 4174
//   npm run audit:lighthouse
//
// Sans backend derriere /api, les appels echouent et le score « Bonnes
// pratiques » chute pour une raison qui n'existe pas en production.

import { spawn } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const BASE_URL = process.argv[2] ?? 'http://127.0.0.1:4174'
const OUTPUT_DIR = path.resolve(process.argv[3] ?? './lighthouse-report')

const PAGES = [
  { name: 'accueil', path: '/' },
  { name: 'diagnostic', path: '/diagnostic' },
  { name: 'ressources', path: '/ressources' },
  { name: 'tableau-de-bord', path: '/tableau-de-bord' },
  { name: 'experimentation', path: '/experimentation-utilisateurs' },
]

const FORM_FACTORS = [
  { id: 'mobile', args: [] },
  { id: 'desktop', args: ['--preset=desktop'] },
]

function runLighthouse(url, outputPath, extraArgs) {
  return new Promise((resolve, reject) => {
    const args = [
      '--yes',
      'lighthouse',
      url,
      '--quiet',
      // Guillemets indispensables : la valeur contient une espace, et sur
      // Windows la commande passe par le shell (voir plus bas).
      '"--chrome-flags=--headless=new --no-sandbox"',
      '--output=json',
      '--output=html',
      `"--output-path=${outputPath}"`,
      ...extraArgs,
    ]

    // Depuis Node 20, spawn refuse un .cmd sans shell (EINVAL) : npx sur
    // Windows en est un.
    const child = spawn('npx', args, {
      stdio: ['ignore', 'ignore', 'inherit'],
      shell: true,
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      // Lighthouse sort en code non nul des qu'une categorie passe sous un
      // seuil : ce n'est pas une erreur d'execution, le rapport est ecrit.
      resolve(code)
    })
  })
}

function formatRow(name, report) {
  const score = (id) => Math.round(report.categories[id].score * 100)
  const value = (id) => report.audits[id].displayValue ?? '—'

  return `| ${name} | ${score('performance')} | ${score('accessibility')} | ${score('best-practices')} | ${score('seo')} | ${value('largest-contentful-paint')} | ${value('total-blocking-time')} | ${value('cumulative-layout-shift')} |`
}

await mkdir(OUTPUT_DIR, { recursive: true })

const tables = []

for (const formFactor of FORM_FACTORS) {
  const rows = []
  let version = ''
  let fetchTime = ''

  for (const page of PAGES) {
    const outputPath = path.join(OUTPUT_DIR, `${formFactor.id}-${page.name}`)
    process.stderr.write(`${formFactor.id} ${page.name}…\n`)

    await runLighthouse(`${BASE_URL}${page.path}`, outputPath, formFactor.args)

    const report = JSON.parse(await readFile(`${outputPath}.report.json`, 'utf8'))
    rows.push(formatRow(page.name, report))
    version = report.lighthouseVersion
    fetchTime = report.fetchTime
  }

  tables.push(
    [
      `### ${formFactor.id}`,
      '',
      '| Page | Performance | Accessibilité | Bonnes pratiques | SEO | LCP | TBT | CLS |',
      '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
      ...rows,
      '',
      `Lighthouse ${version}, ${fetchTime}, ${BASE_URL}`,
    ].join('\n'),
  )
}

console.log(tables.join('\n\n'))
console.log(`\nRapports HTML et JSON : ${OUTPUT_DIR}`)
