export interface Feed {
  id: string
  title: string
  url: string
  unreadCount: number
}

export interface Article {
  id: string
  feedId: string
  title: string
  author?: string
  publishedAt: string
  excerpt: string
  isRead: boolean
  tags: string[]
}

export interface ArticleContent {
  id: string
  title: string
  author?: string
  publishedAt: string
  sourceUrl: string
  rawHtml?: string
  cleanedHtml?: string
  cleanedMarkdown?: string
  summary?: string
  translation?: string
  tags: string[]
}

export interface Tag {
  id: string
  name: string
  count: number
}

export interface LLMConfig {
  baseUrl: string
  apiKey: string
  model: string
}
