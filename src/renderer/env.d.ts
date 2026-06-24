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
      saveScrollPercent: (articleId: string, percent: number) => Promise<void>
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
      onSummaryProgress: (cb: (payload: { articleId: string; chunk: string; done: boolean }) => void) => () => void
      // 模块 D: 标签管理
      getAllTags: () => Promise<Tag[]>
      createTag: (name: string) => Promise<Tag>
      deleteTag: (tagId: string) => Promise<void>
      addTagToArticle: (articleId: string, tagName: string) => Promise<void>
      removeTagFromArticle: (articleId: string, tagName: string) => Promise<void>
      getArticleTags: (articleId: string) => Promise<Tag[]>
      getArticlesByTag: (tagName: string) => Promise<Article[]>
      suggestTags: (articleId: string) => Promise<string[]>

      // 模块 D: Markdown 导出
      selectMarkdownExportPath: (defaultFilename: string) => Promise<string | null>
      exportMarkdown: (articleId: string, filePath: string) => Promise<void>
      exportMarkdownBatch: (articleIds: string[], dirPath: string) => Promise<void>

      // 模块 D: 设置管理
      getLLMConfig: () => Promise<LLMConfig>
      saveLLMConfig: (config: LLMConfig) => Promise<void>
      getSetting: (key: string) => Promise<string | null>
      saveSetting: (key: string, value: string) => Promise<void>
      getUsageStats: () => Promise<Array<{ model: string; agentType: string; day: string; requests: number; totalTokens: number }>>

      // 模块: 划词高亮与笔记
      addHighlight: (input: { entryId: string; selectedText: string; prefixText?: string; suffixText?: string; color: string; note?: string }) => Promise<{ id: string; entryId: string; selectedText: string; prefixText: string | null; suffixText: string | null; color: string; note: string | null; createdAt: number }>
      getHighlights: (entryId: string) => Promise<Array<{ id: string; entryId: string; selectedText: string; prefixText: string | null; suffixText: string | null; color: string; note: string | null; createdAt: number }>>
      updateHighlight: (id: string, fields: { color?: string; note?: string }) => Promise<void>
      deleteHighlight: (id: string) => Promise<void>

      // 在系统默认浏览器中打开外部链接
      openExternal: (url: string) => Promise<void>
    }
  }
}
