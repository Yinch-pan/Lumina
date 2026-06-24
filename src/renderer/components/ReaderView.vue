<template>
  <div class="reader-view">
    <div v-if="article" class="reader-container">
      <header v-if="readerMode === 'clean'" class="reader-header">
        <h1 class="reader-title">{{ article.title }}</h1>

        <div class="reader-meta">
          <span v-if="article.author">{{ article.author }}</span>
          <span>{{ article.publishedAt }}</span>
          <button type="button" class="source-link" @click="openInlineWeb(article.sourceUrl)">
            &#26597;&#30475;&#21407;&#25991;
          </button>
        </div>

        <div class="reader-actions">
          <button class="action-btn" @click="$emit('summarize', 'short')">
            <FileText class="action-icon" />
            <span>&#30701;&#25688;&#35201;</span>
          </button>
          <button class="action-btn" @click="$emit('summarize', 'medium')">
            <FileText class="action-icon" />
            <span>&#20013;&#25688;&#35201;</span>
          </button>
          <button class="action-btn" @click="$emit('summarize', 'long')">
            <FileText class="action-icon" />
            <span>&#38271;&#25688;&#35201;</span>
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
          <button class="action-btn" @click="$emit('toggle-star')">
            <Star class="action-icon" />
            <span>{{ article && article.isStarred ? '取消收藏' : '收藏' }}</span>
          </button>
          <button class="action-btn" @click="$emit('export')">
            <Download class="action-icon" />
            <span>&#23548;&#20986;</span>
          </button>
          <button class="action-btn" @click="toggleReadingPanel" title="阅读设置">
            <Type class="action-icon" />
            <span>Aa</span>
          </button>
        </div>

        <div v-if="readingPanelOpen" class="reading-panel">
          <div class="rp-row">
            <span class="rp-label">字号</span>
            <button class="rp-btn" @click="adjustFontSize(-1)">A−</button>
            <span class="rp-val">{{ readingFontSize }}px</span>
            <button class="rp-btn" @click="adjustFontSize(1)">A+</button>
          </div>
          <div class="rp-row">
            <span class="rp-label">行高</span>
            <button class="rp-btn" @click="adjustLineHeight(-0.1)">−</button>
            <span class="rp-val">{{ readingLineHeight.toFixed(1) }}</span>
            <button class="rp-btn" @click="adjustLineHeight(0.1)">+</button>
          </div>
          <div class="rp-row">
            <span class="rp-label">宽度</span>
            <button class="rp-btn" :class="{ active: readingWidth === 680 }" @click="setWidth(680)">窄</button>
            <button class="rp-btn" :class="{ active: readingWidth === 820 }" @click="setWidth(820)">中</button>
            <button class="rp-btn" :class="{ active: readingWidth === 960 }" @click="setWidth(960)">宽</button>
          </div>
        </div>
      </header>

      <main v-if="readerMode === 'clean'" ref="contentRef" class="reader-content" @scroll="onScroll">
        <div class="content-section">
          <section v-if="article && (article.summary || summaryStreaming)" class="ai-section">
            <div class="ai-section-title">AI &#25688;&#35201;</div>
            <div class="ai-content">{{ article.summary }}<span v-if="summaryStreaming" class="stream-cursor">▋</span></div>
          </section>

          <section v-if="translationSegments && translationSegments.length" class="ai-section">
            <div class="ai-section-title">AI &#32763;&#35793;&#65288;&#21452;&#35821;&#23545;&#29031;&#65289;</div>
            <div v-for="seg in translationSegments" :key="seg.index" class="bilingual-block">
              <p class="bilingual-source">{{ seg.source }}</p>
              <p class="bilingual-target" :class="{ failed: seg.status === 'failed' }">{{ seg.translated }}</p>
            </div>
          </section>
          <section v-else-if="article && article.translation" class="ai-section">
            <div class="ai-section-title">AI &#32763;&#35793;</div>
            <div class="ai-content">{{ article.translation }}</div>
          </section>

          <article
            v-if="hasCleanedHtml"
            ref="articleRef"
            class="article-content"
            v-html="renderedHtml"
            @mouseup="onTextSelect"
          ></article>
          <div v-else class="content-fallback">
            <div class="fallback-title">&#27491;&#25991;&#26242;&#26102;&#26080;&#27861;&#26174;&#31034;</div>
            <p>&#35831;&#25171;&#24320;&#21407;&#25991;&#26597;&#30475;&#23436;&#25972;&#20869;&#23481;&#12290;</p>
            <button type="button" class="fallback-link" @click="openInlineWeb(article.sourceUrl)">
              &#26597;&#30475;&#21407;&#25991;
            </button>
          </div>

          <section v-if="allHighlights.length" class="notes-section">
            <div class="ai-section-title">&#31508;&#35760;&#19982;&#39640;&#20142;</div>
            <div v-for="h in allHighlights" :key="h.id" class="note-item">
              <div class="note-quote" :class="'hl-' + h.color">{{ h.selectedText }}</div>
              <div v-if="h.note" class="note-text">{{ h.note }}</div>
              <button class="note-del" @click="emit('delete-highlight', h.id)">&#21024;&#38500;</button>
            </div>
          </section>
        </div>

        <div v-if="toolbar.visible" class="hl-toolbar" :style="{ top: toolbar.y + 'px', left: toolbar.x + 'px' }">
          <button
            v-for="c in HIGHLIGHT_COLORS"
            :key="c"
            class="hl-color"
            :class="'hl-' + c"
            :title="'&#39640;&#20142;&#65306;' + c"
            @mousedown.prevent="applyHighlight(c)"
          ></button>
          <button class="hl-note-btn" @mousedown.prevent="applyHighlightWithNote">+&#31508;&#35760;</button>
        </div>
      </main>

      <section v-else class="web-view">
        <div class="web-toolbar">
          <button
            class="web-nav-btn"
            :disabled="!canGoBack"
            title="&#21518;&#36864;"
            @click="webGoBack"
          >
            <ChevronLeft class="web-nav-icon" />
          </button>
          <button
            class="web-nav-btn"
            :disabled="!canGoForward"
            title="&#21069;&#36827;"
            @click="webGoForward"
          >
            <ChevronRight class="web-nav-icon" />
          </button>
          <button class="web-nav-btn" title="&#21047;&#26032;" @click="webReload">
            <RotateCw class="web-nav-icon" />
          </button>
          <span class="web-url" :title="currentUrl">{{ currentUrl }}</span>
          <button class="web-text-btn" title="&#22312;&#31995;&#32479;&#27983;&#35272;&#22120;&#25171;&#24320;" @click="openInSystemBrowser">
            <ExternalLink class="web-nav-icon" />
          </button>
          <button class="web-text-btn web-back-reader" @click="closeInlineWeb">
            <BookOpen class="web-nav-icon" />
            <span>&#36820;&#22238;&#38405;&#35835;&#35270;&#22270;</span>
          </button>
        </div>
        <webview
          ref="webviewRef"
          class="web-frame"
          :src="webUrl"
        ></webview>
      </section>
    </div>

    <div v-else class="empty-state">
      <BookOpen class="empty-icon" />
      <div class="empty-text">&#36873;&#25321;&#19968;&#31687;&#25991;&#31456;&#24320;&#22987;&#38405;&#35835;</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Circle,
  Download,
  ExternalLink,
  FileText,
  Languages,
  RotateCw,
  Star,
  Tag,
  Type
} from 'lucide-vue-next'

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
    isStarred?: boolean
    scrollPercent?: number
    tags: string[]
  } | null
  summaryStreaming?: boolean
  translationSegments?: Array<{
    index: number
    source: string
    translated: string
    status: 'success' | 'failed'
  }>
  highlights?: Array<{
    id: string
    entryId: string
    selectedText: string
    prefixText: string | null
    suffixText: string | null
    color: string
    note: string | null
    createdAt: number
  }>
}>()

const emit = defineEmits<{
  summarize: [length: 'short' | 'medium' | 'long']
  translate: []
  'add-tag': []
  'mark-unread': []
  'toggle-star': []
  export: []
  scroll: [articleId: string, percent: number]
  'add-highlight': [
    input: {
      selectedText: string
      prefixText?: string
      suffixText?: string
      color: string
      note?: string
    }
  ]
  'delete-highlight': [id: string]
  'reading-setting': [key: 'reading.fontSize' | 'reading.lineHeight' | 'reading.contentWidth', value: string]
}>()

const hasCleanedHtml = computed(() => Boolean(props.article?.cleanedHtml?.trim()))

const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink', 'orange']
const articleRef = ref<HTMLElement | null>(null)
const toolbar = ref<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })
let pendingSelection: { text: string; prefix: string; suffix: string } | null = null

const allHighlights = computed(() => props.highlights ?? [])

// 快速阅读设置浮层
const readingPanelOpen = ref(false)
const readingFontSize = ref(16)
const readingLineHeight = ref(1.8)
const readingWidth = ref(820)

const readRootVar = (name: string, fallback: number): number => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

const toggleReadingPanel = () => {
  if (!readingPanelOpen.value) {
    readingFontSize.value = readRootVar('--reading-font-size', 16)
    readingLineHeight.value = readRootVar('--reading-line-height', 1.8)
    readingWidth.value = readRootVar('--reading-content-width', 820)
  }
  readingPanelOpen.value = !readingPanelOpen.value
}

const adjustFontSize = (delta: number) => {
  readingFontSize.value = Math.min(24, Math.max(12, readingFontSize.value + delta))
  document.documentElement.style.setProperty('--reading-font-size', readingFontSize.value + 'px')
  emit('reading-setting', 'reading.fontSize', String(readingFontSize.value))
}

const adjustLineHeight = (delta: number) => {
  readingLineHeight.value = Math.min(2.2, Math.max(1.4, Math.round((readingLineHeight.value + delta) * 10) / 10))
  document.documentElement.style.setProperty('--reading-line-height', String(readingLineHeight.value))
  emit('reading-setting', 'reading.lineHeight', String(readingLineHeight.value))
}

const setWidth = (w: number) => {
  readingWidth.value = w
  document.documentElement.style.setProperty('--reading-content-width', w + 'px')
  emit('reading-setting', 'reading.contentWidth', String(w))
}

// 内嵌原文视图（迷你浏览器）
interface WebviewEl extends HTMLElement {
  src: string
  goBack(): void
  goForward(): void
  reload(): void
  canGoBack(): boolean
  canGoForward(): boolean
  getURL(): string
}

const readerMode = ref<'clean' | 'web'>('clean')
const webUrl = ref('')
const currentUrl = ref('')
const canGoBack = ref(false)
const canGoForward = ref(false)
const webviewRef = ref<WebviewEl | null>(null)

const syncNavState = () => {
  const wv = webviewRef.value
  if (!wv) return
  canGoBack.value = wv.canGoBack()
  canGoForward.value = wv.canGoForward()
  currentUrl.value = wv.getURL()
}

const onWebNavigate = () => syncNavState()

const attachWebviewListeners = () => {
  const wv = webviewRef.value
  if (!wv) return
  wv.addEventListener('did-navigate', onWebNavigate)
  wv.addEventListener('did-navigate-in-page', onWebNavigate)
}

const detachWebviewListeners = () => {
  const wv = webviewRef.value
  if (!wv) return
  wv.removeEventListener('did-navigate', onWebNavigate)
  wv.removeEventListener('did-navigate-in-page', onWebNavigate)
}

const openInlineWeb = async (url: string) => {
  if (!url) return
  webUrl.value = url
  currentUrl.value = url
  canGoBack.value = false
  canGoForward.value = false
  readerMode.value = 'web'
  await nextTick()
  attachWebviewListeners()
}

const closeInlineWeb = () => {
  detachWebviewListeners()
  readerMode.value = 'clean'
}

const webGoBack = () => webviewRef.value?.goBack()
const webGoForward = () => webviewRef.value?.goForward()
const webReload = () => webviewRef.value?.reload()
const openInSystemBrowser = () => {
  if (currentUrl.value) void window.electronAPI?.openExternal(currentUrl.value)
}

onBeforeUnmount(detachWebviewListeners)

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const renderedHtml = computed(() => {
  let html = props.article?.cleanedHtml ?? ''
  for (const h of allHighlights.value) {
    if (!h.selectedText) continue
    // 仅处理不含尖括号的纯文本，避免破坏 HTML 标签结构
    if (h.selectedText.includes('<') || h.selectedText.includes('>')) continue
    // color 白名单：防止被篡改的颜色值逃逸 class 属性造成 XSS
    const color = HIGHLIGHT_COLORS.includes(h.color) ? h.color : 'yellow'
    const re = new RegExp(escapeRegExp(h.selectedText))
    const mark = `<mark class="hl hl-${color}" data-hl-id="${h.id}">${h.selectedText}</mark>`
    // 用函数式替换，避免 selectedText 中的 $ 被当作 $&/$1 等特殊替换符
    html = html.replace(re, () => mark)
  }
  return html
})

const onTextSelect = () => {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || !sel.toString().trim()) {
    toolbar.value.visible = false
    return
  }
  const text = sel.toString()
  const range = sel.getRangeAt(0)
  const container = articleRef.value
  if (!container || !container.contains(range.commonAncestorContainer)) {
    toolbar.value.visible = false
    return
  }
  const fullText = container.textContent ?? ''
  const idx = fullText.indexOf(text)
  const prefix = idx >= 0 ? fullText.slice(Math.max(0, idx - 30), idx) : ''
  const suffix = idx >= 0 ? fullText.slice(idx + text.length, idx + text.length + 30) : ''
  pendingSelection = { text, prefix, suffix }
  const rect = range.getBoundingClientRect()
  const host = contentRef.value
  const hostRect = host?.getBoundingClientRect()
  if (hostRect && host) {
    toolbar.value = {
      visible: true,
      x: rect.left - hostRect.left + host.scrollLeft,
      y: rect.top - hostRect.top + host.scrollTop - 40
    }
  }
}

const applyHighlight = (color: string) => {
  if (!pendingSelection) return
  emit('add-highlight', {
    selectedText: pendingSelection.text,
    prefixText: pendingSelection.prefix,
    suffixText: pendingSelection.suffix,
    color
  })
  toolbar.value.visible = false
  pendingSelection = null
  window.getSelection()?.removeAllRanges()
}

const applyHighlightWithNote = () => {
  if (!pendingSelection) return
  const note = window.prompt('为这段高亮添加笔记', '') ?? ''
  emit('add-highlight', {
    selectedText: pendingSelection.text,
    prefixText: pendingSelection.prefix,
    suffixText: pendingSelection.suffix,
    color: 'yellow',
    note: note || undefined
  })
  toolbar.value.visible = false
  pendingSelection = null
  window.getSelection()?.removeAllRanges()
}

const contentRef = ref<HTMLElement | null>(null)
let scrollTimer: ReturnType<typeof setTimeout> | null = null

const onScroll = () => {
  toolbar.value.visible = false
  readingPanelOpen.value = false
  const el = contentRef.value
  if (!el) return
  // 在调度时捕获当前文章 id，避免防抖回调在切换文章后把旧位置存到新文章
  const articleId = props.article?.id
  if (!articleId) return
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    const max = el.scrollHeight - el.clientHeight
    const percent = max > 0 ? el.scrollTop / max : 0
    emit('scroll', articleId, percent)
  }, 500)
}

// 文章切换后恢复滚动位置
watch(
  () => props.article?.id,
  async () => {
    // 切换文章时复位内嵌网页，避免上一篇的页面残留到下一篇
    if (readerMode.value === 'web') {
      detachWebviewListeners()
      readerMode.value = 'clean'
      webUrl.value = ''
    }
    toolbar.value.visible = false
    readingPanelOpen.value = false
    pendingSelection = null
    window.getSelection()?.removeAllRanges()
    await nextTick()
    const el = contentRef.value
    if (!el || !props.article) return
    const percent = props.article.scrollPercent ?? 0
    const max = el.scrollHeight - el.clientHeight
    el.scrollTop = max > 0 ? percent * max : 0
  }
)
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
  position: relative;
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
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  cursor: pointer;
}

.source-link:hover,
.fallback-link:hover {
  text-decoration: underline;
}

.web-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.web-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
  background: #fafafa;
}

.web-nav-btn,
.web-text-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 5px 10px;
  border: 1px solid #dcdfe6;
  background: #ffffff;
  border-radius: 4px;
  cursor: pointer;
  color: #4b5563;
  font-size: 13px;
}

.web-nav-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.web-nav-btn:not(:disabled):hover,
.web-text-btn:hover {
  border-color: #409eff;
  color: #2563eb;
  background: #f8fbff;
}

.web-nav-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.web-url {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
}

.web-back-reader {
  flex-shrink: 0;
}

.web-frame {
  flex: 1;
  width: 100%;
  border: none;
  min-height: 0;
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

.reader-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  min-height: 0;
  position: relative;
}

.content-section {
  max-width: var(--reading-content-width, 820px);
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

.ai-section-title {
  font-size: 14px;
  font-weight: 650;
  color: #2563eb;
  margin-bottom: 10px;
}

.ai-content {
  font-size: 14px;
  line-height: 1.8;
  color: #4b5563;
  white-space: pre-wrap;
}

.bilingual-block {
  margin-bottom: 14px;
}

.bilingual-source {
  color: #909399;
  font-size: 13px;
  margin: 0 0 4px;
}

.bilingual-target {
  color: #26313d;
  margin: 0;
}

.bilingual-target.failed {
  color: #c0392b;
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

.hl {
  padding: 0 1px;
  border-radius: 2px;
}
.hl-yellow {
  background: #fff3a0;
}
.hl-green {
  background: #b8f0c0;
}
.hl-blue {
  background: #b8dcff;
}
.hl-pink {
  background: #ffc8dd;
}
.hl-orange {
  background: #ffd8a8;
}

.article-content :deep(mark.hl) {
  padding: 0 1px;
  border-radius: 2px;
}
.article-content :deep(mark.hl-yellow) {
  background: #fff3a0;
}
.article-content :deep(mark.hl-green) {
  background: #b8f0c0;
}
.article-content :deep(mark.hl-blue) {
  background: #b8dcff;
}
.article-content :deep(mark.hl-pink) {
  background: #ffc8dd;
}
.article-content :deep(mark.hl-orange) {
  background: #ffd8a8;
}

.hl-toolbar {
  position: absolute;
  z-index: 50;
  display: flex;
  gap: 4px;
  padding: 4px 6px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.hl-color {
  width: 18px;
  height: 18px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
}
.hl-note-btn {
  font-size: 12px;
  border: none;
  background: #f0f0f0;
  border-radius: 4px;
  cursor: pointer;
  padding: 0 8px;
}

.notes-section {
  margin-top: 24px;
  border-top: 1px solid #e4e7ed;
  padding-top: 16px;
}
.note-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}
.note-quote {
  font-size: 13px;
  padding: 2px 6px;
  border-radius: 3px;
  align-self: flex-start;
}
.note-text {
  font-size: 13px;
  color: #4b5563;
}
.note-del {
  font-size: 12px;
  color: #c0392b;
  background: none;
  border: none;
  cursor: pointer;
  align-self: flex-start;
  padding: 0;
}

.stream-cursor {
  animation: blink 1s step-end infinite;
  color: #409eff;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}

.reading-panel {
  position: absolute;
  right: 32px;
  top: 96px;
  z-index: 40;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rp-row { display: flex; align-items: center; gap: 8px; }
.rp-label { width: 36px; font-size: 13px; color: var(--secondary-text); }
.rp-btn {
  min-width: 32px; padding: 4px 8px; font-size: 13px; cursor: pointer;
  border: 1px solid var(--border-color); background: var(--card-bg);
  color: var(--text-color); border-radius: 4px;
}
.rp-btn:hover { border-color: #409eff; color: #409eff; }
.rp-btn.active { background: #409eff; color: #fff; border-color: #409eff; }
.rp-val { min-width: 40px; text-align: center; font-size: 13px; color: var(--text-color); }
</style>
