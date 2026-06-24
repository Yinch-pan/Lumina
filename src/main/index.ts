import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import * as path from 'path'
import { initDatabase } from './database/init'
import { Repository } from './database/repository'
import { ArticleService } from './services/ArticleService'
import { CleaningService } from './services/CleaningService'
import { ExportService } from './services/ExportService'
import { FeedService } from './services/FeedService'
import { HighlightService } from './services/HighlightService'
import { SettingsService } from './services/SettingsService'
import { SummaryService } from './services/SummaryService'
import { TagService } from './services/TagService'
import { TagSuggestionService } from './services/TagSuggestionService'
import { TranslationService } from './services/TranslationService'
import { encryptSecret, isEncrypted } from './security/secureStore'
import { LLMConfig, OpmlFeed } from './types'

let mainWindow: BrowserWindow | null = null
let feedService: FeedService | null = null
let articleService: ArticleService | null = null
let tagService: TagService | null = null
let exportService: ExportService | null = null
let settingsService: SettingsService | null = null
let summaryService: SummaryService | null = null
let translationService: TranslationService | null = null
let tagSuggestionService: TagSuggestionService | null = null
let highlightService: HighlightService | null = null
let autoRefreshTimer: NodeJS.Timeout | null = null

const AUTO_REFRESH_CHECK_INTERVAL_MS = 60 * 1000

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'Mercury',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true
    }
  })

  if (process.argv.includes('--dev')) {
    // 尝试多个端口，Vite 可能会自动切换端口
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    mainWindow.loadURL(devUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerIpcHandlers() {
  ipcMain.handle('get-feed-list', async () => cloneForIpc(await getFeedService().getAllFeeds()))
  ipcMain.handle('add-feed', async (_event, url: string) => cloneForIpc(await getFeedService().addFeed(url)))
  ipcMain.handle(
    'update-feed',
    async (_event, feedId: string, updates: { title?: string; url?: string; refreshIntervalMinutes?: number }) =>
      cloneForIpc(await getFeedService().updateFeed(feedId, updates))
  )
  ipcMain.handle('reset-feed-title', async (_event, feedId: string) =>
    cloneForIpc(await getFeedService().resetFeedTitle(feedId))
  )
  ipcMain.handle('delete-feed', async (_event, feedId: string) => getFeedService().deleteFeed(feedId))
  ipcMain.handle('refresh-feed', async (_event, feedId: string) =>
    cloneForIpc(await getFeedService().refreshFeed(feedId))
  )
  ipcMain.handle('refresh-all-feeds', async () => getFeedService().refreshAllFeeds())
  ipcMain.handle('select-opml-file', async () => {
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, {
          title: '选择 OPML 文件',
          properties: ['openFile'],
          filters: [{ name: 'OPML', extensions: ['opml', 'xml'] }]
        })
      : await dialog.showOpenDialog({
          title: '选择 OPML 文件',
          properties: ['openFile'],
          filters: [{ name: 'OPML', extensions: ['opml', 'xml'] }]
        })

    return result.canceled ? null : result.filePaths[0] ?? null
  })
  ipcMain.handle('select-opml-export-path', async () => {
    const result = mainWindow
      ? await dialog.showSaveDialog(mainWindow, {
          title: '导出 OPML',
          defaultPath: 'mercury-subscriptions.opml',
          filters: [{ name: 'OPML', extensions: ['opml'] }]
        })
      : await dialog.showSaveDialog({
          title: '导出 OPML',
          defaultPath: 'mercury-subscriptions.opml',
          filters: [{ name: 'OPML', extensions: ['opml'] }]
        })

    return result.canceled ? null : result.filePath ?? null
  })
  ipcMain.handle('preview-opml', async (_event, filePath: string) =>
    cloneForIpc(await getFeedService().previewOpml(filePath))
  )
  ipcMain.handle('import-opml', async (_event, filePath: string) =>
    cloneForIpc(await getFeedService().importOpml(filePath))
  )
  ipcMain.handle('import-opml-feeds', async (_event, feeds: OpmlFeed[]) =>
    cloneForIpc(await getFeedService().importOpmlFeeds(normalizeOpmlFeedsForIpc(feeds)))
  )
  ipcMain.handle('export-opml', async (_event, filePath: string) => getFeedService().exportOpml(filePath))

  ipcMain.handle('get-article-list', async (_event, feedId: string) => {
    if (feedId) {
      return cloneForIpc(await getArticleService().getArticlesByFeed(feedId))
    }
    return cloneForIpc(await getArticleService().getAllArticles())
  })
  ipcMain.handle('get-all-articles', async () => cloneForIpc(await getArticleService().getAllArticles()))
  ipcMain.handle('get-unread-articles', async () => cloneForIpc(await getArticleService().getUnreadArticles()))
  ipcMain.handle('search-articles', async (_event, query: string) =>
    cloneForIpc(getArticleService().searchArticles(query))
  )
  ipcMain.handle('get-article-content', async (_event, articleId: string) =>
    cloneForIpc(await getArticleService().getArticleContent(articleId))
  )
  ipcMain.handle('mark-article-read', async (_event, articleId: string) =>
    getArticleService().markAsRead(articleId)
  )
  ipcMain.handle('mark-article-unread', async (_event, articleId: string) =>
    getArticleService().markAsUnread(articleId)
  )
  ipcMain.handle('set-article-starred', async (_event, articleId: string, starred: boolean) =>
    getArticleService().setStarred(articleId, starred)
  )
  ipcMain.handle('save-scroll-percent', async (_event, articleId: string, percent: number) =>
    getArticleService().saveScrollPercent(articleId, percent)
  )
  ipcMain.handle('get-starred-articles', async () =>
    cloneForIpc(getArticleService().getStarredArticles())
  )

  // 模块 D: 标签管理
  ipcMain.handle('get-all-tags', async () => cloneForIpc(await getTagService().getAllTags()))
  ipcMain.handle('create-tag', async (_event, name: string) => cloneForIpc(await getTagService().createTag(name)))
  ipcMain.handle('delete-tag', async (_event, tagId: string) => getTagService().deleteTag(tagId))
  ipcMain.handle('add-tag-to-article', async (_event, articleId: string, tagName: string) =>
    getTagService().addTagToArticle(articleId, tagName)
  )
  ipcMain.handle('remove-tag-from-article', async (_event, articleId: string, tagName: string) =>
    getTagService().removeTagFromArticle(articleId, tagName)
  )
  ipcMain.handle('get-article-tags', async (_event, articleId: string) =>
    cloneForIpc(await getTagService().getArticleTags(articleId))
  )
  ipcMain.handle('get-articles-by-tag', async (_event, tagName: string) =>
    cloneForIpc(await getTagService().getArticlesByTag(tagName))
  )
  ipcMain.handle('suggest-tags', async (_event, articleId: string) =>
    cloneForIpc(await getTagSuggestionService().suggestTags(articleId))
  )

  // 模块 D: Markdown 导出
  ipcMain.handle('select-markdown-export-path', async (_event, defaultFilename: string) => {
    const result = mainWindow
      ? await dialog.showSaveDialog(mainWindow, {
        title: '导出 Markdown',
          defaultPath: defaultFilename,
          filters: [{ name: 'Markdown', extensions: ['md'] }]
        })
      : await dialog.showSaveDialog({
          title: '导出 Markdown',
          defaultPath: defaultFilename,
          filters: [{ name: 'Markdown', extensions: ['md'] }]
        })

    return result.canceled ? null : result.filePath ?? null
  })
  ipcMain.handle('export-markdown', async (_event, articleId: string, filePath: string) =>
    getExportService().exportArticle(articleId, filePath)
  )
  ipcMain.handle('export-markdown-batch', async (_event, articleIds: string[], dirPath: string) =>
    getExportService().exportArticles(articleIds, dirPath)
  )

  // 模块 D: 设置管理
  ipcMain.handle('get-llm-config', async () => cloneForIpc(await getSettingsService().getLLMConfig()))
  ipcMain.handle('save-llm-config', async (_event, config: LLMConfig) =>
    getSettingsService().saveLLMConfig(config)
  )
  ipcMain.handle('get-setting', async (_event, key: string) => getSettingsService().getSetting(key))
  ipcMain.handle('save-setting', async (_event, key: string, value: string) =>
    getSettingsService().saveSetting(key, value)
  )
  ipcMain.handle('get-usage-stats', async () => cloneForIpc(await getSettingsService().getUsageStats()))

  // 模块 C: AI 功能
  ipcMain.handle('clean-article', async (_event, articleId: string) =>
    cloneForIpc(await getArticleService().getArticleContent(articleId))
  )
  ipcMain.handle('summarize-article', async (_event, articleId: string, length?: 'short' | 'medium' | 'long') =>
    cloneForIpc(
      await getSummaryService()
        .summarizeStream(articleId, length, (chunk) => {
          mainWindow?.webContents.send('summary-progress', { articleId, chunk, done: false })
        })
        .then((full) => {
          mainWindow?.webContents.send('summary-progress', { articleId, chunk: '', done: true })
          return full
        })
    )
  )
  ipcMain.handle('translate-article', async (_event, articleId: string, targetLang: string) =>
    cloneForIpc(await getTranslationService().translate(articleId, targetLang, (segment, total) => {
      mainWindow?.webContents.send('translate-progress', { articleId, total, ...segment })
    }))
  )

  // 模块: 划词高亮与笔记
  ipcMain.handle('add-highlight', async (_event, input: { entryId: string; selectedText: string; prefixText?: string; suffixText?: string; color: string; note?: string }) =>
    cloneForIpc(getHighlightService().add(input)))
  ipcMain.handle('get-highlights', async (_event, entryId: string) =>
    cloneForIpc(getHighlightService().list(entryId)))
  ipcMain.handle('update-highlight', async (_event, id: string, fields: { color?: string; note?: string }) =>
    getHighlightService().update(id, fields))
  ipcMain.handle('delete-highlight', async (_event, id: string) =>
    getHighlightService().remove(id))
  ipcMain.handle('open-external-url', async (_event, url: string) => {
    let parsed: URL
    try {
      parsed = new URL(String(url))
    } catch {
      throw new Error('无效的链接')
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('仅支持打开 http/https 链接')
    }
    await shell.openExternal(parsed.toString())
  })
}

function initializeServices() {
  const database = initDatabase()
  const repository = new Repository(database)
  const cleaningService = new CleaningService()
  feedService = new FeedService(repository)
  articleService = new ArticleService(repository, cleaningService)
  tagService = new TagService(repository)
  exportService = new ExportService(repository, articleService)
  settingsService = new SettingsService(repository)
  migratePlaintextApiKey(repository)
  summaryService = new SummaryService(repository, () => getSettingsService().getLLMConfig())
  translationService = new TranslationService(repository, () => getSettingsService().getLLMConfig())
  tagSuggestionService = new TagSuggestionService(repository, () => getSettingsService().getLLMConfig())
  highlightService = new HighlightService(repository)
  startAutoRefreshScheduler()
}

function migratePlaintextApiKey(repository: Repository): void {
  const stored = repository.getSetting('llm.apiKey')
  if (stored && !isEncrypted(stored)) {
    const encrypted = encryptSecret(stored)
    // 仅当真正加密成功(safeStorage 可用)时才回写，避免不可用时每次启动重复写入明文。
    if (isEncrypted(encrypted)) {
      repository.setSetting('llm.apiKey', encrypted)
    }
  }
}

function getFeedService(): FeedService {
  if (!feedService) {
    throw new Error('FeedService is not initialized')
  }
  return feedService
}

function getArticleService(): ArticleService {
  if (!articleService) {
    throw new Error('ArticleService is not initialized')
  }
  return articleService
}
function getTagService(): TagService {
  if (!tagService) {
    throw new Error('TagService is not initialized')
  }
  return tagService
}

function getExportService(): ExportService {
  if (!exportService) {
    throw new Error('ExportService is not initialized')
  }
  return exportService
}

function getSettingsService(): SettingsService {
  if (!settingsService) {
    throw new Error('SettingsService is not initialized')
  }
  return settingsService
}

function getSummaryService(): SummaryService {
  if (!summaryService) {
    throw new Error('SummaryService is not initialized')
  }
  return summaryService
}

function getTranslationService(): TranslationService {
  if (!translationService) {
    throw new Error('TranslationService is not initialized')
  }
  return translationService
}

function getTagSuggestionService(): TagSuggestionService {
  if (!tagSuggestionService) {
    throw new Error('TagSuggestionService is not initialized')
  }
  return tagSuggestionService
}

function getHighlightService(): HighlightService {
  if (!highlightService) {
    throw new Error('HighlightService is not initialized')
  }
  return highlightService
}

function cloneForIpc<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function normalizeOpmlFeedsForIpc(feeds: OpmlFeed[]): OpmlFeed[] {
  if (!Array.isArray(feeds)) {
    throw new Error('OPML 导入数据格式错误')
  }

  return feeds
    .map((feed) => ({
      title: String(feed.title || feed.url || '').trim(),
      url: String(feed.url || '').trim()
    }))
    .filter((feed) => feed.url)
}

function startAutoRefreshScheduler(): void {
  stopAutoRefreshScheduler()
  autoRefreshTimer = setInterval(() => {
    void getFeedService().refreshDueFeeds().catch((error) => {
      console.error('Auto refresh scheduler failed:', error)
    })
  }, AUTO_REFRESH_CHECK_INTERVAL_MS)
}

function stopAutoRefreshScheduler(): void {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
}

app.whenReady().then(() => {
  initializeServices()
  registerIpcHandlers()
  createWindow()

  // 拦截 <webview> 内的弹窗 / target=_blank：不开新窗口，转交系统浏览器
  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() !== 'webview') return
    contents.setWindowOpenHandler(({ url }) => {
      try {
        const parsed = new URL(url)
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          void shell.openExternal(parsed.toString())
        }
      } catch {
        // 忽略无效 URL
      }
      return { action: 'deny' }
    })
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopAutoRefreshScheduler()
})
