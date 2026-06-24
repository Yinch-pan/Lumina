import type { Article, ArticleContent, Feed, LLMConfig, OpmlFeed, OpmlImportResult, Tag } from '../main/types'

export {}

declare global {
  interface Window {
    electronAPI?: {
      getFeedList: () => Promise<Feed[]>
      getArticleList: (feedId: string) => Promise<Article[]>
      getAllArticles: () => Promise<Article[]>
      getUnreadArticles: () => Promise<Article[]>
      getArticleContent: (articleId: string) => Promise<ArticleContent>
      addFeed: (url: string) => Promise<Feed>
      updateFeed: (
        feedId: string,
        updates: { title?: string; url?: string; refreshIntervalMinutes?: number }
      ) => Promise<Feed>
      resetFeedTitle: (feedId: string) => Promise<Feed>
      deleteFeed: (feedId: string) => Promise<void>
      refreshFeed: (feedId: string) => Promise<Article[]>
      refreshAllFeeds: () => Promise<void>
      selectOpmlFile: () => Promise<string | null>
      selectOpmlExportPath: () => Promise<string | null>
      previewOpml: (filePath: string) => Promise<OpmlFeed[]>
      getPathForFile: (file: File) => string
      importOpml: (filePath: string) => Promise<OpmlImportResult>
      importOpmlFeeds: (feeds: OpmlFeed[]) => Promise<OpmlImportResult>
      exportOpml: (filePath: string) => Promise<void>
      markArticleRead: (articleId: string) => Promise<void>
      markArticleUnread: (articleId: string) => Promise<void>
      setArticleStarred: (articleId: string, starred: boolean) => Promise<void>
      getStarredArticles: () => Promise<Article[]>
      searchArticles: (query: string) => Promise<Article[]>

      // 模块 C: AI 功能
      cleanArticle: (articleId: string) => Promise<ArticleContent>
      summarizeArticle: (articleId: string, length?: 'short' | 'medium' | 'long') => Promise<string>
      translateArticle: (articleId: string, targetLang: string) => Promise<string>
      onTranslateProgress: (
        cb: (payload: {
          articleId: string
          index: number
          total: number
          source: string
          translated: string
          status: 'success' | 'failed'
          error?: string
        }) => void
      ) => () => void

      // 模块 D: 标签管理
      getAllTags: () => Promise<Tag[]>
      createTag: (name: string) => Promise<Tag>
      deleteTag: (tagId: string) => Promise<void>
      addTagToArticle: (articleId: string, tagName: string) => Promise<void>
      removeTagFromArticle: (articleId: string, tagName: string) => Promise<void>
      getArticleTags: (articleId: string) => Promise<Tag[]>
      getArticlesByTag: (tagName: string) => Promise<Article[]>

      // 模块 D: Markdown 导出
      selectMarkdownExportPath: (defaultFilename: string) => Promise<string | null>
      exportMarkdown: (articleId: string, filePath: string) => Promise<void>
      exportMarkdownBatch: (articleIds: string[], dirPath: string) => Promise<void>

      // 模块 D: 设置管理
      getLLMConfig: () => Promise<LLMConfig>
      saveLLMConfig: (config: LLMConfig) => Promise<void>
      getSetting: (key: string) => Promise<string | null>
      saveSetting: (key: string, value: string) => Promise<void>
    }
  }
}
