import { Repository } from '../database/repository'
import { Article, ArticleContent } from '../types'
import { IArticleService, ICleaningService } from './interfaces'

type FetchText = (url: string) => Promise<string>

const DEFAULT_USER_AGENT = 'Mercury/1.0 RSS Reader'

export class ArticleService implements IArticleService {
  constructor(
    private readonly repository: Repository,
    private readonly cleaningService: ICleaningService,
    private readonly fetchText: FetchText = defaultFetchText
  ) {}

  async getArticlesByFeed(feedId: string): Promise<Article[]> {
    return this.repository.getArticlesByFeed(feedId)
  }

  async getEntries(feedId: string): Promise<Article[]> {
    return this.getArticlesByFeed(feedId)
  }

  async getAllArticles(): Promise<Article[]> {
    return this.repository.getAllArticles()
  }

  async getUnreadArticles(): Promise<Article[]> {
    return this.repository.getUnreadArticles()
  }

  async getArticleContent(articleId: string): Promise<ArticleContent> {
    const entry = this.repository.getEntryRowById(articleId)
    if (!entry) {
      throw new Error(`Article not found: ${articleId}`)
    }

    let content = this.repository.getArticleContent(articleId)
    if (!content) {
      throw new Error(`Article content cannot be loaded: ${articleId}`)
    }

    // 如果没有清洗后的 HTML，则调用 CleaningService 进行清洗
    if (!content.cleanedHtml) {
      const cleaned = await this.cleaningService.cleanArticle(articleId, entry.url)
      content = this.repository.getArticleContent(articleId)
    }

    if (!content) {
      throw new Error(`Article content cannot be loaded after cleaning: ${articleId}`)
    }

    return content
  }

  async getEntryContent(articleId: string): Promise<ArticleContent> {
    return this.getArticleContent(articleId)
  }

  async markAsRead(articleId: string): Promise<void> {
    this.repository.markAsRead(articleId)
  }

  async markAsUnread(articleId: string): Promise<void> {
    this.repository.markAsUnread(articleId)
  }
}

async function defaultFetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  return response.text()
}
