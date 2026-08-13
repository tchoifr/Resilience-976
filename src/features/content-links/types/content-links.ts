export type ContentLinkType = 'video' | 'scenario' | 'resource' | 'quiz'

export interface ContentLinkMatch {
  title: string
  type: ContentLinkType
  url: string
}

export interface ContentLinksResult {
  matches: ContentLinkMatch[]
  refused: boolean
}
