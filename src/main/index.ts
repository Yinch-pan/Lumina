import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import * as path from 'path'
import { TagService } from './services/TagService'
import { ExportService } from './services/ExportService'
import { SettingsService } from './services/SettingsService'

let mainWindow: BrowserWindow | null = null

// 服务实例
const tagService = new TagService()
const exportService = new ExportService()
const settingsService = new SettingsService()

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: 'hidden',
    frame: false
  })

  if (process.argv.includes('--dev')) {
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

// ───────────────────── 注册 IPC Handlers ─────────────────────

function registerIpcHandlers() {
  // ── 标签服务 ──
  ipcMain.handle('get-all-tags', async () => {
    return await tagService.getAllTags()
  })

  ipcMain.handle('create-tag', async (_event, name: string) => {
    return await tagService.createTag(name)
  })

  ipcMain.handle('delete-tag', async (_event, tagId: string) => {
    return await tagService.deleteTag(tagId)
  })

  ipcMain.handle('update-tag', async (_event, tagId: string, newName: string) => {
    return await tagService.updateTag(tagId, newName)
  })

  ipcMain.handle('add-tag-to-article', async (_event, articleId: string, tagName: string) => {
    return await tagService.addTagToArticle(articleId, tagName)
  })

  ipcMain.handle('remove-tag-from-article', async (_event, articleId: string, tagName: string) => {
    return await tagService.removeTagFromArticle(articleId, tagName)
  })

  ipcMain.handle('get-article-tags', async (_event, articleId: string) => {
    return await tagService.getArticleTags(articleId)
  })

  ipcMain.handle('get-articles-by-tag', async (_event, tagName: string) => {
    return await tagService.getArticlesByTag(tagName)
  })

  // ── 导出服务 ──
  ipcMain.handle('export-markdown', async (_event, articleId: string, filePath: string) => {
    return await exportService.exportArticle(articleId, filePath)
  })

  ipcMain.handle('export-multiple-markdown', async (_event, articleIds: string[], dirPath: string) => {
    return await exportService.exportArticles(articleIds, dirPath)
  })

  ipcMain.handle('show-save-dialog', async (_event, options: Electron.SaveDialogOptions) => {
    if (!mainWindow) return { canceled: true, filePath: '' }
    return await dialog.showSaveDialog(mainWindow, options)
  })

  ipcMain.handle('show-open-dialog', async (_event, options: Electron.OpenDialogOptions) => {
    if (!mainWindow) return { canceled: true, filePaths: [] }
    return await dialog.showOpenDialog(mainWindow, options)
  })

  // ── 设置服务 ──
  ipcMain.handle('get-llm-config', async () => {
    return await settingsService.getLLMConfig()
  })

  ipcMain.handle('save-llm-config', async (_event, config: { baseUrl: string; apiKey: string; model: string }) => {
    return await settingsService.saveLLMConfig(config)
  })

  ipcMain.handle('get-setting', async (_event, key: string) => {
    return await settingsService.getSetting(key)
  })

  ipcMain.handle('save-setting', async (_event, key: string, value: string) => {
    return await settingsService.saveSetting(key, value)
  })
}

// ───────────────────── App Lifecycle ─────────────────────

app.whenReady().then(() => {
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
