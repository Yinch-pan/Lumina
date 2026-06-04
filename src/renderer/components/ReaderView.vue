<template>
  <div class="reader-view" :class="themeClass">
    <div v-if="isLoading" class="reader-state">
      <LoaderCircle class="state-icon spinning" />
      <div class="state-title">文章加载中...</div>
      <div class="state-text">正在获取并清洗正文内容</div>
    </div>

    <div v-else-if="error" class="reader-state error-state">
      <AlertTriangle class="state-icon" />
      <div class="state-title">正文加载失败</div>
      <div class="state-text">{{ error }}</div>
    </div>

    <div v-else-if="article" class="reader-container">
      <header class="reader-header">
        <h1 class="reader-title">{{ article.title }}</h1>

        <div class="reader-meta">
          <span v-if="article.author">{{ article.author }}</span>
          <span>{{ article.publishedAt }}</span>
          <a :href="article.sourceUrl" target="_blank" rel="noopener noreferrer" class="source-link">
            &#26597;&#30475;&#21407;&#25991;
          </a>
        </div>

        <div v-if="article.tags.length > 0" class="reader-tags" aria-label="文章标签">
          <span v-for="tag in article.tags" :key="tag" class="reader-tag">{{ tag }}</span>
        </div>

        <div class="reader-actions">
          <button class="action-btn" @click="$emit('summarize')">
            <FileText class="action-icon" />
            <span>AI &#25688;&#35201;</span>
          </button>
          <button class="action-btn" @click="$emit('translate')">
            <Languages class="action-icon" />
            <span>AI &#32763;&#35793;</span>
          </button>
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

      <main class="reader-content" :style="readerStyle">
        <div class="content-section">
          <section v-if="article.summary" class="ai-section">
            <div class="ai-section-title">AI &#25688;&#35201;</div>
            <div class="ai-content">{{ article.summary }}</div>
          </section>

          <section v-if="article.translation" class="ai-section">
            <div class="ai-section-title">AI &#32763;&#35793;</div>
            <div class="ai-content">{{ article.translation }}</div>
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
import { computed } from 'vue'
import { AlertTriangle, BookOpen, Circle, Download, FileText, Languages, LoaderCircle, Tag } from 'lucide-vue-next'

type ReadingSettings = {
  fontSize: string
  lineHeight: string
  theme: string
}

const DEFAULT_READING_SETTINGS: ReadingSettings = {
  fontSize: '16',
  lineHeight: '1.8',
  theme: 'light'
}

const props = withDefaults(defineProps<{
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
  isLoading?: boolean
  error?: string
  readingSettings?: ReadingSettings
}>(), {
  isLoading: false,
  error: '',
  readingSettings: () => ({ fontSize: '16', lineHeight: '1.8', theme: 'light' })
})

defineEmits<{
  summarize: []
  translate: []
  'add-tag': []
  'mark-unread': []
  export: []
}>()

const hasCleanedHtml = computed(() => Boolean(props.article?.cleanedHtml?.trim()))
const normalizedReadingSettings = computed(() => props.readingSettings ?? DEFAULT_READING_SETTINGS)
const themeClass = computed(() =>
  normalizedReadingSettings.value.theme === 'dark' ? 'theme-dark' : 'theme-light'
)
const readerStyle = computed(() => ({
  '--reader-font-size': `${normalizeFontSize(normalizedReadingSettings.value.fontSize)}px`,
  '--reader-line-height': String(normalizeLineHeight(normalizedReadingSettings.value.lineHeight))
}))

function normalizeFontSize(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) {
    return 16
  }

  return Math.min(Math.max(parsed, 14), 22)
}

function normalizeLineHeight(value: string): number {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) {
    return 1.8
  }

  return Math.min(Math.max(parsed, 1.4), 2.2)
}
</script>

<style scoped>
.reader-view {
  --reader-bg: #ffffff;
  --reader-header-bg: #ffffff;
  --reader-border: #e4e7ed;
  --reader-title: #1f2d3d;
  --reader-heading: #111827;
  --reader-text: #26313d;
  --reader-muted: #909399;
  --reader-link: #2563eb;
  --reader-action-bg: #ffffff;
  --reader-action-border: #dcdfe6;
  --reader-action-text: #4b5563;
  --reader-action-hover-bg: #f8fbff;
  --reader-panel-bg: #f8fafc;
  --reader-panel-text: #4b5563;
  --reader-code-inline-bg: #f1f5f9;
  --reader-code-block-bg: #111827;
  --reader-code-block-text: #f9fafb;
  --reader-table-border: #e5e7eb;
  --reader-fallback-bg: #f9fafb;
  --reader-state-bg: #f8fafc;
  flex: 1;
  background: var(--reader-bg);
  color: var(--reader-text);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.reader-view.theme-dark {
  --reader-bg: #111827;
  --reader-header-bg: #111827;
  --reader-border: #374151;
  --reader-title: #f9fafb;
  --reader-heading: #f9fafb;
  --reader-text: #e5e7eb;
  --reader-muted: #9ca3af;
  --reader-link: #60a5fa;
  --reader-action-bg: #1f2937;
  --reader-action-border: #4b5563;
  --reader-action-text: #e5e7eb;
  --reader-action-hover-bg: #253244;
  --reader-panel-bg: #1f2937;
  --reader-panel-text: #d1d5db;
  --reader-code-inline-bg: #374151;
  --reader-code-block-bg: #030712;
  --reader-code-block-text: #f9fafb;
  --reader-table-border: #4b5563;
  --reader-fallback-bg: #1f2937;
  --reader-state-bg: #1f2937;
}

.reader-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.reader-header {
  padding: 24px 32px 20px;
  border-bottom: 1px solid var(--reader-border);
  background: var(--reader-header-bg);
  flex-shrink: 0;
}

.reader-title {
  font-size: 26px;
  font-weight: 650;
  line-height: 1.35;
  color: var(--reader-title);
  margin: 0 0 14px;
  overflow-wrap: anywhere;
}

.reader-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 16px;
  font-size: 13px;
  color: var(--reader-muted);
  margin-bottom: 16px;
}

.source-link,
.fallback-link {
  color: var(--reader-link);
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

.reader-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: -6px 0 16px;
}

.reader-tag {
  padding: 2px 8px;
  background: var(--reader-panel-bg);
  color: var(--reader-link);
  border: 1px solid var(--reader-border);
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.6;
}

.action-btn {
  min-height: 32px;
  padding: 7px 14px;
  border: 1px solid var(--reader-action-border);
  background: var(--reader-action-bg);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--reader-action-text);
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
  color: var(--reader-link);
  background: var(--reader-action-hover-bg);
}

.action-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.reader-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  min-height: 0;
  background: var(--reader-bg);
}

.content-section {
  max-width: 820px;
  margin: 0 auto;
}

.ai-section {
  background: var(--reader-panel-bg);
  border-left: 3px solid #409eff;
  padding: 18px 20px;
  margin: 0 0 24px;
  border-radius: 4px;
}

.ai-section-title {
  font-size: 14px;
  font-weight: 650;
  color: var(--reader-link);
  margin-bottom: 10px;
}

.ai-content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--reader-panel-text);
  white-space: pre-wrap;
}

.article-content {
  font-size: var(--reader-font-size, 16px);
  line-height: var(--reader-line-height, 1.85);
  color: var(--reader-text);
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
  color: var(--reader-heading);
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
  color: var(--reader-link);
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
  color: var(--reader-muted);
  font-size: 13px;
  line-height: 1.6;
  margin-top: -8px;
}

.article-content :deep(blockquote) {
  border-left: 3px solid var(--reader-border);
  padding-left: 16px;
  color: var(--reader-panel-text);
}

.article-content :deep(pre) {
  overflow-x: auto;
  padding: 14px 16px;
  background: var(--reader-code-block-bg);
  color: var(--reader-code-block-text);
  border-radius: 4px;
}

.article-content :deep(code) {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 0.92em;
  background: var(--reader-code-inline-bg);
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
  border: 1px solid var(--reader-table-border);
  padding: 8px 10px;
  text-align: left;
}

.content-fallback {
  border: 1px solid var(--reader-table-border);
  background: var(--reader-fallback-bg);
  border-radius: 4px;
  padding: 20px;
  color: var(--reader-panel-text);
  line-height: 1.7;
}

.fallback-title {
  font-size: 16px;
  font-weight: 650;
  color: var(--reader-title);
  margin-bottom: 8px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--reader-muted);
}

.reader-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px;
  text-align: center;
  color: var(--reader-muted);
  background: var(--reader-bg);
}

.state-icon {
  width: 40px;
  height: 40px;
  color: var(--reader-link);
}

.error-state .state-icon {
  color: #dc2626;
}

.state-title {
  font-size: 17px;
  font-weight: 650;
  color: var(--reader-title);
}

.state-text {
  max-width: 520px;
  font-size: 14px;
  line-height: 1.7;
}

.spinning {
  animation: spin 1s linear infinite;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 720px) {
  .reader-header {
    padding: 20px;
  }

  .reader-title {
    font-size: 22px;
  }

  .reader-content {
    padding: 20px;
  }

  .action-btn {
    flex: 1 1 140px;
    justify-content: center;
  }
}
</style>
