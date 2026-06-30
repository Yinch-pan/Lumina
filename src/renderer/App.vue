<template>
  <div class="app-container">
    <TitleBar @open-settings="showSettings = true" />
    <div class="main-content">
      <FeedSidebar
        :feeds="feeds"
        :selectedFeedId="selectedFeedId"
        :tags="tags"
        :selectedTag="selectedTag"
        :isRefreshing="isRefreshing"
        @select-feed="handleSelectFeed"
        @select-tag="handleSelectTag"
        @add-feed="handleAddFeed"
        @edit-feed="handleEditFeed"
        @import-opml="openOpmlDialog"
        @export-opml="handleExportOpml"
        @refresh="handleRefresh"
      />
      <ArticleList
        :articles="articles"
        :selectedArticleId="selectedArticleId"
        :filter="articleFilter"
        :isLoading="isLoadingArticles"
        :searchQuery="searchQuery"
        @select-article="handleSelectArticle"
        @change-filter="articleFilter = $event"
        @search="handleSearch"
        @toggle-star="handleToggleStar"
      />
      <ReaderView
        :article="selectedArticle"
        :translationSegments="translationSegments"
        :highlights="highlights"
        :summaryStreaming="summaryStreaming"
        :hasPrev="hasPrev"
        :hasNext="hasNext"
        @navigate="handleNavigate"
        @summarize="handleSummarize"
        @translate="handleTranslate"
        @add-tag="handleAddTag"
        @mark-unread="handleMarkUnread"
        @toggle-star="handleReaderToggleStar"
        @export="handleExport"
        @scroll="handleSaveScroll"
        @add-highlight="handleAddHighlight"
        @delete-highlight="handleDeleteHighlight"
        @reading-setting="handleReadingSetting"
      />
    </div>

    <!-- 设置页面 -->
    <SettingsView v-if="showSettings" @close="showSettings = false" />
    <AddSubscriptionDialog
      v-if="showAddSubscription"
      :isLoading="isAddingFeed"
      :error="feedDialogError"
      @close="closeAddSubscription"
      @submit="submitAddFeed"
    />
    <EditSubscriptionDialog
      v-if="editingFeed"
      :feed="editingFeed"
      :isLoading="isEditingFeed"
      :error="editDialogError"
      @close="closeEditSubscription"
      @submit="submitEditFeed"
      @reset-title="resetEditingFeedTitle"
      @delete="deleteEditingFeed"
    />
    <OpmlImportDialog
      v-if="showOpmlDialog"
      :filePath="opmlFilePath"
      :feeds="opmlPreviewFeeds"
      :progress="opmlImportProgress"
    :isLoading="isImportingOpml"
  :error="opmlDialogError"
      @close="closeOpmlDialog"
      @select-file="selectOpmlFile"
      @file-dropped="previewDroppedOpmlFile"
      @import="importSelectedOpmlFeeds"
    />
    <TagDialog
      v-if="showTagDialog"
      :articleId="selectedArticleId"
      @close="showTagDialog = false"
      @confirm="handleTagConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import TitleBar from './components/TitleBar.vue'
import FeedSidebar from './components/FeedSidebar.vue'
import ArticleList from './components/ArticleList.vue'
import ReaderView from './components/ReaderView.vue'
import SettingsView from './components/SettingsView.vue'
import AddSubscriptionDialog from './components/AddSubscriptionDialog.vue'
import EditSubscriptionDialog from './components/EditSubscriptionDialog.vue'
import OpmlImportDialog from './components/OpmlImportDialog.vue'
import TagDialog from './components/TagDialog.vue'
import type { Article, ArticleContent, Feed, OpmlFeed, Tag } from '../main/types'
import type { ArticleFilter } from './components/ArticleList.vue'

type OpmlImportProgressItem = {
  title: string
  url: string
  status: 'pending' | 'importing' | 'success' | 'failed'
  message?: string
}

// Mock 数据
const mockFeeds: Feed[] = [
  { id: '1', title: 'Hacker News', sourceTitle: 'Hacker News', url: 'news.ycombinator.com', unreadCount: 12 },
  { id: '2', title: '阮一峰的网络日志', sourceTitle: '阮一峰的网络日志', url: 'ruanyifeng.com/blog', unreadCount: 5 },
  { id: '3', title: '少数派', sourceTitle: '少数派', url: 'sspai.com', unreadCount: 8 }
]

const feeds = ref<Feed[]>(mockFeeds)

const tags = ref<Tag[]>([
  { id: '1', name: '全部', count: 25 },
  { id: '2', name: '技术', count: 12 },
  { id: '3', name: '设计', count: 8 },
  { id: '4', name: '产品', count: 5 }
])

const mockArticles: Article[] = [
  {
    id: '1',
    feedId: '1',
    title: 'Show HN: I built a RSS reader with AI features',
    author: 'johndoe',
    publishedAt: '2024-05-27 10:30',
    excerpt: 'I spent the last few months building Mercury, a cross-platform RSS reader with AI-powered summarization and translation...',
    isRead: false,
    tags: ['技术', '产品']
  },
  {
    id: '2',
    feedId: '1',
    title: 'The Future of Web Development',
    author: 'janedoe',
    publishedAt: '2024-05-27 09:15',
    excerpt: 'Web development is evolving rapidly. In this article, we explore the latest trends and technologies shaping the future...',
    isRead: true,
    tags: ['技术']
  },
  {
    id: '3',
    feedId: '1',
    title: 'Understanding TypeScript Generics',
    author: 'developer',
    publishedAt: '2024-05-26 18:45',
    excerpt: 'TypeScript generics can be confusing at first, but they are incredibly powerful. Let\'s break them down step by step...',
    isRead: false,
    tags: ['技术']
  }
]

const mockArticleContent: ArticleContent = {
  id: '1',
  title: 'Show HN: I built a RSS reader with AI features',
  author: 'johndoe',
  publishedAt: '2024-05-27 10:30',
  sourceUrl: 'https://news.ycombinator.com/item?id=123456',
  cleanedHtml: `
    <h2>Introduction</h2>
    <p>Mercury is a cross-platform, local-first RSS reader with AI-powered features. It helps you stay organized and get more value from your reading.</p>
    <h2>Key Features</h2>
    <p>The app includes several innovative features:</p>
  <ul>
      <li>AI-powered article summarization</li>
      <li>Automatic translation to multiple languages</li>
   <li>Smart tagging system</li>
      <li>Markdown export for note-taking</li>
    </ul>
    <h2>Technical Stack</h2>
    <p>Built with Electron, Vue3, and TypeScript, Mercury runs on Windows, macOS, and Linux. All data is stored locally using SQLite.</p>
  `,
  summary: '',
  translation: '',
  tags: ['技术', '产品']
}

const selectedFeedId = ref('1')
const selectedTag = ref('全部')
const selectedArticleId = ref('1')
const selectedArticleContent = ref<ArticleContent | null>(mockArticleContent)
const translationSegments = ref<
  Array<{ index: number; source: string; translated: string; status: 'success' | 'failed' }>
>([])
const highlights = ref<
  Array<{
    id: string
    entryId: string
    selectedText: string
    prefixText: string | null
    suffixText: string | null
    color: string
    note: string | null
    createdAt: number
  }>
>([])
let activeTranslationRequest: { articleId: string; targetLang: string } | null = null
const summaryStreaming = ref(false)
let unsubscribeSummary: (() => void) | null = null
const articleList = ref<Article[]>(mockArticles)
const showSettings = ref(false)
const showTagDialog = ref(false)
const useMockData = ref(true)
const articleFilter = ref<ArticleFilter>('all')
const isLoadingArticles = ref(false)
const isRefreshing = ref(false)
const showAddSubscription = ref(false)
const isAddingFeed = ref(false)
const feedDialogError = ref('')
const editingFeed = ref<Feed | null>(null)
const isEditingFeed = ref(false)
const editDialogError = ref('')
const showOpmlDialog = ref(false)
const isImportingOpml = ref(false)
const opmlDialogError = ref('')
const opmlFilePath = ref('')
const opmlPreviewFeeds = ref<OpmlFeed[]>([])
const opmlImportProgress = ref<OpmlImportProgressItem[]>([])

const articles = computed(() => {
  let filteredArticles = articleList.value

  if (selectedTag.value !== '全部') {
    filteredArticles = filteredArticles.filter((article) => article.tags.includes(selectedTag.value))
  }

  if (articleFilter.value === 'unread') {
    return filteredArticles.filter((article) => !article.isRead)
  }

  if (articleFilter.value === 'read') {
    return filteredArticles.filter((article) => article.isRead)
  }

  if (articleFilter.value === 'starred') {
    return filteredArticles.filter((article) => article.isStarred)
  }

  return filteredArticles
})

const selectedArticle = computed(() => {
  return selectedArticleContent.value
})

onMounted(() => {
  void loadFeeds()
  void loadTags()
  void applyReadingSettings()

  if (window.electronAPI?.onTranslateProgress) {
    unsubscribeTranslate = window.electronAPI.onTranslateProgress((payload) => {
      if (
        payload.articleId !== selectedArticleId.value ||
        !activeTranslationRequest ||
        payload.articleId !== activeTranslationRequest.articleId
      ) {
        return
      }
      const seg = {
        index: payload.index,
        source: payload.source,
        translated: payload.translated,
        status: payload.status
      }
      const existing = translationSegments.value.findIndex((s) => s.index === payload.index)
      if (existing >= 0) translationSegments.value[existing] = seg
      else translationSegments.value = [...translationSegments.value, seg].sort((a, b) => a.index - b.index)
    })
  }

  if (window.electronAPI?.onSummaryProgress) {
    unsubscribeSummary = window.electronAPI.onSummaryProgress((payload) => {
      if (payload.articleId !== selectedArticleId.value || !selectedArticleContent.value) return
      if (payload.done) {
        summaryStreaming.value = false
        return
      }
      selectedArticleContent.value = {
        ...selectedArticleContent.value,
        summary: (selectedArticleContent.value.summary ?? '') + payload.chunk
      }
    })
  }
})

onUnmounted(() => {
  unsubscribeTranslate?.()
  unsubscribeSummary?.()
})

const loadFeeds = async () => {
  if (!window.electronAPI) {
    return
  }

  try {
    const loadedFeeds = await window.electronAPI.getFeedList()
    useMockData.value = false
    feeds.value = loadedFeeds

    if (loadedFeeds.length > 0) {
      selectedFeedId.value = loadedFeeds[0].id
      await loadArticles(selectedFeedId.value)
    } else {
      articleList.value = []
      selectedArticleId.value = ''
      selectedArticleContent.value = null
    }
  } catch (error) {
    console.error('Failed to load feeds, fallback to mock data', error)
  }
}

const loadTags = async () => {
  if (!window.electronAPI) return
  try {
    const loaded = await window.electronAPI.getAllTags()
    tags.value = [{ id: '__all', name: '全部', count: 0 }, ...loaded]
  } catch (error) {
    console.error('Failed to load tags', error)
  }
}

const applyReadingSettings = async () => {
  if (!window.electronAPI) return
  try {
    const fontSize = await window.electronAPI.getSetting('reading.fontSize')
    const lineHeight = await window.electronAPI.getSetting('reading.lineHeight')
    const contentWidth = await window.electronAPI.getSetting('reading.contentWidth')
    const theme = await window.electronAPI.getSetting('reading.theme')

    const root = document.documentElement
    if (fontSize) root.style.setProperty('--reading-font-size', fontSize + 'px')
    if (lineHeight) root.style.setProperty('--reading-line-height', lineHeight)
    if (contentWidth) root.style.setProperty('--reading-content-width', contentWidth + 'px')
    if (theme) {
      root.setAttribute('data-theme', theme)
    }
  } catch (error) {
    console.error('Failed to apply reading settings', error)
  }
}

const loadArticles = async (feedId: string) => {
  isLoadingArticles.value = true
  if (!window.electronAPI || useMockData.value) {
    articleList.value = mockArticles.filter((article) => article.feedId === feedId)
    isLoadingArticles.value = false
    return
  }

  try {
    articleList.value = await window.electronAPI.getArticleList(feedId)
    selectedArticleId.value = ''
    selectedArticleContent.value = null
  } finally {
    isLoadingArticles.value = false
  }
}

const searchQuery = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const handleSearch = (query: string) => {
  searchQuery.value = query
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    if (!window.electronAPI) return
    if (!query.trim()) { await loadArticles(selectedFeedId.value); return }
    try {
      articleList.value = await window.electronAPI.searchArticles(query)
      selectedArticleId.value = ''
      selectedArticleContent.value = null
    } catch (error) { console.error('Search failed', error) }
  }, 250)
}

const handleSelectFeed = async (feedId: string) => {
  selectedFeedId.value = feedId
  selectedArticleId.value = ''
  selectedArticleContent.value = null
  highlights.value = []
  await loadArticles(feedId)
}

const handleSelectTag = (tagName: string) => {
  selectedTag.value = tagName
}

const handleSelectArticle = async (articleId: string) => {
  selectedArticleId.value = articleId
  activeTranslationRequest = null
  translationSegments.value = []
  highlights.value = []
  summaryStreaming.value = false
  if (!window.electronAPI || useMockData.value) {
    selectedArticleContent.value = mockArticleContent
    return
  }

  try {
    selectedArticleContent.value = await window.electronAPI.getArticleContent(articleId)
    await window.electronAPI.markArticleRead(articleId)
    await loadHighlights(articleId)
    articleList.value = articleList.value.map((article) =>
      article.id === articleId ? { ...article, isRead: true } : article
    )
    feeds.value = await window.electronAPI.getFeedList()
  } catch (error) {
    console.error('Failed to load article content', error)
    alert(`加载文章失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

const currentIndex = computed(() => articles.value.findIndex((a) => a.id === selectedArticleId.value))
const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value >= 0 && currentIndex.value < articles.value.length - 1)

const handleNavigate = (direction: 'prev' | 'next') => {
  const idx = currentIndex.value
  if (idx < 0) return
  const target = direction === 'prev' ? articles.value[idx - 1] : articles.value[idx + 1]
  if (target) void handleSelectArticle(target.id)
}

const handleAddFeed = async () => {
  feedDialogError.value = ''
  showAddSubscription.value = true
}

const closeAddSubscription = () => {
  if (isAddingFeed.value) {
    return
  }

  showAddSubscription.value = false
  feedDialogError.value = ''
}

const submitAddFeed = async (payload: { url: string; title?: string }) => {
  if (!window.electronAPI) {
    feedDialogError.value = '当前环境不支持添加订阅'
    return
  }

  if (!payload.url) {
    feedDialogError.value = '请输入订阅源 URL'
    return
  }

  isAddingFeed.value = true
  feedDialogError.value = ''
  try {
    let feed = await window.electronAPI.addFeed(payload.url)
    if (payload.title) {
      feed = await window.electronAPI.updateFeed(feed.id, { title: payload.title })
    }
    useMockData.value = false
    await loadFeeds()
    selectedFeedId.value = feed.id
    await loadArticles(feed.id)
    showAddSubscription.value = false
  } catch (error) {
    console.error('Failed to add feed', error)
    feedDialogError.value = `添加订阅失败：${error instanceof Error ? error.message : String(error)}`
  } finally {
    isAddingFeed.value = false
  }
}

const handleRefresh = async () => {
  if (!window.electronAPI || !selectedFeedId.value) {
    alert('当前环境不支持刷新')
    return
  }

  isRefreshing.value = true
  try {
    articleList.value = await window.electronAPI.refreshFeed(selectedFeedId.value)
    feeds.value = await window.electronAPI.getFeedList()
    selectedArticleId.value = ''
    selectedArticleContent.value = null
  } catch (error) {
    console.error('Failed to refresh feed', error)
    feeds.value = await window.electronAPI.getFeedList()
    alert(`刷新失败：${error instanceof Error ? error.message : String(error)}`)
  } finally {
    isRefreshing.value = false
  }
}

const handleEditFeed = (feedId: string) => {
  const feed = feeds.value.find((item) => item.id === feedId)
  if (!feed) {
    return
  }

  editDialogError.value = ''
  editingFeed.value = feed
}

const closeEditSubscription = () => {
  if (isEditingFeed.value) {
    return
  }

  editingFeed.value = null
  editDialogError.value = ''
}

const submitEditFeed = async (updates: { title: string; refreshIntervalMinutes: number }) => {
  if (!window.electronAPI || !editingFeed.value) {
    editDialogError.value = '当前环境不支持编辑订阅'
    return
  }

  isEditingFeed.value = true
  editDialogError.value = ''
  try {
    const updatedFeed = await window.electronAPI.updateFeed(editingFeed.value.id, {
      title: updates.title,
      refreshIntervalMinutes: updates.refreshIntervalMinutes
    })
    feeds.value = await window.electronAPI.getFeedList()
    editingFeed.value = updatedFeed
    editingFeed.value = null
  } catch (error) {
    console.error('Failed to update feed', error)
    editDialogError.value = `保存失败：${error instanceof Error ? error.message : String(error)}`
  } finally {
    isEditingFeed.value = false
  }
}

const resetEditingFeedTitle = async () => {
  if (!window.electronAPI || !editingFeed.value) {
    editDialogError.value = '当前环境不支持恢复名称'
    return
  }

  isEditingFeed.value = true
  editDialogError.value = ''
  try {
    const updatedFeed = await window.electronAPI.resetFeedTitle(editingFeed.value.id)
    feeds.value = await window.electronAPI.getFeedList()
    editingFeed.value = updatedFeed
  } catch (error) {
    console.error('Failed to reset feed title', error)
    editDialogError.value = `恢复失败：${error instanceof Error ? error.message : String(error)}`
  } finally {
    isEditingFeed.value = false
  }
}

const deleteEditingFeed = async () => {
  if (!window.electronAPI || !editingFeed.value) {
    editDialogError.value = '当前环境不支持删除订阅'
    return
  }

  const articleCount = editingFeed.value.articleCount ?? 0
  const shouldDelete = confirm(
    `确定删除“${editingFeed.value.title}”吗？该源下 ${articleCount} 篇文章也会被删除。`
  )
  if (!shouldDelete) {
    return
  }

  isEditingFeed.value = true
  editDialogError.value = ''
  try {
    const deletedId = editingFeed.value.id
    await window.electronAPI.deleteFeed(deletedId)
    feeds.value = await window.electronAPI.getFeedList()
    if (selectedFeedId.value === deletedId) {
      const nextFeed = feeds.value[0]
      selectedFeedId.value = nextFeed?.id ?? ''
      if (nextFeed) {
        await loadArticles(nextFeed.id)
      } else {
        articleList.value = []
        selectedArticleId.value = ''
        selectedArticleContent.value = null
      }
    }
    editingFeed.value = null
  } catch (error) {
    console.error('Failed to delete feed', error)
    editDialogError.value = `删除失败：${error instanceof Error ? error.message : String(error)}`
  } finally {
    isEditingFeed.value = false
  }
}

const openOpmlDialog = () => {
  opmlDialogError.value = ''
  opmlFilePath.value = ''
  opmlPreviewFeeds.value = []
  opmlImportProgress.value = []
  showOpmlDialog.value = true
}

const closeOpmlDialog = () => {
  if (isImportingOpml.value) {
    return
  }

  showOpmlDialog.value = false
  opmlDialogError.value = ''
  opmlFilePath.value = ''
  opmlPreviewFeeds.value = []
  opmlImportProgress.value = []
}

const previewOpmlFile = async (filePath: string) => {
  if (!window.electronAPI) {
    opmlDialogError.value = '当前环境不支持选择 OPML 文件'
    return
  }

  isImportingOpml.value = true
  opmlDialogError.value = ''
  opmlImportProgress.value = []
  try {
    opmlFilePath.value = filePath
    opmlPreviewFeeds.value = await window.electronAPI.previewOpml(filePath)
    if (opmlPreviewFeeds.value.length === 0) {
      opmlDialogError.value = '该 OPML 文件中没有找到订阅源'
    }
  } catch (error) {
    console.error('Failed to preview OPML', error)
    opmlDialogError.value = `预览失败：${error instanceof Error ? error.message : String(error)}`
  } finally {
    isImportingOpml.value = false
  }
}

const selectOpmlFile = async () => {
  if (!window.electronAPI) {
    opmlDialogError.value = '当前环境不支持选择 OPML 文件'
    return
  }

  opmlDialogError.value = ''
  try {
    const filePath = await window.electronAPI.selectOpmlFile()
    if (!filePath) {
      return
    }
    await previewOpmlFile(filePath)
  } catch (error) {
    console.error('Failed to preview OPML', error)
    opmlDialogError.value = `预览失败：${error instanceof Error ? error.message : String(error)}`
  } finally {
    isImportingOpml.value = false
  }
}

const previewDroppedOpmlFile = async (file: File) => {
  if (!window.electronAPI) {
    opmlDialogError.value = '当前环境不支持拖拽导入 OPML'
    return
  }

  const filePath = window.electronAPI.getPathForFile(file)
  if (!filePath) {
    opmlDialogError.value = '无法读取拖拽文件路径，请使用点击选择文件'
    return
  }

  await previewOpmlFile(filePath)
}

const importSelectedOpmlFeeds = async (selectedFeeds: OpmlFeed[]) => {
  if (!window.electronAPI) {
    opmlDialogError.value = '当前环境不支持导入 OPML'
    return
  }

  if (selectedFeeds.length === 0) {
    opmlDialogError.value = '请选择至少一个订阅源'
    return
  }

  isImportingOpml.value = true
  opmlDialogError.value = ''
  opmlImportProgress.value = selectedFeeds.map((feed) => ({
    title: String(feed.title || feed.url),
    url: String(feed.url),
    status: 'pending'
  }))
  try {
    const importedFeeds: Feed[] = []
    const failures: string[] = []

    for (const [index, feed] of selectedFeeds.entries()) {
      opmlImportProgress.value[index] = {
        ...opmlImportProgress.value[index],
        status: 'importing',
        message: '导入中'
      }

      const feedForImport = {
        title: String(feed.title || feed.url),
        url: String(feed.url)
      }

      const importResult = await window.electronAPI.importOpmlFeeds([feedForImport])
      const failure = importResult.failures[0]
      if (failure) {
        opmlImportProgress.value[index] = {
          ...opmlImportProgress.value[index],
          status: 'failed',
          message: failure.error
        }
        failures.push(`${failure.title || failure.url}：${failure.error}`)
        continue
      }

      const importedFeed = importResult.feeds[0]
      if (importedFeed) {
        importedFeeds.push(importedFeed)
      }
      opmlImportProgress.value[index] = {
        ...opmlImportProgress.value[index],
        status: 'success',
        message: '已导入'
      }
    }

    useMockData.value = false
    feeds.value = await window.electronAPI.getFeedList()
    const firstImported = importedFeeds[0]
    if (firstImported) {
      selectedFeedId.value = firstImported.id
      await loadArticles(firstImported.id)
    }

    if (failures.length > 0) {
      opmlDialogError.value = [
        `已导入 ${importedFeeds.length} 个订阅源，${failures.length} 个失败。`,
        ...failures
      ].join('\n')
      return
    }

    showOpmlDialog.value = false
  } catch (error) {
    console.error('Failed to import OPML', error)
    opmlDialogError.value = `导入失败：${error instanceof Error ? error.message : String(error)}`
  } finally {
    isImportingOpml.value = false
  }
}

const handleExportOpml = async () => {
  if (!window.electronAPI) {
    alert('当前环境不支持导出 OPML')
    return
  }

  try {
    const filePath = await window.electronAPI.selectOpmlExportPath()
    if (!filePath) {
      return
    }
    await window.electronAPI.exportOpml(filePath)
    alert('OPML 导出成功')
  } catch (error) {
    console.error('Failed to export OPML', error)
    alert(`导出失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

const handleSummarize = async (length: 'short' | 'medium' | 'long' = 'medium') => {
  if (!window.electronAPI || !selectedArticleId.value || !selectedArticleContent.value) {
    alert('请先选择一篇文章')
    return
  }

  try {
    const requestArticleId = selectedArticleId.value
    selectedArticleContent.value = { ...selectedArticleContent.value, summary: '' }
    summaryStreaming.value = true
    const summary = await window.electronAPI.summarizeArticle(requestArticleId, length)
    // 若摘要进行中用户已切走，丢弃迟到的结果，避免把 A 的摘要写进 B
    if (selectedArticleId.value !== requestArticleId || !selectedArticleContent.value) return
    selectedArticleContent.value = { ...selectedArticleContent.value, summary }
  } catch (error) {
    console.error('Failed to summarize article', error)
    alert(`摘要生成失败：${error instanceof Error ? error.message : String(error)}`)
  } finally {
    summaryStreaming.value = false
  }
}

const handleTranslate = async (targetLang: string) => {
  if (!window.electronAPI || !selectedArticleId.value || !selectedArticleContent.value) {
    alert('请先选择一篇文章')
    return
  }

  const requestArticleId = selectedArticleId.value
  activeTranslationRequest = {
    articleId: requestArticleId,
    targetLang
  }

  try {
    translationSegments.value = []
    const translation = await window.electronAPI.translateArticle(requestArticleId, targetLang)
    if (
      selectedArticleId.value !== requestArticleId ||
      !selectedArticleContent.value ||
      !activeTranslationRequest ||
      activeTranslationRequest.articleId !== requestArticleId ||
      activeTranslationRequest.targetLang !== targetLang
    ) {
      return
    }
    selectedArticleContent.value = { ...selectedArticleContent.value, translation }
  } catch (error) {
    if (activeTranslationRequest?.articleId !== requestArticleId) {
      return
    }
    console.error('Failed to translate article', error)
    alert(`翻译失败：${error instanceof Error ? error.message : String(error)}`)
  } finally {
    if (
      activeTranslationRequest?.articleId === requestArticleId &&
      activeTranslationRequest.targetLang === targetLang
    ) {
      activeTranslationRequest = null
    }
  }
}

const handleAddTag = () => {
  console.log('handleAddTag called', {
    hasElectronAPI: !!window.electronAPI,
    selectedArticleId: selectedArticleId.value
  })

  if (!window.electronAPI || !selectedArticleId.value) {
    alert('当前环境不支持添加标签或未选择文章')
    return
  }

  showTagDialog.value = true
}

const handleTagConfirm = async (tagNames: string[]) => {
  showTagDialog.value = false

  if (!window.electronAPI || !selectedArticleId.value || !tagNames.length) {
    return
  }

  try {
    for (const name of tagNames) {
      await window.electronAPI.addTagToArticle(selectedArticleId.value, name)
    }
    selectedArticleContent.value = await window.electronAPI.getArticleContent(selectedArticleId.value)
    articleList.value = await window.electronAPI.getArticleList(selectedFeedId.value)
    await loadTags()
  } catch (error) {
    console.error('Failed to add tag', error)
    alert(`添加标签失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

const handleMarkUnread = async () => {
  if (!window.electronAPI || !selectedArticleId.value) {
    alert('当前环境不支持标记未读')
    return
  }

  try {
    await window.electronAPI.markArticleUnread(selectedArticleId.value)
    articleList.value = articleList.value.map((article) =>
      article.id === selectedArticleId.value ? { ...article, isRead: false } : article
    )
    feeds.value = await window.electronAPI.getFeedList()
  } catch (error) {
    console.error('Failed to mark article unread', error)
    alert(`标记未读失败：${error instanceof Error ? error.message : String(error)}`)
  }
}

const handleToggleStar = async (articleId: string) => {
  if (!window.electronAPI) return
  const article = articleList.value.find((a) => a.id === articleId)
  const next = !article?.isStarred
  try {
    await window.electronAPI.setArticleStarred(articleId, next)
    articleList.value = articleList.value.map((a) =>
      a.id === articleId ? { ...a, isStarred: next } : a
    )
    if (selectedArticleContent.value && selectedArticleId.value === articleId) {
      selectedArticleContent.value = { ...selectedArticleContent.value, isStarred: next }
    }
  } catch (error) {
    console.error('Failed to toggle star', error)
  }
}

const handleReaderToggleStar = async () => {
  if (!selectedArticleId.value) return
  await handleToggleStar(selectedArticleId.value)
}

const handleSaveScroll = (articleId: string, percent: number) => {
  if (!window.electronAPI || !articleId) return
  window.electronAPI
    .saveScrollPercent(articleId, percent)
    .catch((e) => console.error('Failed to save scroll', e))
}

const handleReadingSetting = (key: string, value: string) => {
  if (!window.electronAPI) return
  window.electronAPI.saveSetting(key, value).catch((e) => console.error('Failed to save reading setting', e))
}

const loadHighlights = async (articleId: string) => {
  if (!window.electronAPI?.getHighlights) return
  try {
    highlights.value = await window.electronAPI.getHighlights(articleId)
  } catch (e) {
    console.error('Failed to load highlights', e)
  }
}

const handleAddHighlight = async (input: {
  selectedText: string
  prefixText?: string
  suffixText?: string
  color: string
  note?: string
}) => {
  if (!window.electronAPI || !selectedArticleId.value) return
  try {
    await window.electronAPI.addHighlight({ entryId: selectedArticleId.value, ...input })
    await loadHighlights(selectedArticleId.value)
  } catch (e) {
    console.error('Failed to add highlight', e)
  }
}

const handleDeleteHighlight = async (id: string) => {
  if (!window.electronAPI) return
  try {
    await window.electronAPI.deleteHighlight(id)
    if (selectedArticleId.value) await loadHighlights(selectedArticleId.value)
  } catch (e) {
    console.error('Failed to delete highlight', e)
  }
}

const handleExport = async () => {
  if (!window.electronAPI || !selectedArticleId.value || !selectedArticleContent.value) {
    alert('当前环境不支持导出')
    return
  }

  try {
    // 生成默认文件名
    const filename = selectedArticleContent.value.title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50) + '.md'

    // 选择保存路径
    const filePath = await window.electronAPI.selectMarkdownExportPath(filename)
    if (!filePath) {
      return
    }

    // 导出文件
    await window.electronAPI.exportMarkdown(selectedArticleId.value, filePath)
    alert('导出成功！')
  } catch (error) {
    console.error('Failed to export markdown', error)
    alert(`导出失败：${error instanceof Error ? error.message : String(error)}`)
  }
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}
</style>
