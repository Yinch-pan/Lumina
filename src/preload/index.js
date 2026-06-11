"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // 占位接口，后续模块开发时扩展
    getFeedList: () => electron_1.ipcRenderer.invoke('get-feed-list'),
    getArticleList: (feedId) => electron_1.ipcRenderer.invoke('get-article-list', feedId),
    getAllArticles: () => electron_1.ipcRenderer.invoke('get-all-articles'),
    getUnreadArticles: () => electron_1.ipcRenderer.invoke('get-unread-articles'),
    getArticleContent: (articleId) => electron_1.ipcRenderer.invoke('get-article-content', articleId),
    addFeed: (url) => electron_1.ipcRenderer.invoke('add-feed', url),
    updateFeed: (feedId, updates) => electron_1.ipcRenderer.invoke('update-feed', feedId, updates),
    resetFeedTitle: (feedId) => electron_1.ipcRenderer.invoke('reset-feed-title', feedId),
    deleteFeed: (feedId) => electron_1.ipcRenderer.invoke('delete-feed', feedId),
    refreshFeed: (feedId) => electron_1.ipcRenderer.invoke('refresh-feed', feedId),
    refreshAllFeeds: () => electron_1.ipcRenderer.invoke('refresh-all-feeds'),
    selectOpmlFile: () => electron_1.ipcRenderer.invoke('select-opml-file'),
    selectOpmlExportPath: () => electron_1.ipcRenderer.invoke('select-opml-export-path'),
    previewOpml: (filePath) => electron_1.ipcRenderer.invoke('preview-opml', filePath),
    getPathForFile: (file) => electron_1.webUtils.getPathForFile(file),
    importOpml: (filePath) => electron_1.ipcRenderer.invoke('import-opml', filePath),
    importOpmlFeeds: (feeds) => electron_1.ipcRenderer.invoke('import-opml-feeds', feeds.map((feed) => ({ title: String(feed.title || feed.url), url: String(feed.url) }))),
    exportOpml: (filePath) => electron_1.ipcRenderer.invoke('export-opml', filePath),
    markArticleRead: (articleId) => electron_1.ipcRenderer.invoke('mark-article-read', articleId),
    markArticleUnread: (articleId) => electron_1.ipcRenderer.invoke('mark-article-unread', articleId),
    // 模块 C: AI 摘要与翻译
    cleanArticle: (articleId) => electron_1.ipcRenderer.invoke('clean-article', articleId),
    summarizeArticle: (articleId) => electron_1.ipcRenderer.invoke('summarize-article', articleId),
    translateArticle: (articleId, targetLang) => electron_1.ipcRenderer.invoke('translate-article', articleId, targetLang),
    // 模块 D: 标签管理
    getAllTags: () => electron_1.ipcRenderer.invoke('get-all-tags'),
    createTag: (name) => electron_1.ipcRenderer.invoke('create-tag', name),
    deleteTag: (tagId) => electron_1.ipcRenderer.invoke('delete-tag', tagId),
    addTagToArticle: (articleId, tagName) => electron_1.ipcRenderer.invoke('add-tag-to-article', articleId, tagName),
    removeTagFromArticle: (articleId, tagName) => electron_1.ipcRenderer.invoke('remove-tag-from-article', articleId, tagName),
    getArticleTags: (articleId) => electron_1.ipcRenderer.invoke('get-article-tags', articleId),
    getArticlesByTag: (tagName) => electron_1.ipcRenderer.invoke('get-articles-by-tag', tagName),
    // 模块 D: Markdown 导出
    selectMarkdownExportPath: (defaultFilename) => electron_1.ipcRenderer.invoke('select-markdown-export-path', defaultFilename),
    exportMarkdown: (articleId, filePath) => electron_1.ipcRenderer.invoke('export-markdown', articleId, filePath),
    exportMarkdownBatch: (articleIds, dirPath) => electron_1.ipcRenderer.invoke('export-markdown-batch', articleIds, dirPath),
    // 模块 D: 设置管理
    getLLMConfig: () => electron_1.ipcRenderer.invoke('get-llm-config'),
    saveLLMConfig: (config) => electron_1.ipcRenderer.invoke('save-llm-config', config),
    getSetting: (key) => electron_1.ipcRenderer.invoke('get-setting', key),
    saveSetting: (key, value) => electron_1.ipcRenderer.invoke('save-setting', key, value)
});
