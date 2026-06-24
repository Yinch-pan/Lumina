<template>
  <div class="article-list">
    <div class="list-header">
    <div class="list-title">文章列表</div>
      <div class="list-controls">
        <button
          class="control-btn"
          :class="{ active: filter === 'all' }"
          @click="$emit('change-filter', 'all')"
        >
          全部
        </button>
        <button
          class="control-btn"
          :class="{ active: filter === 'unread' }"
          @click="$emit('change-filter', 'unread')"
        >
          未读
        </button>
        <button
          class="control-btn"
          :class="{ active: filter === 'read' }"
          @click="$emit('change-filter', 'read')"
        >
          已读
        </button>
      </div>
        <input
          class="search-input"
          type="text"
          :value="searchQuery"
          placeholder="搜索文章..."
          @input="$emit('search', ($event.target as HTMLInputElement).value)"
        />
    </div>

    <div v-if="isLoading" class="article-state">
      <LoaderCircle class="spinning" :size="28" />
      <div>文章列表加载中...</div>
    </div>

    <div v-else-if="articles.length === 0" class="article-state">
      <Inbox :size="36" />
      <div class="state-title">暂无文章</div>
      <div class="state-desc">该订阅源还没有文章，点击刷新按钮获取最新内容。</div>
    </div>

    <div v-else class="articles">
      <div
        v-for="article in articles"
        :key="article.id"
        class="article-item"
        :class="{ active: article.id === selectedArticleId, unread: !article.isRead }"
        @click="$emit('select-article', article.id)"
      >
        <div class="article-header">
          <div class="article-title-text">{{ article.title }}</div>
          <button
            class="article-star"
            :class="{ starred: article.isStarred }"
            :title="article.isStarred ? '取消收藏' : '收藏'"
            @click.stop="$emit('toggle-star', article.id)"
          >
            ★
          </button>
          <div v-if="!article.isRead" class="article-unread-dot"></div>
        </div>
        <div class="article-meta">{{ article.author }} · {{ article.publishedAt }}</div>
        <div class="article-excerpt">{{ article.excerpt }}</div>
        <div v-if="article.tags.length > 0" class="article-tags">
          <span v-for="tag in article.tags" :key="tag" class="article-tag">{{ tag }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Inbox, LoaderCircle } from 'lucide-vue-next'

export type ArticleFilter = 'all' | 'unread' | 'read'

defineProps<{
  articles: Array<{
    id: string
    feedId: string
    title: string
    author?: string
    publishedAt: string
    excerpt: string
    isRead: boolean
    isStarred?: boolean
    tags: string[]
  }>
  selectedArticleId: string
  filter: ArticleFilter
  isLoading: boolean
  searchQuery: string
}>()

defineEmits<{
  'select-article': [articleId: string]
  'change-filter': [filter: ArticleFilter]
  'toggle-star': [articleId: string]
  search: [query: string]
}>()
</script>

<style scoped>
.article-list {
  width: 380px;
  background: var(--card-bg);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  color: var(--text-color);
}

.list-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.list-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.list-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  padding: 6px 12px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.control-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.control-btn.active {
  background: #409eff;
  color: #ffffff;
  border-color: #409eff;
}

.articles {
  flex: 1;
  overflow-y: auto;
}

.article-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: #909399;
  text-align: center;
}

.state-title {
  color: #303133;
  font-size: 15px;
  font-weight: 600;
}

.state-desc {
  max-width: 260px;
  font-size: 13px;
  line-height: 1.6;
}

.article-item {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s;
}

.article-item:hover {
  background: #f5f7fa;
}

.article-item.active {
  background: #ecf5ff;
  border-left: 3px solid #409eff;
}

.article-item.unread {
  background: #fafafa;
}

.article-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.article-title-text {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  flex: 1;
}

.article-unread-dot {
  width: 8px;
  height: 8px;
  background: #409eff;
  border-radius: 50%;
  margin-left: 8px;
  margin-top: 6px;
}

.article-star {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #d0d3d9;
  line-height: 1;
  padding: 0 2px;
  margin-left: 4px;
}

.article-star.starred {
  color: #f5a623;
}

.article-meta {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}

.article-excerpt {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-tags {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.article-tag {
  padding: 2px 8px;
  background: #f0f9ff;
  color: #409eff;
  border-radius: 10px;
  font-size: 11px;
}

.spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.search-input {
  width: 100%;
  margin-top: 12px;
  padding: 7px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
}
.search-input:focus { outline: none; border-color: #409eff; }
</style>
