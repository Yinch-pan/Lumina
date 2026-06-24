import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import * as path from 'path'
import { initDatabase } from './database/init'
import { Repository } from './database/repository'
import { ArticleService } from './services/ArticleService'
import { CleaningService } from './services/CleaningService'
import { ExportService } from './services/ExportService'
import { FeedService } from './services/FeedService'
import { SettingsService } from './services/SettingsService'
import { SummaryService } from './services/SummaryService'
import { TagService } from './services/TagService'
import { TranslationService } from './services/TranslationService'
import { LLMConfig, OpmlFeed } from './types'

let mainWindow: BrowserWindow | null = null
let feedService: FeedService | null = null
let articleService: ArticleService | null = null
let tagService: TagService | null = null
let exportService: ExportService | null = null
let settingsService: SettingsService | null = null
let summaryService: SummaryService | null = null
let translationService: TranslationService | null = null
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
      contextIsolation: true
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

  // 模块 C: AI 功能
  ipcMain.handle('clean-article', async (_event, articleId: string) =>
    cloneForIpc(await getArticleService().getArticleContent(articleId))
  )
  ipcMain.handle('summarize-article', async (_event, articleId: string) =>
    cloneForIpc(await getSummaryService().summarize(articleId))
  )
  ipcMain.handle('translate-article', async (_event, articleId: string, targetLang: string) =>
    cloneForIpc(await getTranslationService().translate(articleId, targetLang))
  )
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
  summaryService = new SummaryService(repository, () => getSettingsService().getLLMConfig())
  translationService = new TranslationService(repository, () => getSettingsService().getLLMConfig())
  startAutoRefreshScheduler()
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
