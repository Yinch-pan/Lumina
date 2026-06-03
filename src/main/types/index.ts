export interface Feed {
  id: string
  title: string
  sourceTitle?: string
  customTitle?: string | null
  url: string
  unreadCount: number
  articleCount?: number
  refreshIntervalMinutes?: number
  lastRefreshedAt?: string
  lastError?: string | null
}

export interface OpmlFeed {
  title: string
  url: string
  normalizedUrl?: string
  status?: 'new' | 'existing' | 'duplicate' | 'invalid'
  message?: string
}

export interface OpmlImportFailure {
  title: string
  url: string
  error: string
}

export interface OpmlImportResult {
  feeds: Feed[]
  failures: OpmlImportFailure[]
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

export interface CleanedContent {
  cleanedHtml: string
  cleanedMarkdown: string
  title?: string
  author?: string
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
