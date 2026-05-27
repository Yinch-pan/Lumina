import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 占位接口，后续模块开发时扩展
  getFeedList: () => ipcRenderer.invoke('get-feed-list'),
  getArticleList: (feedId: string) => ipcRenderer.invoke('get-article-list', feedId),
  getArticleContent: (articleId: string) => ipcRenderer.invoke('get-article-content', articleId),
  addFeed: (url: string) => ipcRenderer.invoke('add-feed', url),
  refreshFeed: (feedId: string) => ipcRenderer.invoke('refresh-feed', feedId),
  summarizeArticle: (articleId: string) => ipcRenderer.invoke('summarize-article', articleId),
  translateArticle: (articleId: string, targetLang: string) => ipcRenderer.invoke('translate-article', articleId, targetLang),
  addTag: (articleId: string, tagName: string) => ipcRenderer.invoke('add-tag', articleId, tagName),
  exportMarkdown: (articleId: string) => ipcRenderer.invoke('export-markdown', articleId)
})
