# ReaderView 阅读体验交互增强 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 Mercury 阅读区(ReaderView)增加 6 类阅读体验交互：摘要流式输出、快速调节栏、代码块复制、图片灯箱、阅读进度条+返回顶部、上/下一篇导航。

**Architecture:** 主题架构(三栏布局、CSS 变量、亮/暗主题)不动。改动集中在 `ReaderView.vue`；导航与摘要流式订阅在 `App.vue`；摘要流式事件通道在主进程(对称已有的翻译流式)。操作 `v-html` DOM 的功能(代码复制/图片灯箱)与现有高亮着色协调，共用渲染后时机。

**Tech Stack:** Electron 38 / Vue3 `<script setup>` + TS / better-sqlite3 / Vite。

**测试约定：** 本项目不用 vitest。后端测试是 `test/*.cjs`(node:assert)，`npm run build:main` 后用 `npx electron --no-sandbox test/<name>.cjs` 跑，结尾 `process.exit(0)`，成功打印标识。前端(.vue)无 vue-tsc 校验，靠 `npm run build` 编译通过 + 手动验收。不动 `package.json`(有无关未提交改动，勿 git add)。

---

## 文件清单

**主进程(修改)：**
- `src/main/services/SummaryService.ts` — 新增流式 summarize 方法(带 onChunk 回调，完成后落库)
- `src/main/index.ts` — `summarize-article` handler 改为流式推送 `summary-progress`
- `src/preload/index.ts` — 新增 `onSummaryProgress`
- `src/renderer/env.d.ts` — `onSummaryProgress` 类型

**前端(修改)：**
- `src/renderer/components/ReaderView.vue` — 调节栏、代码复制、图片灯箱、进度条、返回顶部、上下篇按钮、摘要流式态
- `src/renderer/App.vue` — 摘要流式订阅、上下篇导航逻辑、正文宽度设置加载
- `src/renderer/styles/index.css` — 新增 `--reading-content-width` 默认值

**测试(新建)：**
- `test/feature-summary-stream.cjs` — 验证流式 summarize 回调与落库

**执行顺序：** Task 1-2(摘要流式) → 3(调节栏) → 4(进度条+返回顶部) → 5(上下篇) → 6(代码复制) → 7(图片灯箱)。每个 Task 末尾 commit。

---

## Task 1：SummaryService 流式方法

**Files:**
- Modify: `src/main/services/SummaryService.ts`
- Test: `test/feature-summary-stream.cjs`(新建)

当前 `SummaryService.summarize(articleId, length)` 用 `agent.summarizeWithUsage` 非流式，写 agent_runs + llm_usage。SummaryAgent 已有 `summarizeStream(markdown, options): AsyncIterable<string>`。本任务加一个流式变体，逐块回调，结束后把完整文本落库(usage 在流式下可能拿不到 token，允许为空)。

- [ ] **Step 1: 阅读现有 summarize 方法**

Read `src/main/services/SummaryService.ts` 全文，确认 import(randomUUID、SummaryAgent、Repository)、构造函数 `(repository, getConfig)`、现有 summarize 的落库结构(createAgentRun 的字段名)。

- [ ] **Step 2: 新增 summarizeStream 方法**

在 SummaryService 类内、现有 `summarize` 方法之后新增：

```typescript
  async summarizeStream(
    articleId: string,
    length: 'short' | 'medium' | 'long' = 'medium',
    onChunk: (chunk: string) => void
  ): Promise<string> {
    if (!articleId.trim()) {
      throw new Error('Article ID cannot be empty')
    }
    const content = this.repository.getArticleContent(articleId)
    if (!content) {
      throw new Error(`Article not found: ${articleId}`)
    }
    const markdown = content.cleanedMarkdown || content.rawHtml
    if (!markdown || !markdown.trim()) {
      throw new Error('文章内容为空，请先打开文章抓取正文')
    }

    const startedAt = Date.now()
    const runId = randomUUID()
    try {
      const config = await this.getConfig()
      const agent = new SummaryAgent(config)
      let full = ''
      for await (const chunk of agent.summarizeStream(markdown, { title: content.title, length })) {
        full += chunk
        onChunk(chunk)
      }
      this.repository.createAgentRun({
        id: runId,
        entryId: articleId,
        agentType: 'summary',
        inputText: markdown,
        outputText: full,
        status: 'completed',
        startedAt,
        completedAt: Date.now()
      })
      return full
    } catch (error) {
      this.repository.createAgentRun({
        id: runId,
        entryId: articleId,
        agentType: 'summary',
        inputText: markdown,
        outputText: '',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        startedAt,
        completedAt: Date.now()
      })
      throw error
    }
  }
```

注意：字段名(entryId/agentType/inputText/outputText/status/startedAt/completedAt)必须与 Step 1 看到的现有 createAgentRun 调用完全一致，若有出入以现有代码为准。

- [ ] **Step 3: 新建 test/feature-summary-stream.cjs**

用一个 mock provider 注入到 SummaryAgent 不方便(SummaryService 内部 new SummaryAgent)，所以测试走"无效 host → 失败路径"验证 control flow：流式失败时抛错且写 failed agent_run。

```javascript
const assert = require('node:assert/strict')
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path')
const { initDatabaseAtPath } = require('../dist/main/database/init.js')
const { Repository } = require('../dist/main/database/repository.js')
const { SummaryService } = require('../dist/main/services/SummaryService.js')

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercury-sumstream-'))
  const db = initDatabaseAtPath(path.join(tempDir, 'mercury.db'))
  const repo = new Repository(db); const now = Date.now()
  repo.createFeed({ id: 'f1', title: 'F', feedTitle: 'F', customTitle: null, url: 'https://e.com/f.xml', description: null, siteUrl: 'https://e.com', faviconUrl: null, refreshIntervalMinutes: 0, lastRefreshedAt: now, lastError: null, createdAt: now, updatedAt: now })
  repo.upsertEntry({ id: 'e1', feedId: 'f1', title: 'T', url: 'https://e.com/1', author: 'A', publishedAt: now, guid: 'g1', excerpt: 'x', isRead: false, createdAt: now })
  repo.upsertEntryContent({ entryId: 'e1', rawHtml: null, cleanedHtml: null, cleanedMarkdown: 'Some article body to summarize.', fetchedAt: now })

  const svc = new SummaryService(repo, () => ({ baseUrl: 'http://invalid-host-xyz/v1', apiKey: 'k', model: 'm' }))

  // 空文章 id 抛错
  await assert.rejects(() => svc.summarizeStream('', 'medium', () => {}))

  // 无效 host → 流式失败抛错，且写入 failed agent_run
  let chunks = 0
  await assert.rejects(() => svc.summarizeStream('e1', 'short', () => { chunks++ }))
  const run = db.prepare("SELECT * FROM agent_runs WHERE entry_id='e1' AND agent_type='summary'").get()
  assert.ok(run, 'a summary agent_run should be recorded')
  assert.equal(run.status, 'failed')

  db.close(); fs.rmSync(tempDir, { recursive: true, force: true })
}
main().then(() => { console.log('Summary stream tests passed'); process.exit(0) })
  .catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 4: 编译 + 运行测试**

Run: `npm run build:main && npx electron --no-sandbox test/feature-summary-stream.cjs`
Expected: 打印 `Summary stream tests passed`，exit 0。

- [ ] **Step 5: Commit**

```bash
git add src/main/services/SummaryService.ts test/feature-summary-stream.cjs
git commit -m "feat(summary): streaming summarize variant with chunk callback"
```

---

## Task 2：摘要流式 IPC 事件通道 + 前端订阅

**Files:**
- Modify: `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/env.d.ts`, `src/renderer/components/ReaderView.vue`, `src/renderer/App.vue`

- [ ] **Step 1: index.ts 改 summarize-article 为流式推送**

当前(约 205 行):
```typescript
  ipcMain.handle('summarize-article', async (_event, articleId: string, length?: 'short' | 'medium' | 'long') =>
    cloneForIpc(await getSummaryService().summarize(articleId, length))
  )
```
改为:
```typescript
  ipcMain.handle('summarize-article', async (_event, articleId: string, length?: 'short' | 'medium' | 'long') =>
    cloneForIpc(await getSummaryService().summarizeStream(articleId, length, (chunk) => {
      mainWindow?.webContents.send('summary-progress', { articleId, chunk, done: false })
    }).then((full) => {
      mainWindow?.webContents.send('summary-progress', { articleId, chunk: '', done: true })
      return full
    }))
  )
```
确认 `mainWindow` 在 index.ts 是模块级变量(翻译流式 Task 6 已用 `mainWindow?.webContents.send`，按相同写法)。

- [ ] **Step 2: preload 暴露 onSummaryProgress**

参照现有 `onTranslateProgress`(约 45 行)，在其后加：
```typescript
  onSummaryProgress: (cb: (payload: { articleId: string; chunk: string; done: boolean }) => void) => {
    const listener = (_e: unknown, payload: { articleId: string; chunk: string; done: boolean }) => cb(payload)
    ipcRenderer.on('summary-progress', listener)
    return () => ipcRenderer.removeListener('summary-progress', listener)
  },
```

- [ ] **Step 3: env.d.ts 类型**

在 `onTranslateProgress` 类型附近加：
```typescript
      onSummaryProgress: (cb: (payload: { articleId: string; chunk: string; done: boolean }) => void) => () => void
```

- [ ] **Step 4: ReaderView 摘要区显示流式态**

ReaderView 的摘要展示当前是 `<section v-if="article.summary">`。新增一个 prop `summaryStreaming?: boolean`(标识生成中)。在 defineProps 的对象里加(与 article 同级)：
```typescript
  summaryStreaming?: boolean
```
模板把摘要 section 改为(显示生成中光标)：
```html
          <section v-if="article && (article.summary || summaryStreaming)" class="ai-section">
            <div class="ai-section-title">AI 摘要</div>
            <div class="ai-content">{{ article.summary }}<span v-if="summaryStreaming" class="stream-cursor">▋</span></div>
          </section>
```
style 加:
```css
.stream-cursor { animation: blink 1s step-end infinite; color: #409eff; }
@keyframes blink { 50% { opacity: 0; } }
```

- [ ] **Step 5: App.vue 订阅 summary-progress + 改 handleSummarize**

在 onMounted 里(现有 onTranslateProgress 订阅之后)加：
```typescript
  if (window.electronAPI?.onSummaryProgress) {
    unsubscribeSummary = window.electronAPI.onSummaryProgress((payload) => {
      if (payload.articleId !== selectedArticleId.value || !selectedArticleContent.value) return
      if (payload.done) { summaryStreaming.value = false; return }
      selectedArticleContent.value = {
        ...selectedArticleContent.value,
        summary: (selectedArticleContent.value.summary ?? '') + payload.chunk
      }
    })
  }
```
script 顶部状态区加：
```typescript
const summaryStreaming = ref(false)
let unsubscribeSummary: (() => void) | null = null
```
onUnmounted 里加 `unsubscribeSummary?.()`(与 unsubscribeTranslate 并列)。
handleSummarize(约 738 行)改为流式前先清空旧摘要 + 置流式态：
```typescript
const handleSummarize = async (length: 'short' | 'medium' | 'long' = 'medium') => {
  if (!window.electronAPI || !selectedArticleId.value || !selectedArticleContent.value) {
    alert('请先选择一篇文章')
    return
  }
  try {
    selectedArticleContent.value = { ...selectedArticleContent.value, summary: '' }
    summaryStreaming.value = true
    const summary = await window.electronAPI.summarizeArticle(selectedArticleId.value, length)
    selectedArticleContent.value = { ...selectedArticleContent.value, summary }
  } catch (error) {
    console.error('Failed to summarize article', error)
    alert(`摘要生成失败：${error instanceof Error ? error.message : String(error)}`)
  } finally {
    summaryStreaming.value = false
  }
}
```
handleSelectArticle 里(切文章重置处，现有重置 translationSegments/highlights 附近)加 `summaryStreaming.value = false`。
`<ReaderView>` 标签加 `:summaryStreaming="summaryStreaming"`。

- [ ] **Step 6: 编译验证**

Run: `npm run build`
Expected: renderer + main 均编译通过。

- [ ] **Step 7: Commit**

```bash
git add src/main/index.ts src/preload/index.ts src/renderer/env.d.ts src/renderer/components/ReaderView.vue src/renderer/App.vue
git commit -m "feat(summary): streaming progress channel + live display"
```

---

## Task 3：阅读区快速调节栏

**Files:**
- Modify: `src/renderer/components/ReaderView.vue`, `src/renderer/App.vue`, `src/renderer/styles/index.css`

新增"Aa"按钮 + 浮层，调字号/行高/正文宽度，即时生效 + 持久化到 settings，与设置页共享 key。**不做独立阅读主题**。

- [ ] **Step 1: index.css 加正文宽度默认变量**

在 `:root` 块(约第 7-17 行)内，`--reading-line-height: 1.8;` 之后加：
```css
  --reading-content-width: 820px;
```

- [ ] **Step 2: ReaderView content-section 用变量**

把 `.content-section`(约 390 行)的 `max-width: 820px;` 改为：
```css
  max-width: var(--reading-content-width, 820px);
```

- [ ] **Step 3: ReaderView 加 Aa 按钮 + 浮层**

在 `.reader-actions` 的按钮组里(导出按钮之后)加一个调节按钮：
```html
          <button class="action-btn" @click="toggleReadingPanel" title="阅读设置">
            <Type class="action-icon" />
            <span>Aa</span>
          </button>
```
从 lucide 引入 Type：把 import 行改为含 `Type`：
```typescript
import { BookOpen, Circle, Download, FileText, Languages, Star, Tag, Type } from 'lucide-vue-next'
```
在 `.reader-header` 内(actions 之后、`</header>` 之前)加浮层：
```html
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
```

- [ ] **Step 4: ReaderView 调节逻辑**

script 加(emit 已有 defineEmits，新增一个事件)：在 defineEmits 对象里加：
```typescript
  'reading-setting': [key: 'reading.fontSize' | 'reading.lineHeight' | 'reading.contentWidth', value: string]
```
状态与方法：
```typescript
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
```
点击浮层外部关闭：onScroll 开头已隐藏 toolbar，这里也在 onScroll 开头加 `readingPanelOpen.value = false`；并在 watch article.id 重置处加 `readingPanelOpen.value = false`。

- [ ] **Step 5: ReaderView 浮层样式**

style 加：
```css
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
```
确认 `.reader-header` 是 `position: relative`(浮层用了 absolute + top:96px 相对 header)。读 .reader-header 样式，若无 position 则加 `position: relative;`。

- [ ] **Step 6: App.vue 接线 reading-setting + 加载 contentWidth**

`<ReaderView>` 加 `@reading-setting="handleReadingSetting"`。script 加：
```typescript
const handleReadingSetting = (key: string, value: string) => {
  if (!window.electronAPI) return
  window.electronAPI.saveSetting(key, value).catch((e) => console.error('Failed to save reading setting', e))
}
```
applyReadingSettings(约 302 行)里，加载并应用 contentWidth：在读取 lineHeight 之后加：
```typescript
    const contentWidth = await window.electronAPI.getSetting('reading.contentWidth')
```
在设置 `--reading-line-height` 之后加：
```typescript
    if (contentWidth) root.style.setProperty('--reading-content-width', contentWidth + 'px')
```

- [ ] **Step 7: 编译验证**

Run: `npm run build`
Expected: 通过。

- [ ] **Step 8: Commit**

```bash
git add src/renderer/components/ReaderView.vue src/renderer/App.vue src/renderer/styles/index.css
git commit -m "feat(reader): quick reading settings panel (font/line-height/width)"
```

---

## Task 4：阅读进度条 + 返回顶部

**Files:**
- Modify: `src/renderer/components/ReaderView.vue`

复用现有 onScroll，拆成「即时 UI 更新」+「防抖存 DB」。

- [ ] **Step 1: 拆分 onScroll**

当前 onScroll(约 260 行)：
```typescript
const onScroll = () => {
  toolbar.value.visible = false
  const el = contentRef.value
  if (!el) return
  const articleId = props.article?.id
  if (!articleId) return
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    const max = el.scrollHeight - el.clientHeight
    const percent = max > 0 ? el.scrollTop / max : 0
    emit('scroll', articleId, percent)
  }, 500)
}
```
改为(即时更新进度条/返回顶部，防抖部分只存 DB)：
```typescript
const onScroll = () => {
  toolbar.value.visible = false
  readingPanelOpen.value = false
  const el = contentRef.value
  if (!el) return
  const max = el.scrollHeight - el.clientHeight
  const percent = max > 0 ? el.scrollTop / max : 0
  scrollProgress.value = percent
  showBackTop.value = el.scrollTop > 600
  const articleId = props.article?.id
  if (!articleId) return
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    emit('scroll', articleId, percent)
  }, 500)
}
```
注意：Step 必须保留现有 `emit('scroll', articleId, percent)` 的防抖存 DB 行为(Task 8 进度持久化)。如果 Task 3 已在 onScroll 开头加了 `readingPanelOpen.value = false`，不要重复。

- [ ] **Step 2: 加状态 + 回到顶部方法**

script 加：
```typescript
const scrollProgress = ref(0)
const showBackTop = ref(false)

const scrollToTop = () => {
  contentRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
}
```
切文章重置(watch article.id 内)加：`scrollProgress.value = 0; showBackTop.value = false`。

- [ ] **Step 3: 模板加进度条 + 返回顶部按钮**

在 `.reader-header` 内底部(`</header>` 之前)加进度条：
```html
        <div class="reading-progress" :style="{ width: (scrollProgress * 100) + '%' }"></div>
```
在 `.reader-content`(main)之后、`</div>`(reader-container)之前，加返回顶部浮按钮：
```html
      <button v-if="showBackTop" class="back-top-btn" @click="scrollToTop" title="返回顶部">
        <ArrowUp :size="18" />
      </button>
```
从 lucide 引入 ArrowUp(加到现有 import)：
```typescript
import { ArrowUp, BookOpen, Circle, Download, FileText, Languages, Star, Tag, Type } from 'lucide-vue-next'
```

- [ ] **Step 4: 样式**

```css
.reading-progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  background: #409eff;
  transition: width 0.1s linear;
}
.back-top-btn {
  position: absolute;
  right: 28px;
  bottom: 28px;
  z-index: 30;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.back-top-btn:hover { border-color: #409eff; color: #409eff; }
```
进度条用 `.reader-header { position: relative }`(Task 3 Step 5 已确保)；返回顶部按钮相对 `.reader-container` 定位，确认 `.reader-container` 是 `position: relative` 或给 `.reader-view` 加(reader-view 已是 flex 容器，给它加 position: relative)。读现有 `.reader-view` / `.reader-container` 样式后选一个合适的定位父级。

- [ ] **Step 5: 编译验证**

Run: `npm run build`
Expected: 通过。

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/ReaderView.vue
git commit -m "feat(reader): reading progress bar + back-to-top button"
```

---

## Task 5：上/下一篇导航

**Files:**
- Modify: `src/renderer/components/ReaderView.vue`, `src/renderer/App.vue`

- [ ] **Step 1: ReaderView 加按钮 + props + emit**

defineProps 加(与 article 同级)：
```typescript
  hasPrev?: boolean
  hasNext?: boolean
```
defineEmits 加：
```typescript
  navigate: [direction: 'prev' | 'next']
```
模板在 `.reader-actions` 按钮组开头(短摘要按钮之前)加：
```html
          <button class="action-btn" :disabled="!hasPrev" @click="$emit('navigate', 'prev')" title="上一篇">
            <ChevronLeft class="action-icon" />
            <span>上一篇</span>
          </button>
          <button class="action-btn" :disabled="!hasNext" @click="$emit('navigate', 'next')" title="下一篇">
            <ChevronRight class="action-icon" />
            <span>下一篇</span>
          </button>
```
从 lucide 引入 ChevronLeft, ChevronRight(加到现有 import)。
style 加(禁用态)：
```css
.action-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.action-btn:disabled:hover { border-color: #dcdfe6; color: #4b5563; background: #ffffff; }
```

- [ ] **Step 2: App.vue 导航逻辑 + 计算 hasPrev/hasNext**

script 加 computed(基于当前可见列表 `articles` —— 它是 computed，反映 filter/搜索后的顺序)：
```typescript
const currentIndex = computed(() => articles.value.findIndex((a) => a.id === selectedArticleId.value))
const hasPrev = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value >= 0 && currentIndex.value < articles.value.length - 1)

const handleNavigate = (direction: 'prev' | 'next') => {
  const idx = currentIndex.value
  if (idx < 0) return
  const target = direction === 'prev' ? articles.value[idx - 1] : articles.value[idx + 1]
  if (target) void handleSelectArticle(target.id)
}
```
确认 `articles` 是 computed 且有 `.value`(在 script 中访问用 .value)。`<ReaderView>` 加：
```html
        :hasPrev="hasPrev"
        :hasNext="hasNext"
        @navigate="handleNavigate"
```

- [ ] **Step 3: 编译验证**

Run: `npm run build`
Expected: 通过。

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/ReaderView.vue src/renderer/App.vue
git commit -m "feat(reader): prev/next article navigation buttons"
```

---

## Task 6：代码块复制按钮

**Files:**
- Modify: `src/renderer/components/ReaderView.vue`

正文 `v-html` 渲染后，给每个 `<pre>` 注入复制按钮。与高亮着色(在 renderedHtml computed 里做字符串替换)不冲突，但都依赖 article 渲染后时机——本任务在 watch article + nextTick 后操作 DOM，需幂等(防重复注入)。

- [ ] **Step 1: 加渲染后处理函数**

script 加：
```typescript
const enhanceCodeBlocks = () => {
  const container = articleRef.value
  if (!container) return
  const pres = container.querySelectorAll('pre')
  pres.forEach((pre) => {
    const el = pre as HTMLElement
    if (el.dataset.copyEnhanced === '1') return
    el.dataset.copyEnhanced = '1'
    el.style.position = 'relative'
    const btn = document.createElement('button')
    btn.className = 'code-copy-btn'
    btn.textContent = '复制'
    btn.addEventListener('click', () => {
      const code = el.querySelector('code')
      const text = (code ?? el).textContent ?? ''
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '已复制 ✓'
        setTimeout(() => { btn.textContent = '复制' }, 1500)
      }).catch(() => {
        btn.textContent = '复制失败'
        setTimeout(() => { btn.textContent = '复制' }, 1500)
      })
    })
    el.appendChild(btn)
  })
}
```

- [ ] **Step 2: 在文章渲染后调用**

复用现有 watch(article.id)。在该 watch 回调末尾(滚动恢复之后)加 `enhanceCodeBlocks()`。由于 watch 回调已 `await nextTick()`，DOM 已就绪。
注意：renderedHtml 是 computed，高亮变化时 v-html 重渲染会清掉注入的按钮。为覆盖"高亮后按钮丢失"，再加一个 watch：
```typescript
watch(renderedHtml, async () => {
  await nextTick()
  enhanceCodeBlocks()
})
```
(renderedHtml 变化涵盖 article 切换和高亮增减，单独 watch 它即可覆盖；可保留 article.id watch 末尾的调用作为首次渲染兜底，幂等不会重复注入。)

- [ ] **Step 3: 样式**

```css
.article-content :deep(pre) { position: relative; }
.code-copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 12px;
  padding: 2px 8px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.12);
  color: #f9fafb;
  border-radius: 4px;
  cursor: pointer;
}
.code-copy-btn:hover { background: rgba(255, 255, 255, 0.25); }
```
(`<pre>` 现有样式是深色背景 `#111827`，按钮用浅色描边适配。)

- [ ] **Step 4: 编译 + 手动验收**

Run: `npm run build`
Expected: 通过。手动:打开含代码块的文章 → 代码块右上角有"复制"按钮 → 点击复制成功并反馈 → 加一个高亮后按钮仍在。

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/ReaderView.vue
git commit -m "feat(reader): copy button on code blocks"
```

---

## Task 7：图片点击灯箱

**Files:**
- Modify: `src/renderer/components/ReaderView.vue`

- [ ] **Step 1: 事件委托 + 灯箱状态**

script 加：
```typescript
const lightboxSrc = ref<string | null>(null)

const onArticleClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.tagName === 'IMG') {
    const src = (target as HTMLImageElement).src
    if (src) lightboxSrc.value = src
  }
}

const closeLightbox = () => { lightboxSrc.value = null }

const onLightboxKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeLightbox()
}

watch(lightboxSrc, (val) => {
  if (val) document.addEventListener('keydown', onLightboxKey)
  else document.removeEventListener('keydown', onLightboxKey)
})
```
组件卸载时移除监听：若 ReaderView 已 import onUnmounted 则用，否则加 import 并：
```typescript
onUnmounted(() => { document.removeEventListener('keydown', onLightboxKey) })
```
(检查 ReaderView 顶部 import，当前是 `import { computed, nextTick, ref, watch } from 'vue'` —— 需加 onUnmounted。)

- [ ] **Step 2: 模板绑定点击 + 灯箱层**

给正文 `<article>` 加 `@click="onArticleClick"`(它已有 `@mouseup="onTextSelect"`，两者不冲突)。读模板确认 article 标签当前属性，追加 click。
在模板根 `.reader-view` 内末尾(或用 Teleport 到 body)加灯箱：
```html
    <Teleport to="body">
      <div v-if="lightboxSrc" class="lightbox-overlay" @click="closeLightbox">
        <img :src="lightboxSrc" class="lightbox-img" @click.stop />
      </div>
    </Teleport>
```

- [ ] **Step 3: 样式**

```css
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}
.lightbox-img {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 4px;
  cursor: default;
}
```

- [ ] **Step 4: 编译 + 手动验收**

Run: `npm run build`
Expected: 通过。手动:打开含图片文章 → 点图片弹灯箱 → 点空白处/Esc 关闭 → 选中图片附近文字仍能触发高亮工具栏(不被 click 干扰)。

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/ReaderView.vue
git commit -m "feat(reader): image lightbox on click"
```

---

## 验收清单

- [ ] 7 个功能全部完成，每个已 commit
- [ ] `npm run build` 通过(renderer + main)
- [ ] `test/feature-summary-stream.cjs` 通过；现有 `test/services-regression.cjs` 等不回归
- [ ] 三栏布局、亮/暗主题未改变
- [ ] 现有功能不被破坏：划词高亮(选中弹工具栏、重新着色)、滚动进度持久化(切文章恢复位置)、翻译双语对照、收藏、标签
- [ ] 手动冒烟：摘要流式逐字出现、调节栏改字号/行高/宽度即时生效且重启保留、代码复制、图片灯箱、进度条、返回顶部、上下篇导航各跑一遍

## 不做(YAGNI)
- 不引入独立阅读主题(sepia)，复用全局亮/暗
- 不加键盘快捷键
- 不动三栏布局/不做面板折叠拖拽/不做 Toast 系统/不做无限滚动
- 不引入新 UI 组件库
