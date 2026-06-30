import {
  Feed,
  Article,
  ArticleContent,
  Tag,
  LLMConfig,
  OpmlFeed,
  OpmlImportResult,
  CleanedContent
} from '../types'

/**
 * Feed 服务接口
 * 负责订阅源管理、OPML 导入导出、Feed 刷新
 */
export interface IFeedService {
  // 添加订阅源
  addFeed(url: string): Promise<Feed>

  // 删除订阅源
  deleteFeed(feedId: string): Promise<void>

  // 更新订阅源
  updateFeed(
    feedId: string,
    updates: { title?: string; url?: string; refreshIntervalMinutes?: number }
  ): Promise<Feed>

  // 恢复订阅源原始名称
  resetFeedTitle(feedId: string): Promise<Feed>

  // 获取所有订阅源
  getAllFeeds(): Promise<Feed[]>

  // 刷新单个订阅源
  refreshFeed(feedId: string): Promise<Article[]>

  // 刷新所有订阅源
  refreshAllFeeds(): Promise<void>

  // 刷新达到自动刷新时间的订阅源
  refreshDueFeeds(now?: number): Promise<void>

  // 导入 OPML
  importOpml(filePath: string): Promise<OpmlImportResult>

  // 预览 OPML
  previewOpml(filePath: string): Promise<OpmlFeed[]>

  // 导入选中的 OPML Feed
  importOpmlFeeds(feeds: OpmlFeed[]): Promise<OpmlImportResult>

  // 导出 OPML
  exportOpml(filePath: string): Promise<void>
}

/**
 * 文章服务接口
 * 负责文章列表、文章内容、已读状态管理
 */
export interface IArticleService {
  // 获取指定订阅源的文章列表
  getArticlesByFeed(feedId: string): Promise<Article[]>

  // 兼容模块协作文档中的命名
  getEntries(feedId: string): Promise<Article[]>

  // 获取所有文章
  getAllArticles(): Promise<Article[]>

  // 获取未读文章
  getUnreadArticles(): Promise<Article[]>

  // 获取文章详细内容
  getArticleContent(articleId: string): Promise<ArticleContent>

  // 兼容模块协作文档中的命名
  getEntryContent(articleId: string): Promise<ArticleContent>

  // 给 AI 功能使用：如果正文过短则强制重新抓取并清洗网页内容
  getArticleContentForAi(articleId: string): Promise<ArticleContent>
  // 标记文章为已读
  markAsRead(articleId: string): Promise<void>

  // 标记文章为未读
  markAsUnread(articleId: string): Promise<void>

  // 设置文章收藏/星标状态
  setStarred(articleId: string, starred: boolean): void

  // 保存文章阅读滚动位置
  saveScrollPercent(articleId: string, percent: number): void

  // 获取所有收藏文章
  getStarredArticles(): Article[]
}

/**
 * 内容清洗服务接口
 * 负责正文抓取、HTML 清洗、Markdown 转换
 */
export interface ICleaningService {
  clean(rawHtml: string, url: string): Promise<CleanedContent>
}

/**
 * AI 摘要服务接口
 * 负责调用 LLM 生成文章摘要
 */
export interface ISummaryService {
  // 生成文章摘要
  summarize(articleId: string, length?: 'short' | 'medium' | 'long'): Promise<string>
}

/**
 * AI 翻译服务接口
 * 负责调用 LLM 翻译文章
 */
export interface ITranslationService {
  // 翻译文章
  translate(
    articleId: string,
    targetLang: string,
    onProgress?: (
      segment: {
        index: number
        source: string
        translated: string
        status: 'success' | 'failed'
        error?: string
      },
      total: number
    ) => void
  ): Promise<string>
}

/**
 * 标签服务接口
 * 负责标签管理、文章打标签、按标签筛选
 */
export interface ITagService {
  // 获取所有标签
  getAllTags(): Promise<Tag[]>

  // 创建标签
  createTag(name: string): Promise<Tag>

  // 删除标签
  deleteTag(tagId: string): Promise<void>

  // 给文章添加标签
  addTagToArticle(articleId: string, tagName: string): Promise<void>

  // 从文章移除标签
  removeTagFromArticle(articleId: string, tagName: string): Promise<void>

  // 获取文章的所有标签
  getArticleTags(articleId: string): Promise<Tag[]>

  // 按标签筛选文章
  getArticlesByTag(tagName: string): Promise<Article[]>
}

/**
 * 导出服务接口
 * 负责 Markdown 导出
 */
export interface IExportService {
  // 导出单篇文章为 Markdown
  exportArticle(articleId: string, filePath: string): Promise<void>

  // 批量导出文章
  exportArticles(articleIds: string[], dirPath: string): Promise<void>
}

/**
 * 设置服务接口
 * 负责应用设置、LLM 配置管理
 */
export interface ISettingsService {
  // 获取 LLM 配置
  getLLMConfig(): Promise<LLMConfig>

  // 保存 LLM 配置
  saveLLMConfig(config: LLMConfig): Promise<void>

  // 获取应用设置
  getSetting(key: string): Promise<string | null>

  // 保存应用设置
  saveSetting(key: string, value: string): Promise<void>

  // 获取 AI 用量统计
  getUsageStats(): Promise<Array<{ model: string; agentType: string; day: string; requests: number; totalTokens: number }>>
}
