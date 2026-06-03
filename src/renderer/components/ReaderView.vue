<template>
  <div class="reader-view">
    <div v-if="article" class="reader-container">
      <div class="reader-header">
        <h1 class="reader-title">{{ article.title }}</h1>
        <div class="reader-meta">
          <span v-if="article.author">{{ article.author }}</span>
          <span>{{ article.publishedAt }}</span>
          <a :href="article.sourceUrl" target="_blank" class="source-link">查看原文</a>
        </div>

        <!-- 标签区域 -->
        <div class="reader-tags-section">
          <div class="reader-tags">
            <span
              v-for="tag in article.tags"
              :key="tag"
              class="reader-tag"
            >
              {{ tag }}
              <button class="tag-remove-btn" @click="$emit('remove-tag', tag)" title="移除标签">×</button>
            </span>
          </div>
          <div class="tag-input-wrap">
            <input
              v-model="newTagName"
              type="text"
              class="tag-input"
              placeholder="输入标签名回车添加..."
              @keydown.enter="handleAddTag"
            />
          </div>
        </div>

        <div class="reader-actions">
          <button class="action-btn" @click="$emit('summarize')">
            <span>📝</span>
            <span>AI 摘要</span>
          </button>
          <button class="action-btn" @click="$emit('translate')">
            <span>🌐</span>
            <span>AI 翻译</span>
          </button>
          <button class="action-btn" @click="handleExport">
            <span>📤</span>
            <span>导出 Markdown</span>
          </button>
        </div>
      </div>

      <div class="reader-content">
        <div class="content-section">
          <!-- AI 摘要区域 -->
          <div v-if="article.summary" class="ai-section">
            <div class="ai-section-header">
              <div class="ai-section-title">📝 AI 摘要</div>
            </div>
            <div class="ai-content">{{ article.summary }}</div>
          </div>

          <!-- AI 翻译区域 -->
          <div v-if="article.translation" class="ai-section">
            <div class="ai-section-header">
              <div class="ai-section-title">🌐 AI 翻译</div>
            </div>
            <div class="ai-content">{{ article.translation }}</div>
          </div>

          <!-- 文章正文 -->
          <div class="article-content" v-html="article.cleanedHtml"></div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">📖</div>
      <div class="empty-text">选择一篇文章开始阅读</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const api = (window as any).electronAPI

const props = defineProps<{
  article: {
    id: string
    title: string
    author?: string
    publishedAt: string
    sourceUrl: string
    cleanedHtml?: string
    summary?: string
    translation?: string
    tags: string[]
  } | null
}>()

const emit = defineEmits<{
  'summarize': []
  'translate': []
  'add-tag': [tagName: string]
  'remove-tag': [tagName: string]
  'export': []
  'tag-changed': []
}>()

const newTagName = ref('')

const handleAddTag = () => {
  const name = newTagName.value.trim()
  if (!name || !props.article) return
  emit('add-tag', name)
  newTagName.value = ''
}

const handleExport = async () => {
  if (!props.article) return
  try {
    const result = await api.showSaveDialog({
      title: '导出 Markdown',
      defaultPath: `${props.article.title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 60)}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (result && !result.canceled && result.filePath) {
      await api.exportMarkdown(props.article.id, result.filePath)
      alert('✅ 导出成功！')
    }
  } catch (e: any) {
    alert(`导出失败: ${e.message || e}`)
  }
}
</script>

<style scoped>
.reader-view {
  flex: 1;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.reader-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.reader-header {
  padding: 24px 32px;
  border-bottom: 1px solid #e4e7ed;
}

.reader-title {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 12px;
}

.reader-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
}

.source-link {
  color: #409eff;
  text-decoration: none;
}

.source-link:hover {
  text-decoration: underline;
}

/* 标签区域 */
.reader-tags-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.reader-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.reader-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #f0f9ff;
  color: #409eff;
  border-radius: 12px;
  font-size: 12px;
}

.tag-remove-btn {
  border: none;
  background: none;
  color: #409eff;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  line-height: 1;
  opacity: 0.6;
}

.tag-remove-btn:hover {
  opacity: 1;
  color: #f56c6c;
}

.tag-input-wrap {
  flex-shrink: 0;
}

.tag-input {
  padding: 4px 10px;
  border: 1px dashed #dcdfe6;
  border-radius: 12px;
  font-size: 12px;
  width: 160px;
  outline: none;
  transition: border-color 0.2s;
}

.tag-input:focus {
  border-color: #409eff;
  border-style: solid;
}

.reader-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.action-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.reader-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
}

.content-section {
  max-width: 800px;
  margin: 0 auto;
}

.ai-section {
  background: #f8f9fa;
  border-left: 3px solid #409eff;
  padding: 20px;
  margin: 24px 0;
  border-radius: 4px;
}

.ai-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.ai-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
}

.ai-content {
  font-size: 14px;
  line-height: 1.8;
  color: #606266;
}

.article-content {
  font-size: 16px;
  line-height: 1.8;
  color: #2c3e50;
}

.article-content :deep(p) {
  margin-bottom: 16px;
}

.article-content :deep(h2) {
  font-size: 20px;
  margin: 24px 0 12px;
}

.article-content :deep(ul) {
  margin-left: 24px;
  margin-bottom: 16px;
}

.article-content :deep(li) {
  margin-bottom: 8px;
}

.article-content :deep(img) {
  max-width: 100%;
  border-radius: 4px;
  margin: 16px 0;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
}
</style>
