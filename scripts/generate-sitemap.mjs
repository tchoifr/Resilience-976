import { writeFileSync } from 'node:fs'

const baseUrl = (process.env.VITE_PUBLIC_BASE_URL ?? 'https://exemple.fr').replace(/\/$/, '')
const routes = ['/', '/ressources', '/mentions-legales']

const urls = routes
  .map((route) => {
    return `  <url>
    <loc>${baseUrl}${route === '/' ? '' : route}</loc>
  </url>`
  })
  .join('\n')

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`

writeFileSync('public/sitemap.xml', sitemap)
