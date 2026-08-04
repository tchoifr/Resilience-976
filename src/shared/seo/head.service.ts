export interface HeadInput {
  title: string
  description: string
  path: string
}

function getBaseUrl(): string {
  return (import.meta.env.VITE_PUBLIC_BASE_URL ?? 'https://exemple.fr').replace(/\/$/, '')
}

function getAbsoluteUrl(path: string): string {
  const normalizedPath = path === '/' ? '' : path
  return `${getBaseUrl()}${normalizedPath}`
}

function upsertMeta(
  selector: string,
  attribute: 'name' | 'property',
  key: string,
): HTMLMetaElement {
  const existing = document.querySelector<HTMLMetaElement>(selector)

  if (existing) {
    return existing
  }

  const meta = document.createElement('meta')
  meta.setAttribute(attribute, key)
  document.head.append(meta)
  return meta
}

function upsertCanonical(): HTMLLinkElement {
  const existing = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')

  if (existing) {
    return existing
  }

  const link = document.createElement('link')
  link.rel = 'canonical'
  document.head.append(link)
  return link
}

export function updateHead(input: HeadInput): void {
  const url = getAbsoluteUrl(input.path)

  document.title = input.title
  upsertMeta('meta[name="description"]', 'name', 'description').content = input.description
  upsertMeta('meta[property="og:title"]', 'property', 'og:title').content = input.title
  upsertMeta('meta[property="og:description"]', 'property', 'og:description').content =
    input.description
  upsertMeta('meta[property="og:url"]', 'property', 'og:url').content = url
  upsertCanonical().href = url
}
