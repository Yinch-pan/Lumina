# Mercury

## 项目概况

Mercury 是一个跨平台、本地优先、AI 增强型 RSS 阅读器。

## 快速开始

### 安装依赖

\`\`\`bash
npm install
\`\`\`

### 开发模式

方式一（推荐）：
\`\`\`bash
./dev.sh
\`\`\`

方式二：
\`\`\`bash
# 终端 1：启动 Vite 开发服务器
npm run dev

# 终端 2：启动 Electron
npm run dev:electron
\`\`\`

### 构建

\`\`\`bash
npm run build
\`\`\`

## 当前进度

✅ **第 1 周 Demo 骨架已完成**

- 项目初始化完成
- 三栏布局 UI 实现
- Mock 数据和基础交互
- 数据模型和 Service 接口定义

详见 [INIT.md](./INIT.md)

## Maintainers

- 潘飞扬
- 张震
- 陆锦云
- 于海洋
- 刘昊阳
- 孙佳杰
- 颜泽宇
- 林宇轩

---



| 项目 | 内容 |
|------|------|
| 技术栈 | Electron + Vue3 + TypeScript + Vite + SQLite |
| 周期 | 5 周（05/18 ~ 06/21） |
| 团队 | 8 人，分 4 组 |
| 目标 | 完成"订阅 → 获取 → 清洗 → 阅读 → 总结 → 翻译 → 标签 → 导出"的完整主链路 MVP |

---

## 技术栈详情

| 层级 | 技术选择 |
|------|---------|
| 桌面框架 | Electron |
| 前端框架 | Vue3 + TypeScript |
| 构建工具 | Vite（electron-vite） |
| UI 组件库 | Element Plus 或 Naive UI |
| 本地数据库 | SQLite（`better-sqlite3`） |
| Feed 解析 | `rss-parser` |
| OPML 解析 | `fast-xml-parser` 或 `opml-parser` |
| 网页抓取 | Electron `net` 模块 / `node-fetch` |
| 内容清洗 | `@mozilla/readability` + `jsdom` + `sanitize-html` |
| Markdown 转换 | `turndown` |
| AI 接入 | OpenAI-compatible API（`openai` SDK） |
| 图标 | `lucide-vue-next` |
| 平台路径 | `electron.app.getPath()` |
| 打包 | `electron-builder` |
| 测试 | Vitest |
| 协作 | GitHub Issues + PR |

---

## 团队分组

| 模块 | 成员 | 职责 |
|------|------|------|
| Demo 骨架（第 1 周） | 潘飞扬 | 项目初始化 + 基础 UI 骨架 + 数据模型 |
| 模块 A：订阅与数据 | 陆锦云、颜泽宇 | Feed 解析、OPML 导入、刷新同步、正文抓取 |
| 模块 B：清洗与阅读 | 于海洋、刘昊阳 | 内容清洗、Markdown 转换、Reader View、阅读样式 |
| 模块 C：AI 摘要与翻译 | 林宇轩、孙佳杰 | LLM Provider、Summary Agent、Translation Agent |
| 模块 D：标签、导出与设置 | 潘飞扬、张震 | 标签管理、Markdown 导出、LLM 配置、应用设置 |

> 潘飞扬第 1 周独立完成 Demo 骨架，第 2~4 周与张震一起开发模块 D，同时兼顾项目管理。

---

## 时间线

| 阶段 | 周次 | 日期 | 内容 |
|------|------|------|------|
| Demo 骨架 | 第 1 周 | 05/18 ~ 05/24 | 潘飞扬完成项目初始化 + 基础骨架 |
| 模块并行开发 | 第 2 周 | 05/25 ~ 05/31 | 4 组并行开发各自模块 |
| 模块并行开发 | 第 3 周 | 06/01 ~ 06/07 | 继续开发 + 模块间初步对接 |
| 模块并行开发 | 第 4 周 | 06/08 ~ 06/14 | 功能收尾 + 跨模块联调 |
| 集成交付 | 第 5 周 | 06/15 ~ 06/21 | 集成测试 + Bug 修复 + 文档 + 演示准备 |

---

## 开发结构：1 + 3 + 1

```
第 1 周：潘飞扬独立完成 Demo 骨架
              ↓
第 2~4 周：4 组并行开发
    ┌──────────────┬──────────────┬──────────────┬──────────────┐
    │  模块 A       │  模块 B       │  模块 C       │  模块 D       │
    │  订阅 + 数据   │  清洗 + 阅读   │  AI 摘要/翻译  │  标签+导出+设置 │
    │  陆锦云       │  于海洋       │  林宇轩       │  潘飞扬       │
    │  颜泽宇       │  刘昊阳       │  孙佳杰       │  张震         │
    └──────────────┴──────────────┴──────────────┴──────────────┘
              ↓
第 5 周：全组集成 + 测试 + 文档 + 演示
```

---

## 第 1 周：Demo 骨架（05/18 ~ 05/24）

**负责人**：潘飞扬

### 本周目标

完成一个可运行的最小骨架，让 4 组可以直接在骨架上开发。

### 具体任务

| 编号 | 任务 | 产出 |
|------|------|------|
| D1 | 项目初始化（目录结构、依赖管理、Git 规范） | `package.json`、Electron + Vue3 + Vite 项目结构 |
| D2 | Electron 主窗口 + Vue3 三栏布局骨架 | 左侧 Feed Sidebar、中间 Article List、右侧 Reader View |
| D3 | SQLite 数据模型定义 + 初始化脚本（`better-sqlite3`） | `feeds`、`entries`、`entry_contents`、`tags`、`entry_tags`、`agent_runs`、`llm_usage`、`settings` 表 |
| D4 | 平台路径抽象（`electron.app.getPath()`） | `getAppDataDir()`、`getDatabasePath()` 等 |
| D5 | Service 层接口定义（占位） | `FeedService`、`ArticleService`、`CleaningService`、`SummaryService`、`TranslationService`、`TagService`、`ExportService` 接口签名 |
| D6 | Mock 数据 + 基础交互 | 左侧 mock feed → 中间 mock article list → 点击文章 → 右侧 mock content |
| D7 | 编写 INIT.md / PLAN.md / AGENTS.md | 项目文档初始化 |
| D8 | 创建 GitHub Issues + PR 模板 | 协作规范 |

### 本周交付标准

```
启动 App
  → 左侧显示 mock feed 列表
  → 中间显示 mock article list
  → 点击文章
  → 右侧显示 mock reader content
  → Summary / Translation / Tag / Export 按钮占位可见
```

---

## 第 2~4 周：模块并行开发（05/25 ~ 06/14）

---

### 模块 A：订阅与数据系统

**负责人**：陆锦云、颜泽宇

**职责范围**：Feed 解析、OPML 导入、Feed 刷新同步、文章入库、本地数据管理

| 编号 | 任务 | 说明 | 建议周次 |
|------|------|------|---------|
| A1 | RSS / Atom Feed 解析 | 使用 `rss-parser`，解析 Feed URL 并提取文章列表 | 第 2 周 |
| A2 | Feed 订阅管理 | 添加/删除/编辑订阅源，Feed Sidebar UI 对接 | 第 2 周 |
| A3 | OPML 导入功能 | 使用 `fast-xml-parser` 或 `opml-parser` 解析，批量导入订阅源 | 第 2 周 |
| A4 | 文章入库与去重 | 解析后的文章写入 `entries` 表，基于 GUID/URL 去重 | 第 2~3 周 |
| A5 | Feed 刷新机制 | 手动刷新 + 定时刷新（可选），更新文章列表 | 第 3 周 |
| A6 | 文章状态管理 | 已读/未读状态、文章列表排序与筛选 | 第 3 周 |
| A7 | 正文抓取 | 根据文章 URL 使用 Electron `net` / `node-fetch` 获取原始 HTML 并存储 | 第 3~4 周 |
| A8 | OPML 导出（P1 可选） | 将当前订阅源导出为 OPML 文件 | 第 4 周 |

**交付标准**：
- 能通过 URL 添加 RSS/Atom 订阅源
- 能导入 OPML 文件并批量添加订阅源
- 刷新后文章自动入库并在 Article List 中展示
- 文章去重正常工作
- 能抓取文章原始 HTML

**对外接口**（提供给其他模块）：
- `FeedService.addFeed(url): Promise<Feed>`
- `FeedService.refreshFeed(feedId): Promise<Entry[]>`
- `FeedService.importOpml(filePath): Promise<Feed[]>`
- `ArticleService.getEntries(feedId): Promise<Entry[]>`
- `ArticleService.getEntryContent(entryId): Promise<EntryContent>`
- `ArticleService.markRead(entryId): void`

---

### 模块 B：内容清洗与阅读系统

**负责人**：于海洋、刘昊阳

**职责范围**：HTML 内容清洗、Markdown 转换、Reader View 渲染、阅读样式

| 编号 | 任务 | 说明 | 建议周次 |
|------|------|------|---------|
| B1 | HTML 内容清洗 | 使用 `@mozilla/readability` + `jsdom` 提取正文 | 第 2 周 |
| B2 | Cleaned HTML 生成 | 使用 `sanitize-html` 从 raw HTML 生成可阅读的 cleaned HTML | 第 2 周 |
| B3 | Cleaned Markdown 生成 | 使用 `turndown` 将 cleaned HTML 转为 Markdown | 第 2~3 周 |
| B4 | Reader View 渲染 | 在右侧阅读区展示 cleaned HTML，支持基本排版 | 第 3 周 |
| B5 | 阅读样式系统 | 字体、字号、行距、主题色等阅读设置 | 第 3 周 |
| B6 | 文章详情页完善 | 标题、作者、发布时间、来源链接等元信息展示 | 第 3~4 周 |
| B7 | 阅读体验优化 | 图片显示、代码块样式、长文章滚动等 | 第 4 周 |
| B8 | 深色模式（P1 可选） | 阅读区深色主题 | 第 4 周 |

**交付标准**：
- 给定一篇文章的 raw HTML，能输出 cleaned HTML 和 cleaned Markdown
- Reader View 展示清洗后的文章内容，排版清晰可读
- 支持至少一种阅读样式设置
- 清洗失败时有 fallback（显示原文链接）

**依赖**：
- 依赖模块 A 提供 `ArticleService.getEntryContent(entryId)` 获取 raw HTML
- 第 2 周可先用 mock HTML 数据独立开发清洗逻辑

**对外接口**（提供给其他模块）：
- `CleaningService.clean(rawHtml: string, url: string): Promise<CleanedContent>`
- `CleanedContent` 包含 `cleanedHtml`、`cleanedMarkdown`、`title`、`author`

---

### 模块 C：AI 摘要与翻译系统

**负责人**：林宇轩、孙佳杰

**职责范围**：LLM Provider 抽象、Summary Agent、Translation Agent、AI 结果展示

| 编号 | 任务 | 说明 | 建议周次 |
|------|------|------|---------|
| C1 | LLMProvider 抽象层 | 统一接口：baseUrl / apiKey / model / messages → response | 第 2 周 |
| C2 | OpenAI-compatible API 接入 | 使用 `openai` SDK，支持流式/非流式调用 | 第 2 周 |
| C3 | Summary Agent 开发 | 基于 cleaned Markdown 生成文章摘要，含 Prompt 模板 | 第 2~3 周 |
| C4 | Translation Agent 开发 | 基于 cleaned Markdown 生成文章翻译，支持目标语言选择 | 第 3 周 |
| C5 | AI 结果存储 | 将摘要/翻译结果写入 `agent_runs` 表 | 第 3 周 |
| C6 | AI 结果展示 UI | Reader View 中展示摘要和翻译结果 | 第 3~4 周 |
| C7 | AI 任务状态管理 | 加载中/成功/失败状态，错误提示 | 第 4 周 |
| C8 | LLM 用量统计（P1 可选） | 记录 token 用量到 `llm_usage` 表，展示统计面板 | 第 4 周 |

**交付标准**：
- 用户配置 baseUrl / apiKey / model 后，能调用 AI 接口
- 对单篇文章能生成摘要
- 对单篇文章能生成翻译
- AI 结果在 Reader View 中可查看
- AI 请求失败时有明确的错误提示

**依赖**：
- 依赖模块 B 提供 `CleaningService.clean()` 获取 cleaned Markdown 作为 AI 输入
- 依赖模块 D 提供 LLM 配置（baseUrl / apiKey / model）
- 第 2 周可先用 mock Markdown 和硬编码配置独立开发

**对外接口**（提供给其他模块）：
- `SummaryService.summarize(entryId): Promise<SummaryResult>`
- `TranslationService.translate(entryId, targetLang): Promise<TranslationResult>`

---

### 模块 D：标签、导出与设置系统

**负责人**：潘飞扬、张震

**职责范围**：标签管理、Markdown 导出、LLM 配置页面、应用设置

| 编号 | 任务 | 说明 | 建议周次 |
|------|------|------|---------|
| D1 | 标签 CRUD | 创建/编辑/删除标签 | 第 2 周 |
| D2 | 文章打标签 | 给文章添加/移除标签 | 第 2 周 |
| D3 | 按标签筛选 | 在文章列表中按标签过滤 | 第 2~3 周 |
| D4 | 单篇 Markdown 导出 | 导出标题+链接+正文+摘要+翻译+标签 | 第 3 周 |
| D5 | LLM 配置页面 | baseUrl / apiKey / model 的设置界面，配置持久化到 SQLite | 第 3 周 |
| D6 | 应用设置页面 | 阅读偏好、数据目录、语言等设置 | 第 3~4 周 |
| D7 | 标签管理面板 | 标签列表、使用统计、批量管理 | 第 4 周 |
| D8 | 多篇导出 / 全文搜索（P1 可选） | 按标签批量导出 / 搜索标题和正文 | 第 4 周 |

**交付标准**：
- 能创建标签、给文章打标签、按标签筛选文章
- 能将单篇文章导出为 Markdown 文件（含摘要/翻译/标签）
- LLM 配置页面可用，配置能持久化
- 设置页面基本功能可用

**依赖**：
- 导出功能依赖模块 B（cleaned Markdown）和模块 C（摘要/翻译结果）
- 标签和设置功能本身独立，第 2 周可直接开发

**对外接口**（提供给其他模块）：
- `TagService.addTag(entryId, tagName): void`
- `TagService.getTags(entryId): Tag[]`
- `TagService.filterByTag(tagName): Entry[]`
- `ExportService.exportMarkdown(entryId, path): void`
- `SettingsService.getLLMConfig(): LLMConfig`

---

## 第 5 周：集成与交付（06/15 ~ 06/21）

**负责人**：全组

### 本周目标

将 4 个模块集成为完整应用，完成最终验收。

### 具体任务

| 编号 | 任务 | 负责 |
|------|------|------|
| I1 | 跨模块联调 | 全组 |
| I2 | Bug 修复 | 各模块负责人 |
| I3 | 跨平台兼容性检查 | 潘飞扬 + 各组 1 人 |
| I4 | 主链路端到端测试 | 潘飞扬 |
| I5 | README / AGENTS.md / 项目文档整理 | 潘飞扬 + 各组 1 人 |
| I6 | PPT 和演示准备 | 全组（各自负责自己模块的板块） |

### 最终 Demo 主线（验收标准）

```
打开 Mercury
  → 导入 OPML 文件
  → 刷新 Feed
  → 查看文章列表
  → 打开一篇文章
  → 显示 cleaned Reader View
  → 生成 AI Summary
  → 生成 AI Translation
  → 添加标签
  → 导出 Markdown
```

---

## 模块依赖关系

```
模块 A（订阅+数据）          模块 D（标签+导出+设置）
陆锦云、颜泽宇               潘飞扬、张震
   │                            │
   │ 提供 raw HTML + 文章数据     │ 提供 LLM 配置
   ▼                            │
模块 B（清洗+阅读）              │
于海洋、刘昊阳                   │
   │                            │
   │ 提供 cleaned Markdown       │
   ▼                            │
模块 C（AI 摘要+翻译）  ◄────────┘
林宇轩、孙佳杰
   │
   │ 提供 摘要/翻译结果
   ▼
模块 D（导出功能需要 B + C 的数据）
```

> **并行开发策略**：第 2 周各组使用 mock 数据独立开发，互不阻塞。第 3 周开始对接真实接口。第 4 周完成跨模块联调。

---

## 各周检查点

| 周次 | 检查内容 | 验收方式 |
|------|---------|---------|
| 第 1 周末 | Demo 骨架可运行，mock 数据可交互 | 启动 App 截图 |
| 第 2 周末 | 各模块核心功能可独立运行（可用 mock） | 各组录屏或截图 |
| 第 3 周末 | 模块 A→B 对接完成，C 可调用真实 API | 主链路前半段跑通 |
| 第 4 周末 | 全链路可跑通（含 AI），标签和导出可用 | 主链路端到端演示 |
| 第 5 周末 | 最终 Demo 稳定，文档齐全 | 正式演示 |

---

## 协作规范

### 分支规范

| 分支 | 用途 |
|------|------|
| `main` | 稳定分支，不直接提交 |
| `dev` | 开发主分支，各模块合入 |
| `feature/demo-skeleton` | 第 1 周 Demo 骨架 |
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

## 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 模块 A 延迟导致 B/C 阻塞 | 整体进度推迟 | B/C 第 2 周使用 mock 数据独立开发 |
| AI 接口不稳定 | 摘要/翻译功能不可用 | 模块 C 实现 mock fallback，支持离线演示 |
| Electron 跨平台打包问题 | 某平台 UI 异常或打包失败 | 优先保证一个平台跑通，其他平台列 known issues |
| 第 4 周联调冲突 | 接口不匹配 | 第 1 周 Demo 骨架中定义清晰的 Service 接口签名 |
| 人员进度不均 | 某组拖慢整体 | 每周检查进度，必要时跨组支援 |
