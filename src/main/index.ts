import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import * as path from 'path'
import { initDatabase } from './database/init'
import { Repository } from './database/repository'
import { ArticleService } from './services/ArticleService'
import { CleaningService } from './services/CleaningService'
import { FeedService } from './services/FeedService'
import { OpmlFeed } from './types'

let mainWindow: BrowserWindow | null = null
let feedService: FeedService | null = null
let articleService: ArticleService | null = null
let autoRefreshTimer: NodeJS.Timeout | null = null

const AUTO_REFRESH_CHECK_INTERVAL_MS = 60 * 1000

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: 'hidden',
    frame: false
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
  ipcMain.handle('get-article-content', async (_event, articleId: string) =>
    cloneForIpc(await getArticleService().getArticleContent(articleId))
  )
  ipcMain.handle('mark-article-read', async (_event, articleId: string) =>
    getArticleService().markAsRead(articleId)
  )
  ipcMain.handle('mark-article-unread', async (_event, articleId: string) =>
    getArticleService().markAsUnread(articleId)
  )
}

function initializeServices() {
  const database = initDatabase()
  const repository = new Repository(database)
  const cleaningService = new CleaningService(repository)
  feedService = new FeedService(repository)
  articleService = new ArticleService(repository, cleaningService)
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
