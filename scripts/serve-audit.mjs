/* global console, URL */
// A UTILISER POUR ZAP, PAS POUR LIGHTHOUSE.
//
// Ce serveur ne compresse pas : un fragment de 386 Ko part tel quel la ou
// nginx et `vite preview` l'envoient gzippe autour de 100 Ko. Mesurer la
// performance ici fait chuter le LCP et donne des scores faux — 83 au lieu
// de 95 sur les memes pages, constate le 14 aout 2026. Pour Lighthouse,
// utiliser `npm run preview`, qui compresse et proxifie /api.

// Sert le build de production et proxifie /api vers le collecteur, comme le
// nginx du VPS. Contrairement a `vite preview`, ce serveur ne filtre pas
// l'en-tete Host : un scanner qui vise host.docker.internal n'est pas rejete
// en 403 avant meme d'avoir vu une page.
import { createServer, request as httpRequest } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const PORT = Number(process.argv[2] ?? 4180)
const ROOT = path.resolve(process.argv[3] ?? 'dist')
const API_TARGET = { host: '127.0.0.1', port: Number(process.argv[4] ?? 8787) }

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
}

function proxyApi(clientRequest, clientResponse) {
  const proxied = httpRequest(
    {
      host: API_TARGET.host,
      port: API_TARGET.port,
      method: clientRequest.method,
      path: clientRequest.url,
      headers: { ...clientRequest.headers, host: `${API_TARGET.host}:${API_TARGET.port}` },
    },
    (upstream) => {
      clientResponse.writeHead(upstream.statusCode ?? 502, upstream.headers)
      upstream.pipe(clientResponse)
    },
  )

  proxied.on('error', () => {
    clientResponse.writeHead(502, { 'content-type': 'application/json' })
    clientResponse.end('{"error":"backend_unreachable"}')
  })

  clientRequest.pipe(proxied)
}

// Copie des en-tetes de deploy/nginx.conf, qui reste la source de verite : sans eux, un scanner signale des
// absences qui n'existent pas en production.
const SECURITY_HEADERS = {
  'content-security-policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' https://webissimo.developpement-durable.gouv.fr; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'x-frame-options': 'DENY',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
}

async function sendFile(response, filePath, statusCode = 200) {
  const body = await readFile(filePath)
  response.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    'content-type': TYPES[path.extname(filePath)] ?? 'application/octet-stream',
  })
  response.end(body)
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')

  if (url.pathname.startsWith('/api/')) {
    proxyApi(request, response)
    return
  }

  const candidate = path.join(ROOT, decodeURIComponent(url.pathname))

  // Empeche de sortir de dist/ par un chemin construit.
  if (!candidate.startsWith(ROOT)) {
    response.writeHead(403)
    response.end()
    return
  }

  try {
    const info = await stat(candidate)

    if (info.isFile()) {
      await sendFile(response, candidate)
      return
    }
  } catch {
    // fichier absent : on retombe sur l'application monopage
  }

  await sendFile(response, path.join(ROOT, 'index.html'))
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur d'audit : http://0.0.0.0:${PORT} (racine ${ROOT}, /api -> ${API_TARGET.host}:${API_TARGET.port})`)
})
