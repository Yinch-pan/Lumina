import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Feed（模块 A 占位，后续替换） ──
  getFeedList: () => ipcRenderer.invoke('get-feed-list'),
  getArticleList: (feedId: string) => ipcRenderer.invoke('get-article-list', feedId),
  getArticleContent: (articleId: string) => ipcRenderer.invoke('get-article-content', articleId),
  addFeed: (url: string) => ipcRenderer.invoke('add-feed', url),
  refreshFeed: (feedId: string) => ipcRenderer.invoke('refresh-feed', feedId),

  // ── AI（模块 C 占位，后续替换） ──
  summarizeArticle: (articleId: string) => ipcRenderer.invoke('summarize-article', articleId),
  translateArticle: (articleId: string, targetLang: string) => ipcRenderer.invoke('translate-article', articleId, targetLang),

  // ── 标签服务 (模块 D) ──
  getAllTags: () => ipcRenderer.invoke('get-all-tags'),
  createTag: (name: string) => ipcRenderer.invoke('create-tag', name),
  deleteTag: (tagId: string) => ipcRenderer.invoke('delete-tag', tagId),
  updateTag: (tagId: string, newName: string) => ipcRenderer.invoke('update-tag', tagId, newName),
  addTagToArticle: (articleId: string, tagName: string) => ipcRenderer.invoke('add-tag-to-article', articleId, tagName),
  removeTagFromArticle: (articleId: string, tagName: string) => ipcRenderer.invoke('remove-tag-from-article', articleId, tagName),
  getArticleTags: (articleId: string) => ipcRenderer.invoke('get-article-tags', articleId),
  getArticlesByTag: (tagName: string) => ipcRenderer.invoke('get-articles-by-tag', tagName),

  // ── 导出服务 (模块 D) ──
  exportMarkdown: (articleId: string, filePath: string) => ipcRenderer.invoke('export-markdown', articleId, filePath),
  exportMultipleMarkdown: (articleIds: string[], dirPath: string) => ipcRenderer.invoke('export-multiple-markdown', articleIds, dirPath),
  showSaveDialog: (options: any) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options: any) => ipcRenderer.invoke('show-open-dialog', options),

  // ── 设置服务 (模块 D) ──
  getLLMConfig: () => ipcRenderer.invoke('get-llm-config'),
  saveLLMConfig: (config: { baseUrl: string; apiKey: string; model: string }) => ipcRenderer.invoke('save-llm-config', config),
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  saveSetting: (key: string, value: string) => ipcRenderer.invoke('save-setting', key, value),
})
