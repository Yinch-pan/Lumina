<template>
  <div class="app-container">
    <TitleBar @open-settings="showSettings = true" />
    <div class="main-content">
      <FeedSidebar
        :feeds="feeds"
        :selectedFeedId="selectedFeedId"
        :tags="tagFilterList"
        :selectedTag="selectedTag"
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
        @tag-changed="refreshArticleTags"
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
  { id: '1', title: 'Hacker News', url: 'news.ycombinator.com', unreadCount: 12 },
  { id: '2', title: '阮一峰的网络日志', url: 'ruanyifeng.com/blog', unreadCount: 5 },
  { id: '3', title: '少数派', url: 'sspai.com', unreadCount: 8 }
])

const allTags = ref<Array<{ id: string; name: string; count: number }>>([])

// Mock 文章数据（模块 A 完成后替换为真实数据）
const mockArticles = ref([
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
  },
  {
    id: '4',
    feedId: '2',
    title: '科技爱好者周刊：第 300 期',
    author: '阮一峰',
    publishedAt: '2024-05-25 08:00',
    excerpt: '这里记录每周值得分享的科技内容，周五发布。本期介绍一些有趣的开源项目和科技新闻...',
    isRead: false,
    tags: ['技术', '周刊']
  },
  {
    id: '5',
    feedId: '3',
    title: '如何打造高效的个人知识管理系统',
    author: '少数派编辑部',
    publishedAt: '2024-05-24 14:30',
    excerpt: '信息爆炸的时代，如何从海量信息中筛选出有价值的内容？本文分享一套完整的知识管理工作流...',
    isRead: true,
    tags: ['产品', '效率']
  }
])

const mockArticleContents: Record<string, any> = {
  '1': {
    id: '1',
    title: 'Show HN: I built a RSS reader with AI features',
    author: 'johndoe',
    publishedAt: '2024-05-27 10:30',
    sourceUrl: 'https://news.ycombinator.com/item?id=123456',
    cleanedHtml: `
      <h2>Introduction</h2>
      <p>Mercury is a cross-platform, local-first RSS reader with AI-powered features. It helps you stay organized and get more value from your reading.</p>
      <h2>Key Features</h2>
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
  },
  '2': {
    id: '2',
    title: 'The Future of Web Development',
    author: 'janedoe',
    publishedAt: '2024-05-27 09:15',
    sourceUrl: 'https://example.com/future-web',
    cleanedHtml: '<p>Web development is evolving rapidly...</p>',
    summary: '',
    translation: '',
    tags: ['技术']
  },
  '3': {
    id: '3',
    title: 'Understanding TypeScript Generics',
    author: 'developer',
    publishedAt: '2024-05-26 18:45',
    sourceUrl: 'https://example.com/ts-generics',
    cleanedHtml: '<p>TypeScript generics can be confusing at first...</p>',
    summary: '',
    translation: '',
    tags: ['技术']
  },
  '4': {
    id: '4',
    title: '科技爱好者周刊：第 300 期',
    author: '阮一峰',
    publishedAt: '2024-05-25 08:00',
    sourceUrl: 'https://ruanyifeng.com/blog/weekly-300',
    cleanedHtml: '<p>这里记录每周值得分享的科技内容...</p>',
    summary: '',
    translation: '',
    tags: ['技术', '周刊']
  },
  '5': {
    id: '5',
    title: '如何打造高效的个人知识管理系统',
    author: '少数派编辑部',
    publishedAt: '2024-05-24 14:30',
    sourceUrl: 'https://sspai.com/post/knowledge',
    cleanedHtml: '<p>信息爆炸的时代，如何从海量信息中筛选出有价值的内容...</p>',
    summary: '',
    translation: '',
    tags: ['产品', '效率']
  }
}

const selectedFeedId = ref('1')
const selectedTag = ref('全部')
const selectedArticleId = ref('1')
const showSettings = ref(false)

// ── 标签筛选列表（带"全部"） ──
const tagFilterList = computed(() => {
  const all: Array<{ id: string; name: string; count: number }> = [
    { id: 'all', name: '全部', count: mockArticles.value.length }
  ]
  return [...all, ...allTags.value]
})

// ── 按 Feed 和 标签双重筛选 ──
const filteredArticles = computed(() => {
  let list = mockArticles.value.filter(a => a.feedId === selectedFeedId.value)
  if (selectedTag.value !== '全部') {
    list = list.filter(a => a.tags.includes(selectedTag.value))
  }
  return list
})

// ── 选中的文章内容 ──
const selectedArticle = computed(() => {
  if (selectedArticleId.value && mockArticleContents[selectedArticleId.value]) {
    return mockArticleContents[selectedArticleId.value]
  }
  return null
})

// ── 初始化加载标签 ──
onMounted(async () => {
  await loadTags()
})

const loadTags = async () => {
  try {
    allTags.value = await api.getAllTags()
  } catch (_e) {
    allTags.value = []
  }
}

// ── 事件处理 ──
const handleSelectFeed = (feedId: string) => {
  selectedFeedId.value = feedId
  selectedArticleId.value = ''
}

const handleSelectTag = (tagName: string) => {
  selectedTag.value = tagName
}

const handleSelectArticle = (articleId: string) => {
  selectedArticleId.value = articleId
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

    // 更新本地 mock 数据的标签（模块 A 对接后改为从后端获取）
    const article = mockArticles.value.find(a => a.id === selectedArticleId.value)
    if (article && !article.tags.includes(tagName)) {
      article.tags.push(tagName)
    }
    const content = mockArticleContents[selectedArticleId.value]
    if (content && !content.tags.includes(tagName)) {
      content.tags.push(tagName)
    }

    await loadTags()
  } catch (e: any) {
    alert(e.message || '添加标签失败')
  }
}

const handleRemoveTag = async (tagName: string) => {
  if (!selectedArticleId.value) return
  try {
    await api.removeTagFromArticle(selectedArticleId.value, tagName)

    // 更新本地 mock 数据
    const article = mockArticles.value.find(a => a.id === selectedArticleId.value)
    if (article) {
      article.tags = article.tags.filter(t => t !== tagName)
    }
    const content = mockArticleContents[selectedArticleId.value]
    if (content) {
      content.tags = content.tags.filter((t: string) => t !== tagName)
    }

    await loadTags()
  } catch (e: any) {
    alert(e.message || '移除标签失败')
  }
}

const handleExport = () => {
  // 导出逻辑已移至 ReaderView 组件内部
}

const refreshArticleTags = async () => {
  await loadTags()
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
