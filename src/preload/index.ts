import { contextBridge, ipcRenderer, webUtils } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getFeedList: () => ipcRenderer.invoke('get-feed-list'),
  getArticleList: (feedId: string) => ipcRenderer.invoke('get-article-list', feedId),
  getAllArticles: () => ipcRenderer.invoke('get-all-articles'),
  getUnreadArticles: () => ipcRenderer.invoke('get-unread-articles'),
  getArticleContent: (articleId: string) => ipcRenderer.invoke('get-article-content', articleId),
  addFeed: (url: string) => ipcRenderer.invoke('add-feed', url),
  updateFeed: (feedId: string, updates: { title?: string; url?: string; refreshIntervalMinutes?: number }) =>
    ipcRenderer.invoke('update-feed', feedId, updates),
  resetFeedTitle: (feedId: string) => ipcRenderer.invoke('reset-feed-title', feedId),
  deleteFeed: (feedId: string) => ipcRenderer.invoke('delete-feed', feedId),
  refreshFeed: (feedId: string) => ipcRenderer.invoke('refresh-feed', feedId),
  refreshAllFeeds: () => ipcRenderer.invoke('refresh-all-feeds'),
  selectOpmlFile: () => ipcRenderer.invoke('select-opml-file'),
  selectOpmlExportPath: () => ipcRenderer.invoke('select-opml-export-path'),
  previewOpml: (filePath: string) => ipcRenderer.invoke('preview-opml', filePath),
  getPathForFile: (file: Parameters<typeof webUtils.getPathForFile>[0]) => webUtils.getPathForFile(file),
  importOpml: (filePath: string) => ipcRenderer.invoke('import-opml', filePath),
  importOpmlFeeds: (feeds: Array<{ title: string; url: string }>) =>
    ipcRenderer.invoke(
      'import-opml-feeds',
      feeds.map((feed) => ({
        title: String(feed.title || feed.url),
        url: String(feed.url)
      }))
    ),
  exportOpml: (filePath: string) => ipcRenderer.invoke('export-opml', filePath),
  markArticleRead: (articleId: string) => ipcRenderer.invoke('mark-article-read', articleId),
  markArticleUnread: (articleId: string) => ipcRenderer.invoke('mark-article-unread', articleId),
  setArticleStarred: (articleId: string, starred: boolean) =>
    ipcRenderer.invoke('set-article-starred', articleId, starred),
  saveScrollPercent: (articleId: string, percent: number) =>
    ipcRenderer.invoke('save-scroll-percent', articleId, percent),
  getStarredArticles: () => ipcRenderer.invoke('get-starred-articles'),
  searchArticles: (query: string) => ipcRenderer.invoke('search-articles', query),

  // 模块 C: AI 摘要与翻译
  cleanArticle: (articleId: string) => ipcRenderer.invoke('clean-article', articleId),
  summarizeArticle: (articleId: string, length?: 'short' | 'medium' | 'long') =>
    ipcRenderer.invoke('summarize-article', articleId, length),
  translateArticle: (articleId: string, targetLang: string) =>
    ipcRenderer.invoke('translate-article', articleId, targetLang),
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
  ) => {
    const listener = (
      _e: unknown,
      payload: {
        articleId: string
        index: number
        total: number
        source: string
        translated: string
        status: 'success' | 'failed'
        error?: string
      }
    ) => cb(payload)
    ipcRenderer.on('translate-progress', listener)
    return () => ipcRenderer.removeListener('translate-progress', listener)
  },
  onSummaryProgress: (cb: (payload: { articleId: string; chunk: string; done: boolean }) => void) => {
    const listener = (_e: unknown, payload: { articleId: string; chunk: string; done: boolean }) => cb(payload)
    ipcRenderer.on('summary-progress', listener)
    return () => ipcRenderer.removeListener('summary-progress', listener)
  },

  // 模块 D: 标签管理
  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
  createTag: (name: string) => ipcRenderer.invoke('create-tag', name),
  deleteTag: (tagId: string) => ipcRenderer.invoke('delete-tag', tagId),
  addTagToArticle: (articleId: string, tagName: string) =>
    ipcRenderer.invoke('add-tag-to-article', articleId, tagName),
  removeTagFromArticle: (articleId: string, tagName: string) =>
    ipcRenderer.invoke('remove-tag-from-article', articleId, tagName),
  getArticleTags: (articleId: string) => ipcRenderer.invoke('get-article-tags', articleId),
  getArticlesByTag: (tagName: string) => ipcRenderer.invoke('get-articles-by-tag', tagName),
  suggestTags: (articleId: string) => ipcRenderer.invoke('suggest-tags', articleId),

  // 模块 D: Markdown 导出
  selectMarkdownExportPath: (defaultFilename: string) =>
    ipcRenderer.invoke('select-markdown-export-path', defaultFilename),
  exportMarkdown: (articleId: string, filePath: string) =>
    ipcRenderer.invoke('export-markdown', articleId, filePath),
  exportMarkdownBatch: (articleIds: string[], dirPath: string) =>
    ipcRenderer.invoke('export-markdown-batch', articleIds, dirPath),

  // 模块 D: 设置管理
  getLLMConfig: () => ipcRenderer.invoke('get-llm-config'),
  saveLLMConfig: (config: { baseUrl?: string; apiKey?: string; model?: string }) =>
    ipcRenderer.invoke('save-llm-config', config),
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  saveSetting: (key: string, value: string) => ipcRenderer.invoke('save-setting', key, value),
  getUsageStats: () => ipcRenderer.invoke('get-usage-stats'),

  // 模块: 划词高亮与笔记
  addHighlight: (input: { entryId: string; selectedText: string; prefixText?: string; suffixText?: string; color: string; note?: string }) => ipcRenderer.invoke('add-highlight', input),
  getHighlights: (entryId: string) => ipcRenderer.invoke('get-highlights', entryId),
  updateHighlight: (id: string, fields: { color?: string; note?: string }) => ipcRenderer.invoke('update-highlight', id, fields),
  deleteHighlight: (id: string) => ipcRenderer.invoke('delete-highlight', id),

  // 在系统默认浏览器中打开外部链接
  openExternal: (url: string) => ipcRenderer.invoke('open-external-url', url)
})
