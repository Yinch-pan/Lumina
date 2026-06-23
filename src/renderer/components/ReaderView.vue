<template>
  <div class="reader-view">
    <div v-if="article" class="reader-container">
      <header class="reader-header">
        <h1 class="reader-title">{{ article.title }}</h1>

        <div class="reader-meta">
          <span v-if="article.author">{{ article.author }}</span>
          <span>{{ article.publishedAt }}</span>
          <a :href="article.sourceUrl" target="_blank" rel="noopener noreferrer" class="source-link">
            &#26597;&#30475;&#21407;&#25991;
          </a>
        </div>

        <div class="reader-actions">
          <button class="action-btn" @click="$emit('summarize')">
            <FileText class="action-icon" />
            <span>AI &#25688;&#35201;</span>
          </button>
          <div class="translate-group">
            <button class="action-btn" @click="$emit('translate', selectedLang)">
              <Languages class="action-icon" />
              <span>AI &#32763;&#35793;</span>
            </button>
            <select class="lang-select" v-model="selectedLang">
              <option value="中文">中文</option>
              <option value="English">English</option>
              <option value="日本語">日本語</option>
              <option value="한국어">한국어</option>
              <option value="Français">Français</option>
              <option value="Deutsch">Deutsch</option>
              <option value="Español">Español</option>
            </select>
          </div>
          <button class="action-btn" @click="$emit('add-tag')">
            <Tag class="action-icon" />
            <span>&#28155;&#21152;&#26631;&#31614;</span>
          </button>
          <button class="action-btn" @click="$emit('mark-unread')">
            <Circle class="action-icon" />
            <span>&#26631;&#35760;&#26410;&#35835;</span>
          </button>
          <button class="action-btn" @click="$emit('export')">
            <Download class="action-icon" />
            <span>&#23548;&#20986;</span>
          </button>
        </div>
      </header>

      <main class="reader-content">
        <div class="content-section">
          <!-- AI 摘要区域 -->
          <section v-if="article.summary || isSummarizing" class="ai-section">
            <div class="ai-section-header">
              <div class="ai-section-title">AI &#25688;&#35201;</div>
              <button v-if="article.summary && !isSummarizing" class="regenerate-btn" @click="$emit('summarize')">
                &#128260; &#37325;&#26032;&#29983;&#25104;
              </button>
            </div>
            <div v-if="isSummarizing" class="ai-loading">
              <div class="loading-spinner"></div>
              <span v-if="aiProgress && aiProgress.type === 'summary'">
                &#37325;&#35797;&#20013; ({{ aiProgress.attempt }}/{{ aiProgress.maxAttempts }})
                <span v-if="aiProgress.error" class="retry-error">: {{ aiProgress.error }}</span>
              </span>
              <span v-else>&#27491;&#22312;&#29983;&#25104;&#25688;&#35201;...</span>
            </div>
            <div v-if="streamingContent && streamingContent.type === 'summary'" class="ai-content streaming">
              {{ streamingContent.content }}<span class="cursor">|</span>
            </div>
            <div v-else-if="!isSummarizing" class="ai-content">{{ article.summary }}</div>
          </section>

          <!-- AI 翻译区域 -->
          <section v-if="article.translation || isTranslating" class="ai-section">
            <div class="ai-section-header">
              <div class="ai-section-title">AI &#32763;&#35793;</div>
              <button v-if="article.translation && !isTranslating" class="regenerate-btn" @click="$emit('translate')">
                &#128260; &#37325;&#26032;&#29983;&#25104;
              </button>
            </div>
            <div v-if="isTranslating" class="ai-loading">
              <div class="loading-spinner"></div>
              <span v-if="aiProgress && aiProgress.type === 'translation'">
                &#37325;&#35797;&#20013; ({{ aiProgress.attempt }}/{{ aiProgress.maxAttempts }})
                <span v-if="aiProgress.error" class="retry-error">: {{ aiProgress.error }}</span>
              </span>
              <span v-else>&#27491;&#22312;&#29983;&#25104;&#32763;&#35793;...</span>
            </div>
            <div v-if="streamingContent && streamingContent.type === 'translation'" class="ai-content streaming">
              {{ streamingContent.content }}<span class="cursor">|</span>
            </div>
            <div v-else-if="!isTranslating" class="ai-content">{{ article.translation }}</div>
          </section>

          <article v-if="hasCleanedHtml" class="article-content" v-html="article.cleanedHtml"></article>
          <div v-else class="content-fallback">
            <div class="fallback-title">&#27491;&#25991;&#26242;&#26102;&#26080;&#27861;&#26174;&#31034;</div>
            <p>&#35831;&#25171;&#24320;&#21407;&#25991;&#26597;&#30475;&#23436;&#25972;&#20869;&#23481;&#12290;</p>
            <a :href="article.sourceUrl" target="_blank" rel="noopener noreferrer" class="fallback-link">
              &#26597;&#30475;&#21407;&#25991;
            </a>
          </div>
        </div>
      </main>
    </div>

    <div v-else class="empty-state">
      <BookOpen class="empty-icon" />
      <div class="empty-text">&#36873;&#25321;&#19968;&#31687;&#25991;&#31456;&#24320;&#22987;&#38405;&#35835;</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { BookOpen, Circle, Download, FileText, Languages, Tag } from 'lucide-vue-next'

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
  isSummarizing?: boolean
  isTranslating?: boolean
  aiProgress?: { type: string; attempt: number; maxAttempts: number; error?: string } | null
  streamingContent?: { type: string; content: string } | null
}>()

defineEmits<{
  summarize: []
  translate: [targetLang: string]
  'add-tag': []
  'mark-unread': []
  export: []
}>()

const selectedLang = ref('中文')

const hasCleanedHtml = computed(() => Boolean(props.article?.cleanedHtml?.trim()))
</script>

<style scoped>
.reader-view {
  flex: 1;
  background: var(--card-bg);
  color: var(--text-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.reader-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.reader-header {
  padding: 24px 32px 20px;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.reader-title {
  font-size: 26px;
  font-weight: 650;
  line-height: 1.35;
  color: #1f2d3d;
  margin: 0 0 14px;
  overflow-wrap: anywhere;
}

.reader-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 16px;
  font-size: 13px;
  color: #909399;
  margin-bottom: 16px;
}

.source-link,
.fallback-link {
  color: #2563eb;
  text-decoration: none;
}

.source-link:hover,
.fallback-link:hover {
  text-decoration: underline;
}

.reader-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-btn {
  min-height: 32px;
  padding: 7px 14px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #4b5563;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition:
    border-color 0.2s,
    color 0.2s,
    background 0.2s;
}

.action-btn:hover {
  border-color: #409eff;
  color: #2563eb;
  background: #f8fbff;
}

.action-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.translate-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.lang-select {
  min-height: 32px;
  padding: 7px 8px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #4b5563;
  transition:
    border-color 0.2s,
    color 0.2s,
    background 0.2s;
}

.lang-select:hover {
  border-color: #409eff;
  color: #2563eb;
  background: #f8fbff;
}

.reader-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  min-height: 0;
}

.content-section {
  max-width: 820px;
  margin: 0 auto;
  font-size: var(--reading-font-size, 16px);
  line-height: var(--reading-line-height, 1.8);
}

.ai-section {
  background: #f8fafc;
  border-left: 3px solid #409eff;
  padding: 18px 20px;
  margin: 0 0 24px;
  border-radius: 4px;
}

.ai-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.ai-section-title {
  font-size: 14px;
  font-weight: 650;
  color: #2563eb;
}

.ai-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  color: #6b7280;
  font-size: 14px;
}

.retry-error {
  color: #f56c6c;
  font-size: 12px;
}

.ai-content.streaming {
  min-height: 60px;
}

.cursor {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.regenerate-btn {
  font-size: 12px;
  color: #2563eb;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.regenerate-btn:hover {
  background: #eff6ff;
}

.ai-content {
  font-size: 14px;
  line-height: 1.8;
  color: #4b5563;
  white-space: pre-wrap;
}

.article-content {
  font-size: 16px;
  line-height: 1.85;
  color: #26313d;
  overflow-wrap: break-word;
  word-break: break-word;
}

.article-content :deep(*) {
  max-width: 100%;
}

.article-content :deep(p),
.article-content :deep(ul),
.article-content :deep(ol),
.article-content :deep(blockquote),
.article-content :deep(pre),
.article-content :deep(table),
.article-content :deep(figure) {
  margin: 0 0 18px;
}

.article-content :deep(h1),
.article-content :deep(h2),
.article-content :deep(h3),
.article-content :deep(h4),
.article-content :deep(h5),
.article-content :deep(h6) {
  color: #111827;
  line-height: 1.35;
  margin: 28px 0 12px;
}

.article-content :deep(h1) {
  font-size: 26px;
}

.article-content :deep(h2) {
  font-size: 22px;
}

.article-content :deep(h3) {
  font-size: 19px;
}

.article-content :deep(a) {
  color: #2563eb;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  padding-left: 24px;
}

.article-content :deep(li) {
  margin-bottom: 8px;
}

.article-content :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 18px auto;
}

.article-content :deep(figure) {
  text-align: center;
}

.article-content :deep(figcaption) {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
  margin-top: -8px;
}

.article-content :deep(blockquote) {
  border-left: 3px solid #cbd5e1;
  padding-left: 16px;
  color: #4b5563;
}

.article-content :deep(pre) {
  overflow-x: auto;
  padding: 14px 16px;
  background: #111827;
  color: #f9fafb;
  border-radius: 4px;
}

.article-content :deep(code) {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 0.92em;
  background: #f1f5f9;
  padding: 2px 4px;
  border-radius: 3px;
}

.article-content :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}

.article-content :deep(table) {
  display: block;
  width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}

.article-content :deep(th),
.article-content :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 8px 10px;
  text-align: left;
}

.content-fallback {
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 4px;
  padding: 20px;
  color: #606266;
  line-height: 1.7;
}

.fallback-title {
  font-size: 16px;
  font-weight: 650;
  color: #1f2d3d;
  margin-bottom: 8px;
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
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
}
</style>
