<template>
  <div class="app-container">
    <TitleBar />
    <div class="main-content">
      <FeedSidebar
        :feeds="feeds"
        :selectedFeedId="selectedFeedId"
        :tags="tags"
        :selectedTag="selectedTag"
        @select-feed="handleSelectFeed"
        @select-tag="handleSelectTag"
        @add-feed="handleAddFeed"
        @refresh="handleRefresh"
      />
      <ArticleList
        :articles="articles"
      :selectedArticleId="selectedArticleId"
        @select-article="handleSelectArticle"
      />
      <ReaderView
        :article="selectedArticle"
        @summarize="handleSummarize"
        @translate="handleTranslate"
        @add-tag="handleAddTag"
        @export="handleExport"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import TitleBar from './components/TitleBar.vue'
import FeedSidebar from './components/FeedSidebar.vue'
import ArticleList from './components/ArticleList.vue'
import ReaderView from './components/ReaderView.vue'

// Mock 数据
const feeds = ref([
  { id: '1', title: 'Hacker News', url: 'news.ycombinator.com', unreadCount: 12 },
  { id: '2', title: '阮一峰的网络日志', url: 'ruanyifeng.com/blog', unreadCount: 5 },
  { id: '3', title: '少数派', url: 'sspai.com', unreadCount: 8 }
])

const tags = ref([
  { id: '1', name: '全部', count: 25 },
  { id: '2', name: '技术', count: 12 },
  { id: '3', name: '设计', count: 8 },
  { id: '4', name: '产品', count: 5 }
])

const mockArticles = [
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

const mockArticleContent = {
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

const articles = computed(() => {
  return mockArticles.filter(a => a.feedId === selectedFeedId.value)
})

const selectedArticle = computed(() => {
  if (selectedArticleId.value) {
    return mockArticleContent
  }
  return null
})

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
  alert('添加订阅功能（占位）')
}

const handleRefresh = () => {
  alert('刷新功能（占位）')
}

const handleSummarize = () => {
  alert('AI 摘要功能（占位）')
}

const handleTranslate = () => {
  alert('AI 翻译功能（占位）')
}

const handleAddTag = () => {
  alert('添加标签功能（占位）')
}

const handleExport = () => {
  alert('导出 Markdown 功能（占位）')
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
