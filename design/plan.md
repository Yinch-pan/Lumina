# Mercury 开发计划

## 项目概况

Mercury 是一个跨平台、本地优先、AI 增强型 RSS 阅读器。

| 项目 | 内容 |
|------|------|
| 技术栈 | Electron + Vue3 + TypeScript + Vite + SQLite |
| 周期 | 5 周 |
| 团队 | 8 人 |
| 目标 | 完成从"订阅 → 获取 → 清洗 → 阅读 → 总结 → 翻译 → 标签 → 导出"的完整主链路 MVP |

---

## 团队成员

| 成员 | 角色 |
|------|------|
| 潘飞扬 | 组长 / Demo 骨架开发 / 项目管理 |
| 张震 | 开发 |
| 陆锦云 | 开发 |
| 于海洋 | 开发 |
| 刘昊阳 | 开发 |
| 孙佳杰 | 开发 |
| 颜泽宇 | 开发 |
| 林宇轩 | 开发 |

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

## 时间线

| 阶段 | 周次 | 日期 | 内容 |
|------|------|------|------|
| Demo 骨架 | 第 1 周 | 05/18 ~ 05/24 | 项目初始化 + 基础 UI 骨架 + 数据模型 |
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
    │  2 人         │  2 人         │  2 人         │  2 人         │
    └──────────────┴──────────────┴──────────────┴──────────────┘
            ↓
第 5 周：全组集成 + 测试 + 文档 + 演示
```

> 8 人 = 1（组长做 Demo）+ 7（分 4 组）。其中一组为 1 人，其余三组各 2 人。具体人员分配待定。

---

## 第 1 周：Demo 骨架（05/18 ~ 05/24）

**负责人**：潘飞扬

### 本周目标

完成一个可运行的最小骨架，让后续 4 组可以直接在骨架上开发。

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

**人数**：2 人

**职责范围**：Feed 解析、OPML 导入、Feed 刷新同步、文章入库、本地数据管理

| 编号 | 任务 | 说明 | 建议周次 |
|------|------|------|---------|
| A1 | RSS / Atom Feed 解析 | 使用 `rss-parser`，解析 Feed URL 并提取文章列表 | 第 2 周 |
| A2 | Feed 订阅管理 | 添加/删除/编辑订阅源，Feed Sidebar UI 对接 | 第 2 周 |
| A3 | OPML 导入功能 | 使用 `fast-xml-parser` 或 `opml-parser` 解析，批量导入订阅源 | 第 2 周 |
| A4 | 文章入库与去重 | 解析后的文章写入 `entries` 表，基于 GUID/URL 去重 | 第 2~3 周 |
| A5 | Feed 刷新机制 | 手动刷新 + 定时刷新（可选），更新文章列表 | 第 3 周 |
| A6 | 文章状态管理 | 已读/未读状态、文章列表排序与筛选 | 第 3 周 |
| A7 | 正文抓取 | 根据文章 URL 使用 `node-fetch` / Electron `net` 获取原始 HTML 并存储 | 第 3~4 周 |
| A8 | OPML 导出（P1 可选） | 将当前订阅源导出为 OPML 文件 | 第 4 周 |

**模块 A 交付标准**：
- 能通过 URL 添加 RSS/Atom 订阅源
- 能导入 OPML 文件并批量添加订阅源
- 刷新后文章自动入库并在 Article List 中展示
- 文章去重正常工作
- 能抓取文章原始 HTML

**对外接口**（提供给其他模块）：
- `FeedService.add_feed(url) → Feed`
- `FeedService.refresh_feed(feed_id) → List[Entry]`
- `FeedService.import_opml(file_path) → List[Feed]`
- `ArticleService.get_entries(feed_id) → List[Entry]`
- `ArticleService.get_entry_content(entry_id) → EntryContent`
- `ArticleService.mark_read(entry_id)`

---

### 模块 B：内容清洗与阅读系统

**人数**：2 人

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

**模块 B 交付标准**：
- 给定一个 entry 的 raw HTML，能输出 cleaned HTML 和 cleaned Markdown
- Reader View 展示清洗后的文章内容，排版清晰可读
- 支持至少一种阅读样式设置
- 清洗失败时有 fallback（显示原文链接）

**依赖**：
- 依赖模块 A 提供 `ArticleService.get_entry_content(entry_id)` 获取 raw HTML

**对外接口**（提供给其他模块）：
- `CleaningService.clean(raw_html, url) → CleanedContent`（含 cleaned_html、cleaned_markdown）
- Reader View 组件接收 `CleanedContent` 并渲染

---

### 模块 C：AI 摘要与翻译系统

**人数**：2 人

**职责范围**：LLM Provider 抽象、Summary Agent、Translation Agent、AI 结果展示

| 编号 | 任务 | 说明 | 建议周次 |
|------|------|------|---------|
| C1 | LLMProvider 抽象层 | 统一接口：base_url / api_key / model / messages → response | 第 2 周 |
| C2 | OpenAI-compatible API 接入 | 实现标准 API 调用，支持流式/非流式 | 第 2 周 |
| C3 | Summary Agent 开发 | 基于 cleaned Markdown 生成文章摘要 | 第 2~3 周 |
| C4 | Translation Agent 开发 | 基于 cleaned Markdown 生成文章翻译 | 第 3 周 |
| C5 | AI 结果存储 | 将摘要/翻译结果写入 `agent_runs` 表 | 第 3 周 |
| C6 | AI 结果展示 UI | Reader View 中展示摘要和翻译结果 | 第 3~4 周 |
| C7 | AI 任务状态管理 | 加载中/成功/失败状态，错误提示 | 第 4 周 |
| C8 | LLM 用量统计（P1 可选） | 记录 token 用量到 `llm_usage` 表，展示统计面板 | 第 4 周 |

**模块 C 交付标准**：
- 用户配置 base_url / api_key / model 后，能调用 AI 接口
- 对单篇文章能生成摘要
- 对单篇文章能生成翻译
- AI 结果在 Reader View 中可查看
- AI 请求失败时有明确的错误提示

**依赖**：
- 依赖模块 B 提供 `CleaningService.clean()` 获取 cleaned Markdown 作为 AI 输入

**对外接口**（提供给其他模块）：
- `SummaryService.summarize(entry_id) → SummaryResult`
- `TranslationService.translate(entry_id, target_lang) → TranslationResult`

---

### 模块 D：标签、导出与设置系统

**人数**：2 人

**职责范围**：标签管理、Markdown 导出、LLM 配置页面、应用设置

| 编号 | 任务 | 说明 | 建议周次 |
|------|------|------|---------|
| D1 | 标签 CRUD | 创建/编辑/删除标签 | 第 2 周 |
| D2 | 文章打标签 | 给文章添加/移除标签 | 第 2 周 |
| D3 | 按标签筛选 | 在文章列表中按标签过滤 | 第 2~3 周 |
| D4 | 单篇 Markdown 导出 | 导出标题+链接+正文+摘要+翻译+标签 | 第 3 周 |
| D5 | LLM 配置页面 | base_url / api_key / model 的设置界面 | 第 3 周 |
| D6 | 应用设置页面 | 阅读偏好、数据目录、语言等设置 | 第 3~4 周 |
| D7 | 标签管理面板 | 标签列表、使用统计、批量管理 | 第 4 周 |
| D8 | 多篇导出 / 全文搜索（P1 可选） | 按标签批量导出 / 搜索标题和正文 | 第 4 周 |

**模块 D 交付标准**：
- 能创建标签、给文章打标签、按标签筛选文章
- 能将单篇文章导出为 Markdown 文件（含摘要/翻译/标签）
- LLM 配置页面可用，配置能持久化到 SQLite
- 设置页面基本功能可用

**依赖**：
- 导出功能依赖模块 B（cleaned Markdown）和模块 C（摘要/翻译结果）

**对外接口**（提供给其他模块）：
- `TagService.add_tag(entry_id, tag_name)`
- `TagService.get_tags(entry_id) → List[Tag]`
- `TagService.filter_by_tag(tag_name) → List[Entry]`
- `ExportService.export_markdown(entry_id, path)`

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
| I3 | 跨平台兼容性检查 | 待定 |
| I4 | 主链路端到端测试 | 组长 |
| I5 | README / AGENTS.md / 项目文档整理 | 组长 + 各模块 1 人 |
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
模块 A（订阅+数据）
   │
   │ 提供 raw HTML + 文章数据
   ▼
模块 B（清洗+阅读）
   │
   │ 提供 cleaned Markdown
   ▼
模块 C（AI 摘要+翻译）
   │
   │ 提供 摘要/翻译结果
   ▼
模块 D（标签+导出+设置）
   └── 也直接依赖模块 A（文章数据）
```

> **注意**：模块 A 和 B 有依赖关系（B 需要 A 的 raw HTML），但第 2 周 B 可以先用 mock 数据开发清洗逻辑，不必等 A 完成。同理，模块 C 第 2 周先开发 LLM Provider，不依赖 B。模块 D 的标签功能独立，第 2 周可直接开发。

---

## 协作规范

### 分支规范

| 分支 | 用途 |
|------|------|
| `main` | 稳定分支，不直接提交 |
| `dev` | 开发主分支，各模块合入 |
| `feature/demo-skeleton` | 第 1 周 Demo 骨架 |
| `feature/module-a-feed` | 模块 A 开发 |
| `feature/module-b-cleaning` | 模块 B 开发 |
| `feature/module-c-ai` | 模块 C 开发 |
| `feature/module-d-tag-export` | 模块 D 开发 |

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

---

## 人员分配（待定）

| 模块 | 人数 | 成员 |
|------|------|------|
| Demo 骨架 | 1 人 | 潘飞扬 |
| 模块 A：订阅 + 数据 | 2 人 | 待定 |
| 模块 B：清洗 + 阅读 | 2 人 | 待定 |
| 模块 C：AI 摘要 + 翻译 | 2 人 | 待定 |
| 模块 D：标签 + 导出 + 设置 | 1~2 人 | 待定 |

> 7 人分 4 组 → 3 组各 2 人 + 1 组 1 人。建议把 1 人组安排在模块 D（标签+导出+设置），因为它的核心功能相对独立且体量适中。组长在第 2~4 周同时兼顾项目管理和支援。
