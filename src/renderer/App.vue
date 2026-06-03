<template>
  <div class="app-container">
    <TitleBar @open-settings="showSettings = true" />
    <div class="main-content">
      <FeedSidebar
        :feeds="feeds"
        :selectedFeedId="selectedFeedId"
        :tags="feedTags"
        :selectedTags="selectedTags"
        @select-feed="handleSelectFeed"
        @select-tag="handleSelectTag"
        @add-feed="handleAddFeed"
        @refresh="handleRefresh"
      />
      <ArticleList
        :articles="filteredArticles"
        :selectedArticleId="selectedArticleId"
        @select-article="handleSelectArticle"
      />
      <ReaderView
        :article="selectedArticle"
        @summarize="handleSummarize"
        @translate="handleTranslate"
        @add-tag="handleAddTag"
        @remove-tag="handleRemoveTag"
        @export="handleExport"
        @tag-changed="refreshData"
      />
    </div>

    <!-- 设置页面 -->
    <SettingsView v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import FeedSidebar from './components/FeedSidebar.vue'
import ArticleList from './components/ArticleList.vue'
import ReaderView from './components/ReaderView.vue'
import SettingsView from './components/SettingsView.vue'

const api = (window as any).electronAPI

// ── 状态 ──
const feeds = ref([
  { id: '1', title: 'Hacker News', url: 'news.ycombinator.com', unreadCount: 3 },
  { id: '2', title: '阮一峰的网络日志', url: 'ruanyifeng.com/blog', unreadCount: 1 },
  { id: '3', title: '少数派', url: 'sspai.com', unreadCount: 1 }
])

const allTags = ref<Array<{ id: string; name: string; count: number }>>([])
const feedTags = ref<Array<{ id: string; name: string; count: number }>>([])
const articles = ref<any[]>([])
const selectedArticleDetail = ref<any>(null)

const selectedFeedId = ref('1')
const selectedTags = ref<string[]>([])
const selectedArticleId = ref('1')
const showSettings = ref(false)

// ── 按 Feed 和 多标签筛选 ──
const filteredArticles = computed(() => {
  let list = articles.value.filter(a => a.feedId === selectedFeedId.value)
  if (selectedTags.value.length > 0) {
    // 文章必须包含所有选中的标签
    list = list.filter(a => 
      selectedTags.value.every(tag => a.tags.includes(tag))
    )
  }
  return list
})

// ── 选中的文章内容 ──
const selectedArticle = computed(() => {
  return selectedArticleDetail.value
})

// ── 初始化 ──
onMounted(async () => {
  await refreshData()
  // 加载第一篇文章详情
  if (selectedArticleId.value) {
    await loadArticleDetail(selectedArticleId.value)
  }
})

const refreshData = async () => {
  await loadTags()
  await loadFeedTags()
  await loadArticles()
  // 重新加载当前选中文章的详情
  if (selectedArticleId.value) {
    await loadArticleDetail(selectedArticleId.value)
  }
}

const loadTags = async () => {
  try {
    allTags.value = await api.getAllTags()
  } catch (_e) {
    allTags.value = []
  }
}

const loadFeedTags = async () => {
  try {
    feedTags.value = await api.getTagsByFeed(selectedFeedId.value)
  } catch (_e) {
    feedTags.value = []
  }
}

const loadArticles = async () => {
  try {
    articles.value = await api.getAllArticles()
  } catch (_e) {
    articles.value = []
  }
}

const loadArticleDetail = async (articleId: string) => {
  try {
    const detail = await api.getArticleDetail(articleId)
    if (detail) {
      selectedArticleDetail.value = {
        id: detail.id,
        title: detail.title,
        author: detail.author,
        publishedAt: detail.publishedAt,
        sourceUrl: detail.url,
        cleanedHtml: detail.cleanedHtml,
        cleanedMarkdown: detail.cleanedMarkdown,
        summary: detail.summary || '',
        translation: detail.translation || '',
        tags: detail.tags
      }
    }
  } catch (_e) {
    selectedArticleDetail.value = null
  }
}

// ── 事件处理 ──
const handleSelectFeed = async (feedId: string) => {
  selectedFeedId.value = feedId
  selectedTags.value = [] // 切换 feed 时清除标签选择
  selectedArticleId.value = ''
  selectedArticleDetail.value = null
  await loadFeedTags() // 加载新 feed 的标签
}

const handleSelectTag = (tagName: string) => {
  // 多选：toggle 标签
  const index = selectedTags.value.indexOf(tagName)
  if (index === -1) {
    selectedTags.value.push(tagName)
  } else {
    selectedTags.value.splice(index, 1)
  }
}

const handleSelectArticle = async (articleId: string) => {
  selectedArticleId.value = articleId
  await loadArticleDetail(articleId)
}

const handleAddFeed = () => {
  alert('添加订阅功能（模块 A 实现后对接）')
}

const handleRefresh = () => {
  alert('刷新功能（模块 A 实现后对接）')
}

const handleSummarize = () => {
  alert('AI 摘要功能（模块 C 实现后对接）')
}

const handleTranslate = () => {
  alert('AI 翻译功能（模块 C 实现后对接）')
}

const handleAddTag = async (tagName: string) => {
  if (!selectedArticleId.value) return
  try {
    await api.addTagToArticle(selectedArticleId.value, tagName)
    await refreshData()
  } catch (e: any) {
    alert(e.message || '添加标签失败')
  }
}

const handleRemoveTag = async (tagName: string) => {
  if (!selectedArticleId.value) return
  try {
    await api.removeTagFromArticle(selectedArticleId.value, tagName)
    await refreshData()
  } catch (e: any) {
    alert(e.message || '移除标签失败')
  }
}

const handleExport = () => {
  // 导出逻辑已移至 ReaderView 组件内部
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
