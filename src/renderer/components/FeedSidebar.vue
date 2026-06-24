<template>
  <div class="feed-sidebar">
  <div class="sidebar-header">
      <div class="sidebar-actions">
      <button class="btn btn-primary" @click="$emit('add-feed')">
        <Plus :size="15" />
        <span>添加订阅</span>
      </button>
     <button class="btn" @click="$emit('refresh')" :disabled="isRefreshing || !selectedFeedId">
        <RefreshCw :size="15" :class="{ spinning: isRefreshing }" />
        <span>{{ isRefreshing ? '刷新中' : '刷新' }}</span>
      </button>
      <button class="btn" @click="$emit('import-opml')">
        <FolderInput :size="15" />
        <span>导入 OPML</span>
      </button>
      <button class="btn" @click="$emit('export-opml')" :disabled="feeds.length === 0">
        <Download :size="15" />
        <span>导出 OPML</span>
      </button>
      </div>
      <div v-if="selectedFeed" class="refresh-meta">
        <span>上次刷新：{{ formatLastRefresh(selectedFeed.lastRefreshedAt) }}</span>
        <span v-if="selectedFeed.lastError" class="refresh-error" :title="selectedFeed.lastError">
          刷新失败：{{ selectedFeed.lastError }}
        </span>
      </div>
    </div>

    <div class="sidebar-filters">
      <div class="filter-label starred-entry" @click="$emit('select-starred')">⭐ 收藏</div>
      <div class="filter-label">按标签筛选</div>
      <div class="tag-filter">
        <span
          v-for="tag in tags"
       :key="tag.id"
          class="tag-chip"
       :class="{ active: tag.name === selectedTag }"
          @click="$emit('select-tag', tag.name)"
        >
          {{ tag.name }}
        </span>
      </div>
    </div>

    <div v-if="feeds.length === 0" class="empty-feeds">
      <div class="empty-title">还没有订阅源</div>
      <div class="empty-desc">添加 RSS 订阅源，或从其他阅读器导入 OPML 文件。</div>
      <button class="btn btn-primary" @click="$emit('add-feed')">
        <Plus :size="15" />
        <span>添加订阅源</span>
      </button>
    </div>

    <div v-else class="feed-list">
      <div
        v-for="feed in feeds"
        :key="feed.id"
        class="feed-item"
        :class="{ active: feed.id === selectedFeedId }"
     @click="$emit('select-feed', feed.id)"
      >
        <div class="feed-title">
       <span>{{ feed.title }}</span>
          <span v-if="feed.unreadCount > 0" class="feed-unread">{{ feed.unreadCount }}</span>
        </div>
        <div class="feed-url">{{ feed.url }}</div>
        <div v-if="feed.lastError" class="feed-error" :title="feed.lastError">刷新失败</div>
        <button class="feed-edit-btn" title="编辑订阅" @click.stop="$emit('edit-feed', feed.id)">
          <Settings :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Download, FolderInput, Plus, RefreshCw, Settings } from 'lucide-vue-next'

const props = defineProps<{
  feeds: Array<{
    id: string
    title: string
    url: string
    unreadCount: number
    articleCount?: number
    refreshIntervalMinutes?: number
    lastRefreshedAt?: string
    lastError?: string | null
  }>
  selectedFeedId: string
  tags: Array<{ id: string; name: string; count: number }>
  selectedTag: string
  isRefreshing: boolean
}>()

defineEmits<{
  'select-feed': [feedId: string]
  'select-tag': [tagName: string]
  'add-feed': []
  'edit-feed': [feedId: string]
  'import-opml': []
  'export-opml': []
  'select-starred': []
  'refresh': []
}>()

const selectedFeed = computed(() => props.feeds.find((feed) => feed.id === props.selectedFeedId))

const formatLastRefresh = (value?: string) => {
  if (!value) {
    return '尚未刷新'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}
</script>

<style scoped>
.feed-sidebar {
  width: 280px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.refresh-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 10px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

.refresh-error {
  color: #c45656;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn {
  flex: 1;
  min-width: 108px;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
}

.btn:hover {
  background: #f5f7fa;
  border-color: #409eff;
  color: #409eff;
}

.btn-primary {
  background: #409eff;
  color: #ffffff;
  border-color: #409eff;
}

.btn-primary:hover {
  background: #66b1ff;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.spinning {
  animation: spin 0.9s linear infinite;
}

.sidebar-filters {
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
}

.filter-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.starred-entry {
  cursor: pointer;
  font-size: 13px;
  color: #606266;
}

.starred-entry:hover {
  color: #f5a623;
}

.tag-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-chip {
  padding: 4px 10px;
  background: #f4f4f5;
  border-radius: 12px;
  font-size: 12px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}
.tag-chip:hover {
  background: #409eff;
  color: #ffffff;
}

.tag-chip.active {
  background: #409eff;
  color: #ffffff;
}

.feed-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-feeds {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 12px;
  padding: 24px 20px;
  text-align: center;
}

.empty-title {
  color: #303133;
  font-size: 15px;
  font-weight: 600;
}

.empty-desc {
  color: #909399;
  font-size: 13px;
  line-height: 1.6;
}

.feed-item {
  position: relative;
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.feed-item:hover {
  background: #f5f7fa;
}

.feed-item.active {
  background: #ecf5ff;
}

.feed-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feed-unread {
  background: #409eff;
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
}

.feed-url {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 28px;
}

.feed-error {
  display: inline-flex;
  margin-top: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #fef0f0;
  color: #c45656;
  font-size: 11px;
}

.feed-edit-btn {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 24px;
  height: 24px;
  display: none;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #909399;
  cursor: pointer;
}

.feed-item:hover .feed-edit-btn,
.feed-item.active .feed-edit-btn {
  display: inline-flex;
}

.feed-edit-btn:hover {
  background: #ffffff;
  color: #409eff;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
