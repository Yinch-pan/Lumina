"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // 占位接口，后续模块开发时扩展
    getFeedList: () => electron_1.ipcRenderer.invoke('get-feed-list'),
    getArticleList: (feedId) => electron_1.ipcRenderer.invoke('get-article-list', feedId),
    getArticleContent: (articleId) => electron_1.ipcRenderer.invoke('get-article-content', articleId),
    addFeed: (url) => electron_1.ipcRenderer.invoke('add-feed', url),
    refreshFeed: (feedId) => electron_1.ipcRenderer.invoke('refresh-feed', feedId),
    summarizeArticle: (articleId) => electron_1.ipcRenderer.invoke('summarize-article', articleId),
    translateArticle: (articleId, targetLang) => electron_1.ipcRenderer.invoke('translate-article', articleId, targetLang),
    addTag: (articleId, tagName) => electron_1.ipcRenderer.invoke('add-tag', articleId, tagName),
    exportMarkdown: (articleId) => electron_1.ipcRenderer.invoke('export-markdown', articleId)
});
