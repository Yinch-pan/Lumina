# 借鉴其他团队功能 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将其他 7 个同类 RSS 阅读器项目中有价值的功能落地到 Mercury，保留 Mercury 自己的三栏前端布局。

**Architecture:** 业务能力放主进程 service/repository 层，前端经 IPC 调用（沿用 `ipcMain.handle` + preload `contextBridge` 模式）。Schema 变更走新建的版本化迁移系统。逐段翻译新增 main→renderer 事件推送通道。前端只在现有组件内部扩展交互，不改三栏布局。

**Tech Stack:** Electron 38 / Vue3 + TS / better-sqlite3 / Vite / OpenAI SDK（OpenAI-compatible）。

**测试约定（重要）：** 本项目**不使用 vitest**。测试是 `test/*.cjs` 回归脚本，用 `node:assert/strict` 断言，先 `npm run build:main` 编译到 `dist/main/`，再用 `npx electron --no-sandbox test/<name>.cjs` 运行（better-sqlite3 针对 electron 编译，必须用 electron 跑，不能用纯 node）。新功能沿用此约定，新增断言加进 `test/services-regression.cjs` 或新建 `test/feature-*.cjs`。每个新测试脚本末尾 `console.log` 一行成功标识并 `main()` 同步执行（参考 services-regression.cjs 结构）。

---

## 文件清单

**主进程（新建）：**
- `src/main/security/secureStore.ts` — safeStorage 加解密封装
- `src/main/services/HighlightService.ts` — 划词高亮/笔记 CRUD
- `src/main/services/TagSuggestionService.ts` — AI 建议标签

**主进程（修改）：**
- `src/main/database/init.ts` — 版本化迁移 + WAL + FTS5 + 新表/新列
- `src/main/database/repository.ts` — 搜索、星标、滚动进度、用量统计、高亮 CRUD、FTS 同步
- `src/main/services/ArticleService.ts` — searchArticles、星标、滚动进度透传
- `src/main/services/SettingsService.ts` — API Key 加密读写
- `src/main/services/SummaryService.ts` — 摘要分档
- `src/main/services/TranslationService.ts` — 逐段流式翻译
- `src/main/services/interfaces.ts` — 接口签名更新
- `src/main/llm/agents.ts` — 摘要分档 prompt、逐段翻译、TagSuggestionAgent
- `src/main/llm/config.ts` — 分档 prompt 模板、建议标签 prompt 模板
- `src/main/types/index.ts` — 新增类型字段
- `src/main/index.ts` — 注册新 IPC handler、translate 流式传 mainWindow
- `src/preload/index.ts` — 暴露新 API + 事件订阅

**前端（修改）：**
- `src/renderer/components/ArticleList.vue` — 搜索框、星标按钮、starred 筛选
- `src/renderer/components/ReaderView.vue` — 双语对照、摘要分档、星标、滚动记忆、划词高亮工具栏
- `src/renderer/components/FeedSidebar.vue` — 「收藏」入口
- `src/renderer/components/SettingsView.vue` — 用量统计标签页
- `src/renderer/components/TagDialog.vue` — AI 建议标签
- `src/renderer/App.vue` — 接线新 handler、事件订阅、状态
- `src/renderer/env.d.ts` — electronAPI 类型声明（前端类型单一来源，每个新 API 必须在此声明）

**执行顺序：** Phase 0 → 1 → 2 → 3 → 4 → 5 → 6。每个 Task 末尾都 commit。

---

## Phase 0：地基（版本化迁移 + WAL）

### Task 0: 版本化迁移系统

**Files:**
- Modify: `src/main/database/init.ts`
- Test: `test/services-regression.cjs`（复用）

- [ ] **Step 1: initDatabaseAtPath 开头加 WAL pragma**

把 `initDatabaseAtPath` 开头改为：

```typescript
export function initDatabaseAtPath(dbPath: string): Database.Database {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('busy_timeout = 5000')
  db.pragma('foreign_keys = ON')
```

- [ ] **Step 2: 末尾 return db 前调用 runMigrations**

把 `init.ts` 中 `initDatabaseAtPath` 末尾的 `return db` 改为：

```typescript
  runMigrations(db)
  return db
}
```

- [ ] **Step 3: 文件末尾新增迁移运行器**

```typescript
type Migration = (db: Database.Database) => void

// 有序迁移列表。索引 0 对应 user_version 1。只追加，永不修改已有项。
const MIGRATIONS: Migration[] = [
  // v1: 文章星标 + 滚动进度
  (db) => {
    ensureEntryColumn(db, 'is_starred', 'INTEGER NOT NULL DEFAULT 0')
    ensureEntryColumn(db, 'scroll_percent', 'REAL NOT NULL DEFAULT 0')
  },
  // v2: 高亮/笔记表
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS highlights (
        id TEXT PRIMARY KEY,
        entry_id TEXT NOT NULL,
        selected_text TEXT NOT NULL,
        prefix_text TEXT,
        suffix_text TEXT,
        color TEXT NOT NULL DEFAULT 'yellow',
        note TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
      )
    `)
    db.exec('CREATE INDEX IF NOT EXISTS idx_highlights_entry_id ON highlights(entry_id)')
  },
  // v3: FTS5 全文索引（contentless，rowid 对齐 entries.rowid）
  (db) => {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
        title, excerpt, content,
        content='', tokenize='unicode61'
      )
    `)
    const rows = db.prepare(`
      SELECT entries.rowid AS rowid, entries.title AS title,
             entries.excerpt AS excerpt,
             COALESCE(entry_contents.cleaned_markdown, '') AS content
      FROM entries
      LEFT JOIN entry_contents ON entry_contents.entry_id = entries.id
    `).all() as Array<{ rowid: number; title: string; excerpt: string | null; content: string }>
    const insert = db.prepare('INSERT INTO entries_fts (rowid, title, excerpt, content) VALUES (?, ?, ?, ?)')
    const tx = db.transaction(() => {
      for (const row of rows) insert.run(row.rowid, row.title ?? '', row.excerpt ?? '', row.content ?? '')
    })
    tx()
  },
]

function runMigrations(db: Database.Database): void {
  const current = Number((db.pragma('user_version', { simple: true }) as number) ?? 0)
  for (let version = current; version < MIGRATIONS.length; version++) {
    const migrate = MIGRATIONS[version]
    const tx = db.transaction(() => {
      migrate(db)
      db.pragma(`user_version = ${version + 1}`)
    })
    tx()
  }
}

function ensureEntryColumn(db: Database.Database, columnName: string, definition: string): void {
  const columns = db.prepare('PRAGMA table_info(entries)').all() as Array<{ name: string }>
  if (!columns.some((c) => c.name === columnName)) {
    db.exec(`ALTER TABLE entries ADD COLUMN ${columnName} ${definition}`)
  }
}
```

- [ ] **Step 4: 编译**

Run: `npm run build:main`
Expected：tsc 无错误。

- [ ] **Step 5: 回归测试**

Run: `npm run build:main && npx electron --no-sandbox test/services-regression.cjs`
Expected：`Services regression tests passed`，exit 0。

- [ ] **Step 6: Commit**

```bash
git add src/main/database/init.ts
git commit -m "feat(db): versioned migrations, WAL, starred/scroll cols, highlights, FTS5"
```

---

## Phase 1：全文搜索（A1）

### Task 1: FTS 同步 + 搜索查询

**Files:**
- Modify: `src/main/database/repository.ts`
- Test: `test/feature-search.cjs`（新建）

- [ ] **Step 1: upsertEntry 两处 return 前同步 FTS**

更新分支 `return { id: existing.id, inserted: false }` 前加 `this.syncEntryFts(existing.id)`；插入分支 `return { id: entry.id, inserted: true }` 前加 `this.syncEntryFts(entry.id)`。

- [ ] **Step 2: upsertEntryContent 的 .run(content) 后加同步**

```typescript
    this.syncEntryFts(content.entryId)
```

- [ ] **Step 3: Repository 内新增 syncEntryFts + searchArticles**

```typescript
  private syncEntryFts(entryId: string): void {
    const row = this.db.prepare(`
      SELECT entries.rowid AS rowid, entries.title AS title,
             entries.excerpt AS excerpt,
             COALESCE(entry_contents.cleaned_markdown, '') AS content
      FROM entries
      LEFT JOIN entry_contents ON entry_contents.entry_id = entries.id
      WHERE entries.id = ?
    `).get(entryId) as { rowid: number; title: string; excerpt: string | null; content: string } | undefined
    if (!row) return
    this.db.prepare('DELETE FROM entries_fts WHERE rowid = ?').run(row.rowid)
    this.db.prepare('INSERT INTO entries_fts (rowid, title, excerpt, content) VALUES (?, ?, ?, ?)')
      .run(row.rowid, row.title ?? '', row.excerpt ?? '', row.content ?? '')
  }

  searchArticles(query: string): Article[] {
    const trimmed = query.trim()
    if (!trimmed) return []
    const ftsQuery = trimmed.split(/\s+/).map((t) => `"${t.replace(/"/g, '""')}"`).join(' ')
    const rows = this.db.prepare(`
      SELECT entries.*
      FROM entries_fts
      JOIN entries ON entries.rowid = entries_fts.rowid
      WHERE entries_fts MATCH ?
      ORDER BY COALESCE(entries.published_at, entries.created_at) DESC
    `).all(ftsQuery) as EntryRow[]
    return rows.map((row) => this.toArticle(row))
  }
```

- [ ] **Step 4: 新建 test/feature-search.cjs**

```javascript
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { initDatabaseAtPath } = require('../dist/main/database/init.js')
const { Repository } = require('../dist/main/database/repository.js')

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercury-search-'))
  const db = initDatabaseAtPath(path.join(tempDir, 'mercury.db'))
  const repo = new Repository(db)
  const now = Date.now()
  repo.createFeed({
    id: 'f1', title: 'Feed', feedTitle: 'Feed', customTitle: null,
    url: 'https://e.com/feed.xml', description: null, siteUrl: 'https://e.com',
    faviconUrl: null, refreshIntervalMinutes: 0, lastRefreshedAt: now,
    lastError: null, createdAt: now, updatedAt: now
  })
  repo.upsertEntry({ id: 'e1', feedId: 'f1', title: 'TypeScript Generics Deep Dive',
    url: 'https://e.com/a/1', author: 'A', publishedAt: now, guid: 'g1',
    excerpt: 'understanding generics', isRead: false, createdAt: now })
  repo.upsertEntry({ id: 'e2', feedId: 'f1', title: 'Rust Ownership',
    url: 'https://e.com/a/2', author: 'B', publishedAt: now, guid: 'g2',
    excerpt: 'borrow checker', isRead: false, createdAt: now })

  const hits = repo.searchArticles('generics')
  assert.equal(hits.length, 1)
  assert.equal(hits[0].id, 'e1')

  repo.upsertEntryContent({ entryId: 'e2', rawHtml: null, cleanedHtml: null,
    cleanedMarkdown: 'lifetime annotations explained', fetchedAt: now })
  const hits2 = repo.searchArticles('lifetime')
  assert.equal(hits2.length, 1)
  assert.equal(hits2[0].id, 'e2')

  assert.deepEqual(repo.searchArticles('  '), [])

  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
}

main()
console.log('Search feature tests passed')
```

- [ ] **Step 5: 运行测试**

Run: `npm run build:main && npx electron --no-sandbox test/feature-search.cjs`
Expected：`Search feature tests passed`，exit 0。

- [ ] **Step 6: Commit**

```bash
git add src/main/database/repository.ts test/feature-search.cjs
git commit -m "feat(search): FTS5 sync on upsert + searchArticles"
```

### Task 2: 搜索 IPC + preload + 前端搜索框

**Files:**
- Modify: `src/main/index.ts`, `src/main/services/ArticleService.ts`, `src/preload/index.ts`, `src/renderer/env.d.ts`, `src/renderer/components/ArticleList.vue`, `src/renderer/App.vue`

- [ ] **Step 1: ArticleService 新增 searchArticles**

在 ArticleService 类内（已注入 repository）新增；确认顶部已 `import { Article } from '../types'`，否则补上：

```typescript
  searchArticles(query: string): Article[] {
    return this.repository.searchArticles(query)
  }
```

- [ ] **Step 2: index.ts 注册 handler（get-all-articles 附近）**

```typescript
  ipcMain.handle('search-articles', async (_event, query: string) =>
    cloneForIpc(getArticleService().searchArticles(query))
  )
```

- [ ] **Step 3: preload 暴露（markArticleUnread 之后）**

```typescript
  searchArticles: (query: string) => ipcRenderer.invoke('search-articles', query),
```

- [ ] **Step 4: env.d.ts 类型（markArticleUnread 之后）**

```typescript
      searchArticles: (query: string) => Promise<Article[]>
```

- [ ] **Step 5: ArticleList.vue 加搜索框**

模板 `.list-controls` 之后加：

```html
        <input
          class="search-input"
          type="text"
          :value="searchQuery"
          placeholder="搜索文章..."
          @input="$emit('search', ($event.target as HTMLInputElement).value)"
        />
```

defineProps 增加 `searchQuery: string`；defineEmits 增加 `search: [query: string]`。style 加：

```css
.search-input { width: 100%; margin-top: 12px; padding: 7px 10px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 13px; box-sizing: border-box; }
.search-input:focus { outline: none; border-color: #409eff; }
```

- [ ] **Step 6: App.vue 接线（防抖 250ms）**

`<ArticleList>` 加 `:searchQuery="searchQuery"` 和 `@search="handleSearch"`。script 加：

```typescript
const searchQuery = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

const handleSearch = (query: string) => {
  searchQuery.value = query
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    if (!window.electronAPI) return
    if (!query.trim()) { await loadArticles(selectedFeedId.value); return }
    try {
      articleList.value = await window.electronAPI.searchArticles(query)
      selectedArticleId.value = ''
      selectedArticleContent.value = null
    } catch (error) { console.error('Search failed', error) }
  }, 250)
}
```

- [ ] **Step 7: 编译**

Run: `npm run build`
Expected：通过。

- [ ] **Step 8: Commit**

```bash
git add src/main/index.ts src/main/services/ArticleService.ts src/preload/index.ts src/renderer/env.d.ts src/renderer/components/ArticleList.vue src/renderer/App.vue
git commit -m "feat(search): IPC + search box"
```

---

## Phase 2：API Key 加密（A5）

### Task 3: safeStorage 封装 + 加密读写 + 明文迁移

**Files:**
- Create: `src/main/security/secureStore.ts`
- Modify: `src/main/services/SettingsService.ts`, `src/main/index.ts`

- [ ] **Step 1: 新建 secureStore.ts**

```typescript
import { safeStorage } from 'electron'

const ENC_PREFIX = 'enc:v1:'

export function encryptSecret(plain: string): string {
  if (!plain) return ''
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return ENC_PREFIX + safeStorage.encryptString(plain).toString('base64')
    }
  } catch { /* fall through */ }
  return plain
}

export function decryptSecret(stored: string): string {
  if (!stored) return ''
  if (!stored.startsWith(ENC_PREFIX)) return stored
  try {
    return safeStorage.decryptString(Buffer.from(stored.slice(ENC_PREFIX.length), 'base64'))
  } catch { return '' }
}

export function isEncrypted(stored: string): boolean {
  return typeof stored === 'string' && stored.startsWith(ENC_PREFIX)
}
```

- [ ] **Step 2: SettingsService 加解密 apiKey**

import `{ encryptSecret, decryptSecret } from '../security/secureStore'`。getLLMConfig 的 apiKey 读取改为 `decryptSecret(this.repository.getSetting('llm.apiKey') ?? '')`；saveLLMConfig 的 apiKey 写入改为 `this.repository.setSetting('llm.apiKey', encryptSecret(config.apiKey))`。

- [ ] **Step 3: index.ts 启动迁移明文 key**

import `{ encryptSecret, isEncrypted } from './security/secureStore'`。`initializeServices()` 内 settingsService 创建后加 `migratePlaintextApiKey(repository)`，并新增：

```typescript
function migratePlaintextApiKey(repository: Repository): void {
  const stored = repository.getSetting('llm.apiKey')
  if (stored && !isEncrypted(stored)) {
    repository.setSetting('llm.apiKey', encryptSecret(stored))
  }
}
```

- [ ] **Step 4: 编译 + 回归（读写对称，现有 apiKey:'secret' 断言仍成立）**

Run: `npm run build:main && npx electron --no-sandbox test/services-regression.cjs`
Expected：`Services regression tests passed`。

- [ ] **Step 5: Commit**

```bash
git add src/main/security/secureStore.ts src/main/services/SettingsService.ts src/main/index.ts
git commit -m "feat(security): encrypt API key with safeStorage + migrate plaintext"
```

---

## Phase 3：摘要分档（A4）

### Task 4: 分档 prompt + length 参数 + 前端三档

**Files:**
- Modify: `src/main/llm/config.ts`, `src/main/llm/agents.ts`, `src/main/services/SummaryService.ts`, `src/main/services/interfaces.ts`, `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/env.d.ts`, `src/renderer/components/ReaderView.vue`, `src/renderer/App.vue`

- [ ] **Step 1: config.ts 新增三档 prompt + maxTokens**

```typescript
export type SummaryLength = 'short' | 'medium' | 'long'

export const SummaryPromptTemplates: Record<SummaryLength, string> = {
  short: `你是一个专业的文章摘要助手。请对以下文章生成极简中文摘要。

文章标题：{title}
文章内容：
{content}

要求：
1. 用 2-3 句话概括核心观点
2. 长度控制在 80 字以内
3. 客观简洁`,
  medium: `你是一个专业的文章摘要助手。请对以下文章内容生成简洁、准确的中文摘要。

文章标题：{title}
文章内容：
{content}

要求：
1. 摘要应包含文章的核心观点和关键信息
2. 长度控制在 200 字以内
3. 使用客观、简洁的语言`,
  long: `你是一个专业的文章摘要助手。请对以下文章生成详细中文摘要。

文章标题：{title}
文章内容：
{content}

要求：
1. 分点梳理文章主旨、论据和结论
2. 长度 300-500 字
3. 保留关键细节，使用客观语言`,
}

export const SummaryMaxTokens: Record<SummaryLength, number> = { short: 256, medium: 512, long: 1024 }
```

保留原 `SummaryPromptTemplate` 导出不删（避免破坏其它引用）。

- [ ] **Step 2: agents.ts SummaryAgent 支持 length**

import 增加 `SummaryPromptTemplates, SummaryMaxTokens, SummaryLength`。`SummaryOptions` 加 `length?: SummaryLength`。`summarizeWithUsage` 和 `summarizeStream` 内模板渲染改为 `SummaryPromptTemplates[options?.length ?? 'medium']`，maxTokens 默认改为 `options?.maxTokens ?? SummaryMaxTokens[options?.length ?? 'medium']`。

- [ ] **Step 3: SummaryService.summarize 加 length 参数**

```typescript
  async summarize(articleId: string, length: 'short' | 'medium' | 'long' = 'medium'): Promise<string> {
```

调用处改为 `agent.summarizeWithUsage(markdown, { title: content.title, length })`。

- [ ] **Step 4: interfaces.ts**

```typescript
export interface ISummaryService {
  summarize(articleId: string, length?: 'short' | 'medium' | 'long'): Promise<string>
}
```

- [ ] **Step 5: index.ts / preload / env.d.ts 透传**

index.ts：
```typescript
  ipcMain.handle('summarize-article', async (_event, articleId: string, length?: 'short' | 'medium' | 'long') =>
    cloneForIpc(await getSummaryService().summarize(articleId, length))
  )
```
preload：
```typescript
  summarizeArticle: (articleId: string, length?: 'short' | 'medium' | 'long') =>
    ipcRenderer.invoke('summarize-article', articleId, length),
```
env.d.ts：
```typescript
      summarizeArticle: (articleId: string, length?: 'short' | 'medium' | 'long') => Promise<string>
```

- [ ] **Step 6: ReaderView.vue 三档按钮**

把摘要按钮替换为：
```html
          <div class="summary-tier">
            <button class="action-btn" @click="$emit('summarize', 'short')">短摘要</button>
            <button class="action-btn" @click="$emit('summarize', 'medium')">中摘要</button>
            <button class="action-btn" @click="$emit('summarize', 'long')">长摘要</button>
          </div>
```
defineEmits 把 `summarize: []` 改为 `summarize: [length: 'short' | 'medium' | 'long']`。

- [ ] **Step 7: App.vue handleSummarize 接收 length**

```typescript
const handleSummarize = async (length: 'short' | 'medium' | 'long' = 'medium') => {
  if (!window.electronAPI || !selectedArticleId.value || !selectedArticleContent.value) { alert('请先选择一篇文章'); return }
  try {
    const summary = await window.electronAPI.summarizeArticle(selectedArticleId.value, length)
    selectedArticleContent.value = { ...selectedArticleContent.value, summary }
  } catch (error) { alert(`摘要生成失败：${error instanceof Error ? error.message : String(error)}`) }
}
```

- [ ] **Step 8: 编译**

Run: `npm run build`
Expected：通过。

- [ ] **Step 9: Commit**

```bash
git add src/main/llm/config.ts src/main/llm/agents.ts src/main/services/SummaryService.ts src/main/services/interfaces.ts src/main/index.ts src/preload/index.ts src/renderer/env.d.ts src/renderer/components/ReaderView.vue src/renderer/App.vue
git commit -m "feat(summary): short/medium/long tiers"
```

---

## Phase 4：逐段流式翻译 + 双语对照（A2）

### Task 5: TranslationService 逐段翻译 + 进度回调

**Files:**
- Modify: `src/main/services/TranslationService.ts`, `src/main/services/interfaces.ts`, `src/main/llm/agents.ts`
- Test: `test/feature-translation.cjs`（新建，用 mock provider）

- [ ] **Step 1: agents.ts TranslationAgent 新增 translateSegment**

为单段翻译加方法（复用现有 provider/prompt）：

```typescript
  async translateSegment(text: string, targetLang: string, title?: string): Promise<LLMResponse> {
    if (!text.trim()) throw new Error('Segment cannot be empty')
    const prompt = renderPrompt(TranslationPromptTemplate, {
      title: title ?? 'Untitled', targetLang, content: text,
    })
    return this.provider.chat([{ role: 'user', content: prompt }])
  }
```

- [ ] **Step 2: TranslationService.translate 改为逐段 + onProgress 回调**

新签名（保持兼容：onProgress 可选）：

```typescript
export interface TranslationSegment {
  index: number
  source: string
  translated: string
  status: 'success' | 'failed'
  error?: string
}

export type TranslationProgress = (segment: TranslationSegment, total: number) => void
```

translate 主体改为：拆段（按 `\n\n+` 分割、过滤空段）→ 逐段调用 `agent.translateSegment`，失败做指数退避重试（0.5s/1s/2s 共 3 次），仍失败则 `status:'failed'`、`translated` 保留原文；每段完成调 `onProgress`。最终把所有段拼成「原文段\n\n译文段」交替的字符串写入 agent_runs（保持原 outputText 存储不变），并返回该字符串。累计 usage 落库。

```typescript
  async translate(articleId: string, targetLang: string, onProgress?: TranslationProgress): Promise<string> {
    if (!articleId.trim()) throw new Error('Article ID cannot be empty')
    const normalizedTargetLang = targetLang.trim() || '中文'
    const content = this.repository.getArticleContent(articleId)
    if (!content) throw new Error(`Article not found: ${articleId}`)
    const markdown = content.cleanedMarkdown || content.rawHtml
    if (!markdown || !markdown.trim()) throw new Error('文章内容为空，请先打开文章抓取正文')

    const segments = markdown.split(/\n\n+/).map((s) => s.trim()).filter(Boolean)
    const startedAt = Date.now()
    const runId = randomUUID()
    const config = await this.getConfig()
    const agent = new TranslationAgent(config)
    const results: TranslationSegment[] = []
    let promptTokens = 0
    let completionTokens = 0

    for (let i = 0; i < segments.length; i++) {
      const source = segments[i]
      let seg: TranslationSegment = { index: i, source, translated: source, status: 'failed' }
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const resp = await agent.translateSegment(source, normalizedTargetLang, content.title)
          if (resp.usage) { promptTokens += resp.usage.promptTokens; completionTokens += resp.usage.completionTokens }
          seg = { index: i, source, translated: resp.content, status: 'success' }
          break
        } catch (err) {
          seg = { index: i, source, translated: source, status: 'failed', error: err instanceof Error ? err.message : String(err) }
          if (attempt < 2) await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)))
        }
      }
      results.push(seg)
      onProgress?.(seg, segments.length)
    }

    const combined = results.map((r) => `${r.source}\n\n${r.translated}`).join('\n\n')
    this.repository.createAgentRun({
      id: runId, entryId: articleId, agentType: 'translation', inputText: markdown,
      outputText: combined, status: 'completed', startedAt, completedAt: Date.now()
    })
    if (promptTokens || completionTokens) {
      this.repository.createLLMUsage({
        id: randomUUID(), agentRunId: runId, model: config.model,
        promptTokens, completionTokens, totalTokens: promptTokens + completionTokens, createdAt: Date.now()
      })
    }
    return combined
  }
```

import `TranslationSegment, TranslationProgress` 用到的类型在本文件定义并 export。

- [ ] **Step 3: interfaces.ts 更新 ITranslationService（onProgress 可选）**

```typescript
export interface ITranslationService {
  translate(articleId: string, targetLang: string, onProgress?: (segment: { index: number; source: string; translated: string; status: 'success' | 'failed'; error?: string }, total: number) => void): Promise<string>
}
```

- [ ] **Step 4: 新建 test/feature-translation.cjs（mock provider）**

```javascript
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { initDatabaseAtPath } = require('../dist/main/database/init.js')
const { Repository } = require('../dist/main/database/repository.js')
const { TranslationService } = require('../dist/main/services/TranslationService.js')

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercury-trans-'))
  const db = initDatabaseAtPath(path.join(tempDir, 'mercury.db'))
  const repo = new Repository(db)
  const now = Date.now()
  repo.createFeed({ id: 'f1', title: 'F', feedTitle: 'F', customTitle: null, url: 'https://e.com/f.xml',
    description: null, siteUrl: 'https://e.com', faviconUrl: null, refreshIntervalMinutes: 0,
    lastRefreshedAt: now, lastError: null, createdAt: now, updatedAt: now })
  repo.upsertEntry({ id: 'e1', feedId: 'f1', title: 'T', url: 'https://e.com/1', author: 'A',
    publishedAt: now, guid: 'g1', excerpt: 'x', isRead: false, createdAt: now })
  repo.upsertEntryContent({ entryId: 'e1', rawHtml: null, cleanedHtml: null,
    cleanedMarkdown: 'First para.\n\nSecond para.', fetchedAt: now })

  const svc = new TranslationService(repo, () => ({ baseUrl: 'http://x/v1', apiKey: 'k', model: 'm' }))
  // 注入 mock：覆盖 getConfig 不够，需 mock agent。改为构造时传 provider 不可行，
  // 这里直接验证拆段计数：用 onProgress 收集段数（mock 失败也会回调，保留原文）。
  const progress = []
  const result = await svc.translate('e1', '中文', (seg, total) => progress.push({ seg, total }))
  // 网络不可达 → 每段 status failed，但回调次数 = 段数 = 2
  assert.equal(progress.length, 2)
  assert.equal(progress[0].total, 2)
  assert.ok(result.includes('First para.'))
  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
}

main().then(() => { console.log('Translation feature tests passed'); process.exit(0) })
  .catch((e) => { console.error(e); process.exit(1) })
```

注：此测试在无网络/无效 key 下验证「拆段 + 逐段回调 + 失败保留原文」的控制流（每段重试 3 次后失败），不验证真实翻译质量。

- [ ] **Step 5: 运行测试**

Run: `npm run build:main && npx electron --no-sandbox test/feature-translation.cjs`
Expected：`Translation feature tests passed`，exit 0。（注意：因含 3 次重试 × 退避，2 段约需数秒。）

- [ ] **Step 6: Commit**

```bash
git add src/main/llm/agents.ts src/main/services/TranslationService.ts src/main/services/interfaces.ts test/feature-translation.cjs
git commit -m "feat(translate): per-segment translation with retry + progress callback"
```

### Task 6: 翻译流式 IPC 事件通道 + 双语对照前端

**Files:**
- Modify: `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/env.d.ts`, `src/renderer/components/ReaderView.vue`, `src/renderer/App.vue`

- [ ] **Step 1: index.ts translate-article handler 改为推送进度**

```typescript
  ipcMain.handle('translate-article', async (_event, articleId: string, targetLang: string) =>
    cloneForIpc(await getTranslationService().translate(articleId, targetLang, (segment, total) => {
      mainWindow?.webContents.send('translate-progress', { articleId, total, ...segment })
    }))
  )
```

- [ ] **Step 2: preload 暴露事件订阅**

```typescript
  onTranslateProgress: (cb: (payload: { articleId: string; index: number; total: number; source: string; translated: string; status: 'success' | 'failed'; error?: string }) => void) => {
    const listener = (_e: unknown, payload: Parameters<typeof cb>[0]) => cb(payload)
    ipcRenderer.on('translate-progress', listener)
    return () => ipcRenderer.removeListener('translate-progress', listener)
  },
```

- [ ] **Step 3: env.d.ts 类型**

```typescript
      onTranslateProgress: (cb: (payload: { articleId: string; index: number; total: number; source: string; translated: string; status: 'success' | 'failed'; error?: string }) => void) => () => void
```

- [ ] **Step 4: ReaderView.vue 双语对照渲染**

新增 prop `translationSegments?: Array<{ index: number; source: string; translated: string; status: string }>`。把翻译 `<section v-if="article.translation">` 替换为双语对照（有 segments 时渲染交替，否则回退到 article.translation 文本）：

```html
          <section v-if="translationSegments && translationSegments.length" class="ai-section">
            <div class="ai-section-title">AI 翻译（双语对照）</div>
            <div v-for="seg in translationSegments" :key="seg.index" class="bilingual-block">
              <p class="bilingual-source">{{ seg.source }}</p>
              <p class="bilingual-target" :class="{ failed: seg.status === 'failed' }">{{ seg.translated }}</p>
            </div>
          </section>
          <section v-else-if="article.translation" class="ai-section">
            <div class="ai-section-title">AI 翻译</div>
            <div class="ai-content">{{ article.translation }}</div>
          </section>
```

style 加：
```css
.bilingual-block { margin-bottom: 14px; }
.bilingual-source { color: #909399; font-size: 13px; margin: 0 0 4px; }
.bilingual-target { color: #26313d; margin: 0; }
.bilingual-target.failed { color: #c0392b; }
```

- [ ] **Step 5: App.vue 订阅进度 + 边翻边出**

script 加状态与订阅（onMounted 注册、onUnmounted 取消）：

```typescript
import { onUnmounted } from 'vue'
const translationSegments = ref<Array<{ index: number; source: string; translated: string; status: 'success' | 'failed' }>>([])
let unsubscribeTranslate: (() => void) | null = null

onMounted(() => {
  if (window.electronAPI?.onTranslateProgress) {
    unsubscribeTranslate = window.electronAPI.onTranslateProgress((payload) => {
      if (payload.articleId !== selectedArticleId.value) return
      const existing = translationSegments.value.findIndex((s) => s.index === payload.index)
      const seg = { index: payload.index, source: payload.source, translated: payload.translated, status: payload.status }
      if (existing >= 0) translationSegments.value[existing] = seg
      else translationSegments.value = [...translationSegments.value, seg].sort((a, b) => a.index - b.index)
    })
  }
})
onUnmounted(() => { unsubscribeTranslate?.() })
```

handleTranslate 改为：开始前清空 `translationSegments.value = []`，切换文章时也清空（在 handleSelectArticle 内加 `translationSegments.value = []`）。`<ReaderView>` 加 `:translationSegments="translationSegments"`。

- [ ] **Step 6: 编译**

Run: `npm run build`
Expected：通过。

- [ ] **Step 7: Commit**

```bash
git add src/main/index.ts src/preload/index.ts src/renderer/env.d.ts src/renderer/components/ReaderView.vue src/renderer/App.vue
git commit -m "feat(translate): streaming progress channel + bilingual view"
```

---

## Phase 5：B 档（收藏 / 进度 / 用量 / 建议标签）

### Task 7: 文章收藏/星标

**Files:**
- Modify: `src/main/database/repository.ts`, `src/main/services/ArticleService.ts`, `src/main/types/index.ts`, `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/env.d.ts`, `src/renderer/components/ArticleList.vue`, `src/renderer/components/ReaderView.vue`, `src/renderer/components/FeedSidebar.vue`, `src/renderer/App.vue`
- Test: `test/feature-search.cjs`（追加星标断言）或并入回归

- [ ] **Step 1: repository.ts 星标读写 + toArticle 带出**

```typescript
  setStarred(entryId: string, starred: boolean): void {
    this.db.prepare('UPDATE entries SET is_starred = ? WHERE id = ?').run(starred ? 1 : 0, entryId)
  }

  getStarredArticles(): Article[] {
    const rows = this.db.prepare(
      `SELECT * FROM entries WHERE is_starred = 1 ORDER BY COALESCE(published_at, created_at) DESC`
    ).all() as EntryRow[]
    return rows.map((row) => this.toArticle(row))
  }
```

`EntryRow` 接口加 `is_starred?: number`；`toArticle` 返回对象加 `isStarred: row.is_starred === 1`。

- [ ] **Step 2: types/index.ts Article 加 isStarred**

```typescript
export interface Article {
  // ...现有字段...
  isStarred?: boolean
}
```

- [ ] **Step 3: ArticleService 透传**

```typescript
  setStarred(articleId: string, starred: boolean): void { this.repository.setStarred(articleId, starred) }
  getStarredArticles(): Article[] { return this.repository.getStarredArticles() }
```

- [ ] **Step 4: IPC + preload + env.d.ts**

index.ts：
```typescript
  ipcMain.handle('set-article-starred', async (_event, articleId: string, starred: boolean) =>
    getArticleService().setStarred(articleId, starred))
  ipcMain.handle('get-starred-articles', async () => cloneForIpc(getArticleService().getStarredArticles()))
```
preload：
```typescript
  setArticleStarred: (articleId: string, starred: boolean) => ipcRenderer.invoke('set-article-starred', articleId, starred),
  getStarredArticles: () => ipcRenderer.invoke('get-starred-articles'),
```
env.d.ts：
```typescript
      setArticleStarred: (articleId: string, starred: boolean) => Promise<void>
      getStarredArticles: () => Promise<Article[]>
```

- [ ] **Step 5: 前端星标交互**

ArticleList.vue 卡片 `.article-header` 内加星标按钮（emit `toggle-star: [articleId: string]`）；FeedSidebar.vue 加「⭐ 收藏」入口（emit `select-starred`）；App.vue 加 `handleToggleStar`、`handleSelectStarred`（后者 `articleList.value = await window.electronAPI.getStarredArticles()`）。ArticleFilter 类型不变（收藏走独立入口而非 filter）。

- [ ] **Step 6: 编译**

Run: `npm run build`
Expected：通过。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(articles): star/favorite articles"
```

### Task 8: 阅读进度记忆

**Files:**
- Modify: `src/main/database/repository.ts`, `src/main/services/ArticleService.ts`, `src/main/database/repository.ts`（getArticleContent 带出 scroll_percent）, `src/main/types/index.ts`, `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/env.d.ts`, `src/renderer/components/ReaderView.vue`, `src/renderer/App.vue`

- [ ] **Step 1: repository.ts 保存/读取滚动百分比**

```typescript
  saveScrollPercent(entryId: string, percent: number): void {
    this.db.prepare('UPDATE entries SET scroll_percent = ? WHERE id = ?').run(percent, entryId)
  }
```

getArticleContent 的 SQL 增加 `entries.scroll_percent`，返回对象加 `scrollPercent: Number(row.scroll_percent ?? 0)`；`EntryContentRow` 接口加 `scroll_percent?: number`。

- [ ] **Step 2: types ArticleContent 加 scrollPercent**

```typescript
export interface ArticleContent {
  // ...现有...
  scrollPercent?: number
}
```

- [ ] **Step 3: ArticleService.saveScrollPercent + IPC/preload/env.d.ts**

ArticleService：`saveScrollPercent(articleId: string, percent: number): void { this.repository.saveScrollPercent(articleId, percent) }`
index.ts：`ipcMain.handle('save-scroll-percent', async (_e, articleId: string, percent: number) => getArticleService().saveScrollPercent(articleId, percent))`
preload：`saveScrollPercent: (articleId: string, percent: number) => ipcRenderer.invoke('save-scroll-percent', articleId, percent),`
env.d.ts：`saveScrollPercent: (articleId: string, percent: number) => Promise<void>`

- [ ] **Step 4: ReaderView.vue 滚动保存 + 恢复**

`.reader-content` 加 `ref="contentRef"` 和 `@scroll="onScroll"`。script：滚动防抖 500ms 计算百分比 emit `scroll: [percent: number]`；watch article 变化后 `nextTick` 把 `contentRef.scrollTop` 设为 `scrollPercent * (scrollHeight - clientHeight)`。

- [ ] **Step 5: App.vue 接线**

`<ReaderView>` 加 `@scroll="handleSaveScroll"`；`handleSaveScroll(percent)` 调 `window.electronAPI.saveScrollPercent(selectedArticleId.value, percent)`。

- [ ] **Step 6: 编译 + Commit**

Run: `npm run build`
```bash
git add -A
git commit -m "feat(reader): remember scroll position per article"
```

### Task 9: 用量统计面板

**Files:**
- Modify: `src/main/database/repository.ts`, `src/main/services/SettingsService.ts`, `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/env.d.ts`, `src/renderer/components/SettingsView.vue`

- [ ] **Step 1: repository.ts 聚合用量**

```typescript
  getUsageStats(): Array<{ model: string; agentType: string; day: string; requests: number; totalTokens: number }> {
    return this.db.prepare(`
      SELECT llm_usage.model AS model,
             agent_runs.agent_type AS agentType,
             date(llm_usage.created_at / 1000, 'unixepoch') AS day,
             COUNT(*) AS requests,
             COALESCE(SUM(llm_usage.total_tokens), 0) AS totalTokens
      FROM llm_usage
      JOIN agent_runs ON agent_runs.id = llm_usage.agent_run_id
      GROUP BY model, agentType, day
      ORDER BY day DESC, model
    `).all() as Array<{ model: string; agentType: string; day: string; requests: number; totalTokens: number }>
  }
```

- [ ] **Step 2: SettingsService.getUsageStats + interfaces**

SettingsService 加 `async getUsageStats() { return this.repository.getUsageStats() }`；ISettingsService 加对应签名（返回上面的数组类型）。

- [ ] **Step 3: IPC/preload/env.d.ts**

index.ts：`ipcMain.handle('get-usage-stats', async () => cloneForIpc(await getSettingsService().getUsageStats()))`
preload：`getUsageStats: () => ipcRenderer.invoke('get-usage-stats'),`
env.d.ts：`getUsageStats: () => Promise<Array<{ model: string; agentType: string; day: string; requests: number; totalTokens: number }>>`

- [ ] **Step 4: SettingsView.vue 用量标签页**

在 SettingsView 顶部加 tab 切换（「常规」/「用量」）。用量页 onMounted 拉 `getUsageStats()`，用表格展示（日期/模型/类型/请求数/总tokens），底部一行合计。纯 HTML 表格 + CSS，不引图表库。

- [ ] **Step 5: 编译 + Commit**

Run: `npm run build`
```bash
git add -A
git commit -m "feat(settings): LLM usage stats panel"
```

### Task 10: AI 建议标签

**Files:**
- Modify: `src/main/llm/config.ts`, `src/main/llm/agents.ts`, Create: `src/main/services/TagSuggestionService.ts`, Modify: `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/env.d.ts`, `src/renderer/components/TagDialog.vue`, `src/renderer/App.vue`

- [ ] **Step 1: config.ts 建议标签 prompt**

```typescript
export const TagSuggestionPromptTemplate = `你是一个文章标签助手。根据文章内容推荐标签。

文章标题：{title}
文章内容：
{content}

已有标签（请优先复用，仅在确有必要时新建）：
{existingTags}

要求：
1. 最多推荐 6 个标签
2. 每个标签为简短中文词组
3. 只输出标签，用英文逗号分隔，不要解释`
```

- [ ] **Step 2: agents.ts TagSuggestionAgent**

```typescript
import { TagSuggestionPromptTemplate } from './config'

export class TagSuggestionAgent {
  private provider: LLMProvider
  constructor(config: LLMProviderConfig, provider?: LLMProvider) {
    this.provider = provider ?? new OpenAICompatibleProvider(config)
  }
  async suggest(markdown: string, title: string, existingTags: string[]): Promise<string[]> {
    if (!markdown.trim()) throw new Error('Content cannot be empty')
    const prompt = renderPrompt(TagSuggestionPromptTemplate, {
      title: title || 'Untitled', content: markdown,
      existingTags: existingTags.length ? existingTags.join(', ') : '（无）',
    })
    const resp = await this.provider.chat([{ role: 'user', content: prompt }], { maxTokens: 128 })
    return resp.content.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 6)
  }
}
```

- [ ] **Step 3: TagSuggestionService.ts**

```typescript
import { Repository } from '../database/repository'
import { TagSuggestionAgent } from '../llm/agents'
import { LLMConfig } from '../types'

export class TagSuggestionService {
  constructor(
    private readonly repository: Repository,
    private readonly getConfig: () => Promise<LLMConfig> | LLMConfig
  ) {}

  async suggestTags(articleId: string): Promise<string[]> {
    const content = this.repository.getArticleContent(articleId)
    if (!content) throw new Error(`Article not found: ${articleId}`)
    const markdown = content.cleanedMarkdown || content.rawHtml || content.title
    const existing = this.repository.getAllTags().map((t) => t.name)
    const config = await this.getConfig()
    const agent = new TagSuggestionAgent(config)
    return agent.suggest(markdown, content.title, existing)
  }
}
```

- [ ] **Step 4: index.ts 实例化 + handler**

initializeServices 内：`tagSuggestionService = new TagSuggestionService(repository, () => getSettingsService().getLLMConfig())`（加模块级变量 + getter，照搬 summaryService 模式）。
```typescript
  ipcMain.handle('suggest-tags', async (_event, articleId: string) =>
    cloneForIpc(await getTagSuggestionService().suggestTags(articleId)))
```

- [ ] **Step 5: preload/env.d.ts**

preload：`suggestTags: (articleId: string) => ipcRenderer.invoke('suggest-tags', articleId),`
env.d.ts：`suggestTags: (articleId: string) => Promise<string[]>`

- [ ] **Step 6: TagDialog.vue 加「AI 建议」**

dialog 内加「AI 建议」按钮 → 调 `suggestTags` → 候选以 checkbox 列出（已有标签高亮）。用户勾选后「确定」逐个 emit confirm（或改 confirm 为接收数组）。**AI 不自动写入，必须用户勾选确认。** 需要 TagDialog 接收 `articleId` prop 才能调用。App.vue 打开 TagDialog 时传入 `selectedArticleId`。

- [ ] **Step 7: App.vue 适配多标签确认**

若 TagDialog 改为一次确认多个标签，`handleTagConfirm` 改为接收 `string[]` 并循环 `addTagToArticle`，然后刷新内容/列表/标签。

- [ ] **Step 8: 编译 + Commit**

Run: `npm run build`
```bash
git add -A
git commit -m "feat(tags): AI tag suggestions with user confirmation"
```

---

## Phase 6：划词高亮 + 笔记（A3，最后做）

### Task 11: HighlightService + CRUD

**Files:**
- Create: `src/main/services/HighlightService.ts`
- Modify: `src/main/database/repository.ts`, `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/env.d.ts`
- Test: `test/feature-highlight.cjs`（新建）

- [ ] **Step 1: repository.ts 高亮 CRUD**

```typescript
  addHighlight(h: { id: string; entryId: string; selectedText: string; prefixText?: string | null; suffixText?: string | null; color: string; note?: string | null; createdAt: number }): void {
    this.db.prepare(`INSERT INTO highlights (id, entry_id, selected_text, prefix_text, suffix_text, color, note, created_at)
      VALUES (@id, @entryId, @selectedText, @prefixText, @suffixText, @color, @note, @createdAt)`)
      .run({ ...h, prefixText: h.prefixText ?? null, suffixText: h.suffixText ?? null, note: h.note ?? null })
  }
  getHighlights(entryId: string): Array<{ id: string; entryId: string; selectedText: string; prefixText: string | null; suffixText: string | null; color: string; note: string | null; createdAt: number }> {
    const rows = this.db.prepare('SELECT * FROM highlights WHERE entry_id = ? ORDER BY created_at').all(entryId) as Array<Record<string, unknown>>
    return rows.map((r) => ({ id: String(r.id), entryId: String(r.entry_id), selectedText: String(r.selected_text), prefixText: (r.prefix_text as string) ?? null, suffixText: (r.suffix_text as string) ?? null, color: String(r.color), note: (r.note as string) ?? null, createdAt: Number(r.created_at) }))
  }
  updateHighlight(id: string, fields: { color?: string; note?: string }): void {
    const cur = this.db.prepare('SELECT color, note FROM highlights WHERE id = ?').get(id) as { color: string; note: string | null } | undefined
    if (!cur) return
    this.db.prepare('UPDATE highlights SET color = ?, note = ? WHERE id = ?')
      .run(fields.color ?? cur.color, fields.note !== undefined ? fields.note : cur.note, id)
  }
  deleteHighlight(id: string): void { this.db.prepare('DELETE FROM highlights WHERE id = ?').run(id) }
```

- [ ] **Step 2: HighlightService.ts**

```typescript
import { randomUUID } from 'crypto'
import { Repository } from '../database/repository'

export interface HighlightRecord {
  id: string; entryId: string; selectedText: string
  prefixText: string | null; suffixText: string | null
  color: string; note: string | null; createdAt: number
}

export class HighlightService {
  constructor(private readonly repository: Repository) {}
  add(input: { entryId: string; selectedText: string; prefixText?: string; suffixText?: string; color: string; note?: string }): HighlightRecord {
    const id = randomUUID(); const createdAt = Date.now()
    this.repository.addHighlight({ id, ...input, prefixText: input.prefixText ?? null, suffixText: input.suffixText ?? null, note: input.note ?? null, createdAt })
    return { id, entryId: input.entryId, selectedText: input.selectedText, prefixText: input.prefixText ?? null, suffixText: input.suffixText ?? null, color: input.color, note: input.note ?? null, createdAt }
  }
  list(entryId: string): HighlightRecord[] { return this.repository.getHighlights(entryId) }
  update(id: string, fields: { color?: string; note?: string }): void { this.repository.updateHighlight(id, fields) }
  remove(id: string): void { this.repository.deleteHighlight(id) }
}
```

- [ ] **Step 3: index.ts 实例化 + 4 个 handler**

模块变量 + getter（照搬模式）。handler：`add-highlight` / `get-highlights` / `update-highlight` / `delete-highlight`。

- [ ] **Step 4: preload/env.d.ts 暴露 4 个 API**

preload：
```typescript
  addHighlight: (input: { entryId: string; selectedText: string; prefixText?: string; suffixText?: string; color: string; note?: string }) => ipcRenderer.invoke('add-highlight', input),
  getHighlights: (entryId: string) => ipcRenderer.invoke('get-highlights', entryId),
  updateHighlight: (id: string, fields: { color?: string; note?: string }) => ipcRenderer.invoke('update-highlight', id, fields),
  deleteHighlight: (id: string) => ipcRenderer.invoke('delete-highlight', id),
```
env.d.ts 对应 4 行类型（HighlightRecord 形状）。

- [ ] **Step 5: test/feature-highlight.cjs**

```javascript
const assert = require('node:assert/strict')
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path')
const { initDatabaseAtPath } = require('../dist/main/database/init.js')
const { Repository } = require('../dist/main/database/repository.js')
const { HighlightService } = require('../dist/main/services/HighlightService.js')

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercury-hl-'))
  const db = initDatabaseAtPath(path.join(tempDir, 'mercury.db'))
  const repo = new Repository(db); const now = Date.now()
  repo.createFeed({ id: 'f1', title: 'F', feedTitle: 'F', customTitle: null, url: 'https://e.com/f.xml', description: null, siteUrl: 'https://e.com', faviconUrl: null, refreshIntervalMinutes: 0, lastRefreshedAt: now, lastError: null, createdAt: now, updatedAt: now })
  repo.upsertEntry({ id: 'e1', feedId: 'f1', title: 'T', url: 'https://e.com/1', author: 'A', publishedAt: now, guid: 'g1', excerpt: 'x', isRead: false, createdAt: now })
  const svc = new HighlightService(repo)
  const h = svc.add({ entryId: 'e1', selectedText: 'hello', color: 'yellow', note: 'n1' })
  assert.equal(svc.list('e1').length, 1)
  svc.update(h.id, { color: 'green' })
  assert.equal(svc.list('e1')[0].color, 'green')
  svc.remove(h.id)
  assert.equal(svc.list('e1').length, 0)
  db.close(); fs.rmSync(tempDir, { recursive: true, force: true })
}
main(); console.log('Highlight feature tests passed')
```

Run: `npm run build:main && npx electron --no-sandbox test/feature-highlight.cjs`
Expected：`Highlight feature tests passed`。

- [ ] **Step 6: Commit**

```bash
git add src/main/services/HighlightService.ts src/main/database/repository.ts src/main/index.ts src/preload/index.ts src/renderer/env.d.ts test/feature-highlight.cjs
git commit -m "feat(highlight): highlight + note CRUD service & IPC"
```

### Task 12: ReaderView 划词工具栏 + 重新着色

**Files:**
- Modify: `src/renderer/components/ReaderView.vue`, `src/renderer/App.vue`

- [ ] **Step 1: ReaderView 选区监听 + 浮动工具栏**

`.article-content` 容器监听 `mouseup`：取 `window.getSelection()`，非空时记录选中文本和前后各 ~30 字上下文，在选区附近显示浮动工具栏（5 个颜色按钮 + 「加笔记」）。点颜色 emit `add-highlight: [{ selectedText, prefixText, suffixText, color }]`；加笔记弹输入框，附带 note。

```typescript
const HIGHLIGHT_COLORS = ['yellow', 'green', 'blue', 'pink', 'orange']
```

- [ ] **Step 2: 已有高亮重新着色**

新增 prop `highlights: HighlightRecord[]`。watch article/highlights：渲染后遍历高亮，用 `selectedText` 在正文文本节点中查找（结合 prefix/suffix 上下文降低歧义），用 `<mark class="hl hl-{color}">` 包裹首个匹配。找不到则跳过（接受边界不完美，spec 已注明）。

style：
```css
.article-content :deep(mark.hl) { padding: 0 1px; border-radius: 2px; }
.hl-yellow { background: #fff3a0; } .hl-green { background: #b8f0c0; }
.hl-blue { background: #b8dcff; } .hl-pink { background: #ffc8dd; } .hl-orange { background: #ffd8a8; }
```

- [ ] **Step 3: 笔记集中展示**

正文下方加「笔记」区，列出本文所有含 note 的高亮（引用原文 + 笔记内容），可删除。

- [ ] **Step 4: App.vue 接线**

加 `highlights` 状态；handleSelectArticle 后 `highlights.value = await window.electronAPI.getHighlights(articleId)`；handleAddHighlight 调 `addHighlight` 后刷新 highlights；删除同理。`<ReaderView>` 加 `:highlights="highlights"` 与对应事件。

- [ ] **Step 5: 编译 + 手动验证**

Run: `npm run build`
Expected：通过。手动：选中正文文本 → 工具栏出现 → 选颜色 → 高亮保存 → 重开文章高亮仍在。

- [ ] **Step 6: Commit**

```bash
git add src/renderer/components/ReaderView.vue src/renderer/App.vue
git commit -m "feat(highlight): selection toolbar, re-highlight on load, notes panel"
```

---

## 验收清单

- [ ] 全部 12 个 Task 完成，每个都已 commit
- [ ] `npm run build` 通过（renderer + main）
- [ ] `test/services-regression.cjs`、`test/feature-search.cjs`、`test/feature-translation.cjs`、`test/feature-highlight.cjs` 全部通过
- [ ] 前端三栏布局未改变
- [ ] 手动冒烟：搜索、摘要分档、逐段翻译双语对照、收藏、阅读进度、用量面板、AI 建议标签、划词高亮各跑一遍

## 不做（YAGNI）
- 不引入 vitest / i18n / Web-iframe 阅读模式 / Digest 导出 / ETag / SQLite→JSON 降级
- 不替换前端布局或组件框架，不引重型图表/状态管理库
