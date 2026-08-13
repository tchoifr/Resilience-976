/* global console */
// Compare les clefs du francais et du shimaore-bushi et liste ce qui manque.
//
// Deux ensembles sont hors perimetre de traduction, par decision produit :
// les pages de statistiques (usage interne) et l'assistant de liens
// (fonctionnalite en version alpha). Ils sont exclus du rapport pour que la
// liste restante soit celle qu'un locuteur doit reellement traiter.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const OUT_OF_SCOPE = [
  'contentLinks',
  'dashboard',
  'quizStats',
  'videoStats',
  'scenarioStats',
  'kitStats',
  'diagnosticStats',
  'experimentStats',
  'priorities',
  'visitorGraph',
  'visitorProfile',
  'seo.contentLinks',
  'seo.dashboard',
  'seo.quizStats',
  'seo.videoStats',
  'seo.scenarioStats',
  'seo.kitStats',
  'seo.diagnosticStats',
  'seo.experimentStats',
  'seo.priorities',
  'seo.visitorGraph',
  'seo.visitorProfile',
]

function isOutOfScope(key) {
  return OUT_OF_SCOPE.some((prefix) => key === prefix || key.startsWith(`${prefix}.`))
}

function flatten(value, prefix = '') {
  if (typeof value !== 'object' || value === null) {
    return [prefix]
  }

  return Object.entries(value).flatMap(([childKey, childValue]) =>
    flatten(childValue, prefix ? `${prefix}.${childKey}` : childKey),
  )
}

async function loadMessages(file, exportName) {
  const source = await readFile(resolve(root, file), 'utf8')
  // Le fichier contient aussi des declarations de types apres l'objet : on ne
  // garde que le litteral, de « export const X = » au « } as const ».
  const start = source.indexOf(`export const ${exportName} = `)
  const end = source.indexOf('} as const', start)
  const body = `return ${source.slice(
    start + `export const ${exportName} = `.length,
    end + 1,
  )}`

  return new Function(body)()
}

const fr = await loadMessages('src/shared/i18n/locales/fr.ts', 'frMessages')
const swb = await loadMessages('src/shared/i18n/locales/swb.ts', 'swbMessages')

const frKeys = flatten(fr)
const swbKeys = new Set(flatten(swb))

const missing = frKeys.filter((key) => !swbKeys.has(key))
const inScope = missing.filter((key) => !isOutOfScope(key))
const skipped = missing.length - inScope.length

const groups = new Map()

for (const key of inScope) {
  const section = key.split('.')[0]
  groups.set(section, (groups.get(section) ?? 0) + 1)
}

console.log(`Clefs francaises          : ${frKeys.length}`)
console.log(`Traduites en shimaore     : ${frKeys.length - missing.length}`)
console.log(`Hors perimetre (exclues)  : ${skipped}`)
console.log(`A traduire                : ${inScope.length}`)
console.log('')

for (const [section, count] of [...groups].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(count).padStart(4)}  ${section}`)
}

if (process.argv.includes('--list')) {
  console.log('')
  for (const key of inScope) {
    console.log(key)
  }
}

// Fiche de traduction : la clef, le texte francais, une case a remplir. Sans
// le texte source a cote, la liste de clefs n'est pas exploitable par un
// locuteur qui ne lit pas le code.
if (process.argv.includes('--md')) {
  const { writeFile } = await import('node:fs/promises')
  const target = resolve(root, 'docs/product/i18n-shimaore-a-traduire.md')

  function valueAt(key) {
    return key.split('.').reduce((node, part) => (node ? node[part] : undefined), fr)
  }

  const lines = [
    '# Shimaore-bushi : chaines a traduire',
    '',
    `Genere par \`npm run i18n:check -- --md\` le ${new Date().toISOString().slice(0, 10)}.`,
    '',
    `${inScope.length} chaines sur ${frKeys.length} restent en francais dans la version`,
    'shimaore-bushi. Les pages de statistiques et l’assistant de liens sont hors',
    'perimetre et ne figurent pas ici.',
    '',
    'Une chaine absente de `swb.ts` s’affiche en francais : le site reste utilisable,',
    'mais la promesse bilingue n’est pas tenue sur ces ecrans.',
    '',
    '| Clef | Francais | Shimaore-bushi |',
    '| --- | --- | --- |',
  ]

  for (const key of inScope) {
    const source = String(valueAt(key) ?? '').replace(/\|/g, '\\|')
    lines.push(`| \`${key}\` | ${source} | |`)
  }

  await writeFile(target, `${lines.join('\n')}\n`, 'utf8')
  console.log(`\nFiche ecrite : ${target}`)
}
