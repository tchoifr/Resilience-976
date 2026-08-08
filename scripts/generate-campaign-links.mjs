/* global console */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const baseUrl = (
  process.env.VITE_PUBLIC_BASE_URL ?? 'https://domaine-final.fr'
).replace(/\/$/, '')
const outputDir = 'docs/communication'

const campaigns = [
  ['01_Dossier_Mon_Plan_Resilience_976', '/', 'MPR976-DOC-01-DOSSIER'],
  ['02_Demonstrateur_et_captures', '/', 'MPR976-DOC-02-DEMO'],
  [
    '03_Conformite_sources_accessibilite_impact',
    '/ressources',
    'MPR976-DOC-03-CONFORMITE',
  ],
  [
    '04_Registre_sources_validation_editoriale',
    '/ressources',
    'MPR976-DOC-04-SOURCES',
  ],
  [
    '05_Rapport_tests_moteur_personnalisation',
    '/diagnostic',
    'MPR976-DOC-05-TESTS',
  ],
  [
    '06_Exemples_livrables_utilisateur',
    '/diagnostic',
    'MPR976-DOC-06-LIVRABLES',
  ],
  ['07_Plan_diffusion_5000_personnes', '/', 'MPR976-DOC-07-DIFFUSION'],
  ['08_Lettres_soutien_preuves_interet', '/', 'MPR976-DOC-08-SOUTIENS'],
  [
    '09_Dispositif_statistique_tableau_bord',
    '/tableau-de-bord',
    'MPR976-DOC-09-DASHBOARD',
  ],
  ['10_Demonstration_video', '/videos', 'MPR976-DOC-10-VIDEO'],
  [
    '11_Compte_rendu_experimentation_utilisateurs',
    '/experimentation-utilisateurs',
    'MPR976-DOC-11-EXPERIMENTATION',
  ],
  ['12_Capacite_porteur_organisation', '/', 'MPR976-DOC-12-PORTEUR'],
  ['13_Kit_communication_mobilisation', '/', 'MPR976-DOC-13-COMMUNICATION'],
]

function campaignUrl(route, campaignId) {
  const path = route === '/' ? '' : route
  return `${baseUrl}${path}?campaign_id=${encodeURIComponent(campaignId)}`
}

function csvValue(value) {
  return `"${String(value).replace(/"/g, '""')}"`
}

mkdirSync(outputDir, { recursive: true })

const rows = campaigns.map(([documentName, route, campaignId]) => {
  const url = campaignUrl(route, campaignId)
  return {
    documentName,
    route,
    campaignId,
    url,
    qrFile: `${campaignId}.svg`,
  }
})

const csv = [
  ['document', 'route', 'campaign_id', 'url', 'qr_file'].join(','),
  ...rows.map((row) =>
    [row.documentName, row.route, row.campaignId, row.url, row.qrFile]
      .map(csvValue)
      .join(','),
  ),
].join('\n')

const markdown = [
  '# Liens de campagne QR',
  '',
  `Base URL: ${baseUrl}`,
  '',
  '| Document | Route | Campagne | URL | Fichier QR attendu |',
  '| --- | --- | --- | --- | --- |',
  ...rows.map(
    (row) =>
      `| ${row.documentName} | \`${row.route}\` | \`${row.campaignId}\` | ${row.url} | \`${row.qrFile}\` |`,
  ),
  '',
  'Les images QR doivent être générées à partir de la colonne `url` après validation du domaine final.',
  '',
].join('\n')

writeFileSync(join(outputDir, 'campaign-links.csv'), `${csv}\n`)
writeFileSync(join(outputDir, 'campaign-links.md'), markdown)

console.log(`Campaign links written to ${outputDir}`)
