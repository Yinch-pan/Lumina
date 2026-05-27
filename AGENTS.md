# Mercury 模块开发指南

本文档为第 2~4 周各模块组提供开发指南。

## 项目结构

\`\`\`
Mercury/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 主进程入口
│   │   ├── database/         # 数据库层
│   │   │   ├── init.ts          # ✅ 已完成：数据库初始化
│   │   │   └── repository.ts    # ⏳ 待实现：数据访问层
│   │   ├── services/            # Service 层
│   │   │   ├── interfaces.ts    # ✅ 已完成：接口定义
│   │   │   ├── FeedService.ts   # ⏳ 模块 A 实现
│   │   │   ├── ArticleService.ts # ⏳ 模块 A 实现
│   │   │   ├── CleaningService.ts # ⏳ 模块 B 实现
│   │   │   ├── SummaryService.ts # ⏳ 模块 C 实现
│   │   │   ├── TranslationService.ts # ⏳ 模块 C 实现
│   │   │   ├── TagService.ts    # ⏳ 模块 D 实现
│   │   │   ├── ExportService.ts # ⏳ 模块 D 实现
│   │   │   └── SettingsService.ts # ⏳ 模块 D 实现
│   │   ├── llm/                 # LLM 层
│   │   │   ├── provider.ts      # ⏳ 模块 C 实现
│   │   │   └── agents.ts      # ⏳ 模块 C 实现
│   │   ├── cleaners/            # 内容清洗层
│   │   │   └── cleaner.ts       # ⏳ 模块 B 实现
│   │   └── types/               # 类型定义
│   │       └── index.ts       # ✅ 已完成
│   ├── preload/             # Preload 脚本
│   │   └── index.ts           # ✅ 已完成：IPC 接口定义
│   └── renderer/                # Vue3 渲染进程
│       ├── main.ts              # ✅ 已完成
│       ├── App.vue            # ✅ 已完成：Mock 数据版本
│       ├── components/      # UI 组件
│       │   ├── TitleBar.vue     # ✅ 已完成
│       │   ├── FeedSidebar.vue  # ✅ 已完成
│       │   ├── ArticleList.vue  # ✅ 已完成
│       │   ├── ReaderView.vue   # ✅ 已完成
│       │   └── SettingsView.vue # ⏳ 模块 D 实现
│       └── styles/
│       └── index.css        # ✅ 已完成
└── design/                    # 设计文档
    ├── plan.md              # 开发计划
    ├── target.md              # 功能目标
    └── Mercury_产品边界与架构说明.md
\`\`\`

## 模块 A：订阅与数据系统

**负责人**：陆锦云、颜泽宇

### 开发任务

1. **实现 FeedService**
   - 文件：`src/main/services/FeedService.ts`
   - 接口：参考 `src/main/services/interfaces.ts` 中的 `IFeedService`
   - 依赖库：`rss-parser`, `fast-xml-parser`

2. **实现 ArticleService**
   - 文件：`src/main/services/ArticleService.ts`
   - 接口：参考 `IArticleService`

3. **实现 Repository 层**
   - 文件：`src/main/database/repository.ts`
   - 封装所有数据库操作
   - 使用 `better-sqlite3`

4. **在主进程中注册 IPC handlers**
   - 文件：`src/main/index.ts`
   - 对接 preload 中定义的接口

### 开发顺序建议

**第 2 周**：
- RSS/Atom Feed 解析（使用 mock HTML 测试）
- Feed 订阅管理（CRUD）
- OPML 导入功能
- 文章入库与去重

**第 3 周**：
- Feed 刷新机制
- 文章状态管理
- 正文抓取（使用 `node-fetch`）

**第 4 周**：
- OPML 导出
- 与其他模块联调

### 对外接口

其他模块依赖你们提供：
- `ArticleService.getArticleContent(entryId)` → 返回 raw HTML（模块 B 需要）
- `ArticleService.getEntries(feedId)` → 返回文章列表（UI 需要）

---

## 模块 B：内容清洗与阅读系统

**负责人**：于海洋、刘昊阳

### 开发任务

1. **实现 CleaningService**
   - 文件：`src/main/services/CleaningService.ts`
   - 接口：参考 `ICleaningService`
   - 依赖库：`sanitize-html`, `turndown`

2. **实现 ContentCleaner**
   - 文件：`src/main/cleaners/cleaner.ts`
   - 使用 `sanitize-html` 清洗 HTML
   - 使用 `turndown` 转换为 Markdown

3. **优化 ReaderView 组件**
   - 文件：`src/renderer/components/ReaderView.vue`
   - 完善阅读样式
   - 添加字体、字号、行距设置（可选）

### 开发顺序建议

**第 2 周**：
- HTML 内容清洗（使用 mock HTML 测试）
- Cleaned HTML 生成
- Cleaned Markdown 生成

**第 3 周**：
- Reader View 渲染优化
- 阅读样式系统
- 文章详情页完善

**第 4 周**：
- 阅读体验优化（图片、代码块、长文章滚动）
- 深色模式（可选）

### 依赖

- 依赖模块 A 提供 `ArticleService.getEntryContent(entryId)` 获取 raw HTML
- 第 2 周可先用 mock HTML 数据独立开发

### 对外接口

其他模块依赖你们提供：
- `CleaningService.clean(rawHtml, url)` → 返回 cleaned HTML 和 Markdown（模块 C 需要）

---

## 模块 C：AI 摘要与翻译系统

**负责人**：林宇轩、孙佳杰

### 开发任务

1. **实现 LLMProvider**
   - 文件：`src/main/llm/provider.ts`
   - 统一接口：baseUrl / apiKey / model / messages → response
   - 支持 OpenAI-compatible API

2. **实现 SummaryService**
   - 文件：`src/main/services/SummaryService.ts`
   - 接口：参考 `ISummaryService`
   - 基于 cleaned Markdown 生成摘要

3. **实现 TranslationService**
   - 文件：`src/main/services/TranslationService.ts`
   - 接口：参考 `ITranslationService`
   - 支持目标语言选择

4. **实现 AI 结果存储**
   - 将摘要/翻译结果写入 `agent_runs` 表
   - 记录 token 用量到 `llm_usage` 表

5. **优化 ReaderView 中的 AI 结果展示**
   - 加载中状态
   - 错误提示

### 开发顺序建议

**第 2 周**：
- LLMProvider 抽象层
- OpenAI-compatible API 接入
- Summary Agent 开发（使用 mock Markdown 测试）

**第 3 周**：
- Translation Agent 开发
- AI 结果存储
- AI 结果展示 UI

**第 4 周**：
- AI 任务状态管理
- LLM 用量统计（可选）

### 依赖

- 依赖模块 B 提供 `CleaningService.clean()` 获取 cleaned Markdown
- 依赖模块 D 提供 LLM 配置（baseUrl / apiKey / model）
- 第 2 周可先用 mock Markdown 和硬编码配置独立开发

### 对外接口

其他模块依赖你们提供：
- `SummaryService.summarize(entryId)` → 返回摘要结果（UI 需要）
- `TranslationService.translate(entryId, targetLang)` → 返回翻译结果（UI 需要）

---

## 模块 D：标签、导出与设置系统

**负责人**：潘飞扬、张震

### 开发任务

1. **实现 TagService**
   - 文件：`src/main/services/TagService.ts`
   - 接口：参考 `ITagService`

2. **实现 ExportService**
   - 文件：`src/main/services/ExportService.ts`
   - 接口：参考 `IExportService`
   - 导出格式：Markdown（含标题+链接+正文+摘要+翻译+标签）

3. **实现 SettingsService**
   - 文件：`src/main/services/SettingsService.ts`
   - 接口：参考 `ISettingsService`
   - LLM 配置持久化到 SQLite

4. **创建 SettingsView 组件**
   - 文件：`src/renderer/components/SettingsView.vue`
   - LLM 配置页面（baseUrl / apiKey / model）
   - 应用设置页面

5. **完善 FeedSidebar 和 ArticleList 的标签功能**
   - 标签筛选逻辑
   - 标签管理面板

### 开发顺序建议

**第 2 周**：
- 标签 CRUD
- 文章打标签
- 按标签筛选

**第 3 周**：
- 单篇 Markdown 导出
- LLM 配置页面
- 应用设置页面

**第 4 周**：
- 标签管理面板
- 多篇导出 / 全文搜索（可选）

### 依赖

- 导出功能依赖模块 B（cleaned Markdown）和模块 C（摘要/翻译结果）
- 标签和设置功能本身独立，第 2 周可直接开发

### 对外接口

其他模块依赖你们提供：
- `SettingsService.getLLMConfig()` → 返回 LLM 配置（模块 C 需要）
- `TagService.getArticleTags(entryId)` → 返回文章标签（UI 需要）
- `ExportService.exportArticle(entryId, path)` → 导出 Markdown（UI 需要）

---

## 协作规范

### 分支规范

| 分支 | 用途 |
|------|------|
| `main` | 稳定分支，不直接提交 |
| `dev` | 开发主分支，各模块合入 |
| `feature/module-a-feed` | 模块 A：陆锦云、颜泽宇 |
| `feature/module-b-cleaning` | 模块 B：于海洋、刘昊阳 |
| `feature/module-c-ai` | 模块 C：林宇轩、孙佳杰 |
| `feature/module-d-tag-export` | 模块 D：潘飞扬、张震 |

### PR 规范

每个 PR 需要包含：
1. 对应的 Issue 编号
2. 修改了什么、为什么修改
3. 自测结果（截图或文字说明）
4. 对外接口变更（如有）

### 文档规范

每周开发完成后，在 `update_docs/` 目录下更新自己的开发文档，格式：`Week{xx}_{github_name}.md`，包含：
- 本周完成的功能
- 新增/变更的接口说明
- 已知问题和待办

---

## 开发建议

### 第 2 周：独立开发

- 各模块使用 mock 数据独立开发
- 不依赖其他模块的真实接口
- 专注于自己模块的核心逻辑

### 第 3 周：接口对接

- 开始对接其他模块的真实接口
- 模块 A → B → C → D 的依赖链逐步打通
- 主链路前半段跑通

### 第 4 周：联调与优化

- 全链路联调
- Bug 修复
- 性能优化
- 用户体验优化

---

## 常见问题

### Q1: 如何在主进程中注册 IPC handler？

在 `src/main/index.ts` 中：

\`\`\`typescript
import { ipcMain } from 'electron'
import { FeedService } from './services/FeedService'

const feedService = new FeedService()

ipcMain.handle('get-feed-list', async () => {
  return await feedService.getAllFeeds()
})
\`\`\`

### Q2: 如何在渲染进程中调用主进程接口？

在 Vue 组件中：
\`\`\`typescript
const feeds = await (window as any).electronAPI.getFeedList()
\`\`\`

### Q3: 如何访问数据库？

在 Service 中：

\`\`\`typescript
import { getDatabase } from '../database/init'

const db = getDatabase()
const stmt = db.prepare('SELECT * FROM feeds')
const feeds = stmt.all()
\`\`\`

### Q4: 如何处理异步操作？

所有 Service 方法都应该返回 Promise：

\`\`\`typescript
async addFeed(url: string): Promise<Feed> {
  // 异步操作
  const feed = await fetchFeed(url)
  // 存入数据库
  saveFeed(feed)
  return feed
}
\`\`\`

### Q5: 如何测试我的模块？

1. 编写单元测试（使用 Vitest）
2. 在 UI 中手动测试
3. 使用 mock 数据验证逻辑
4. 与其他模块联调测试

---

## 联系方式

如有问题，请在 GitHub Issues 中提问，或联系项目负责人潘飞扬。
