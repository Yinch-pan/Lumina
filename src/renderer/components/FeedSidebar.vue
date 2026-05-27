<template>
  <div class="feed-sidebar">
  <div class="sidebar-header">
      <div class="sidebar-actions">
      <button class="btn btn-primary" @click="$emit('add-feed')">+ 添加订阅</button>
     <button class="btn" @click="$emit('refresh')">刷新</button>
      </div>
    </div>

    <div class="sidebar-filters">
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

    <div class="feed-list">
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  feeds: Array<{ id: string; title: string; url: string; unreadCount: number }>
  selectedFeedId: string
  tags: Array<{ id: string; name: string; count: number }>
  selectedTag: string
}>()

defineEmits<{
  'select-feed': [feedId: string]
  'select-tag': [tagName: string]
  'add-feed': []
  'refresh': []
}>()
</script>

<style scoped>
.feed-sidebar {
  width: 280px;
  background: #ffffff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.sidebar-actions {
  display: flex;
  gap: 8px;
}

.btn {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
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

.sidebar-filters {
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
}

.filter-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
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

.feed-item {
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
}
</style>
