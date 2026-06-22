# Mercury 借鉴其他团队功能 — 设计方案

> 日期：2026-06-22
> 目标：调研同课程其他 7 个组的 RSS 阅读器项目，将其有价值的功能与做法落地到 Mercury。**前端布局保持 Mercury 自己的三栏结构与现有组件不变**，只在组件内部扩展交互、在主进程扩展能力。

## 背景与调研结论

调研了 8 组里的其余 7 组（技术栈各异：2 个 Tauri+Rust、1 个 PySide6+Python、若干 Electron/Web）。对照 Mercury 当前真实代码（`src/`），提炼出值得借鉴、且我们当前缺失或较弱的功能。

Mercury 现状（已确认）：
- DB：better-sqlite3，schema 在 `init.ts`，迁移靠临时的 `migrateFeedsTable`（仅 feeds 表），未用版本化迁移，未开 WAL。
- LLM：`OpenAICompatibleProvider` 已支持 chat/streamChat；`SummaryAgent` 有流式，`TranslationAgent` 仅整篇非流式。用量已落库 `llm_usage`（但无前端展示）。
- IPC：全部为 `ipcRenderer.invoke` 请求/响应模式，**无主进程→渲染进程的事件推送通道**。
- 安全：contextIsolation 开、nodeIntegration 关；但 **API Key 明文存 `settings` 表**。
- 前端：三栏（FeedSidebar / ArticleList / ReaderView）+ 若干对话框；App.vue 仍保留 mock 数据兜底，真实 IPC 路径已通。

## 确认的范围

本次落地 9 个功能 = A 档 5 项 + B 档 4 项（用户已确认全选），外加 1 项支撑性地基重构。逐段翻译采用**逐段流式**体验（用户已确认）。

## 架构原则

1. 前端布局/组件结构不变，新增交互内嵌进现有组件（ReaderView、ArticleList、FeedSidebar、SettingsView、TagDialog）。
2. 业务能力放主进程 service 层，前端经 IPC 调用，沿用现有 `cloneForIpc` + `ipcMain.handle` 模式。
3. 新增的 schema 变更一律走版本化迁移，不再手写零散 ALTER。
4. 每个 service 变更配 vitest 单测（沿用现有 `test/` 与 vitest 配置）。

---

## 地基：版本化迁移 + WAL（先做）

**问题**：`migrateFeedsTable` 是临时方案，后续要加多列多表会失控。

**方案**：
- 在 `init.ts` 引入基于 `PRAGMA user_version` 的有序迁移数组：`const migrations: Array<(db)=>void> = [...]`，每条迁移在事务内执行，执行后递增 `user_version`。
- 启动时开启 `PRAGMA journal_mode = WAL`、`PRAGMA busy_timeout = 5000`。
- 现有表的 `CREATE TABLE IF NOT EXISTS` 保留作为「全新库」的基线；迁移数组负责「旧库升级」（加列、加表、加 FTS、加触发器）。
- 把现有 `migrateFeedsTable` 逻辑并入迁移体系（作为已应用的早期迁移，幂等）。

**风险**：低。对全新库无影响；对旧库仅追加。落地后用现有 `test/services-regression` 验证读写正常。

---

## A 档

### A1. 全文搜索（FTS5）
- 迁移新增 `entries_fts` FTS5 虚拟表，索引 `title`、`excerpt`、`cleaned_markdown`（content 来自 entries + entry_contents）。用 INSERT/UPDATE/DELETE 触发器自动同步。首次迁移时回填存量数据。
- `Repository.searchArticles(query: string): Article[]`，用 FTS5 `MATCH` + 简单转义。
- IPC `search-articles`；preload 加 `searchArticles(query)`。
- 前端：ArticleList 顶部加搜索输入框（防抖 ~250ms）。有查询词时列表显示搜索结果，清空时恢复当前 feed/tag 的列表。布局不变，仅在列表头部插入搜索条。

### A2. 逐段翻译 + 双语对照（流式）
- `TranslationService`：把 cleanedMarkdown 按空行/段落拆分；逐段调用 LLM。
- 容错：单段失败做指数退避重试（如 0.5s/1s/2s），仍失败则保留原文占位、标记该段 failed，不中断整体。
- **新建事件通道**：主进程 `mainWindow.webContents.send('translate-progress', { articleId, index, total, source, translated, status })`；preload 暴露 `onTranslateProgress(cb)` / `offTranslateProgress`。这是当前不存在的 main→renderer 推送能力，需新增。
- IPC `translate-article` 改为启动逐段任务并通过事件推进度；最终结果仍写入 `agent_runs`（translation）。
- 前端：ReaderView 翻译区改为双语对照渲染（原文段 + 译文段交替），监听进度事件边翻边出；失败段显示原文 + 重试入口。

### A3. 划词高亮 + 笔记
- 迁移新增表 `highlights(id, entry_id, selected_text, prefix_text, suffix_text, color, note, created_at)`，外键级联删除。
- Repository + 新 `HighlightService`：增删改查 by entry。
- IPC：`get-highlights` / `add-highlight` / `update-highlight`(改 note/color) / `delete-highlight`；preload 对应暴露。
- 前端 ReaderView：监听正文 `mouseup` 取选区，弹浮动小工具栏（5 种高亮色 + 「加笔记」）。保存时记录选中文本与前后上下文片段。重新打开文章时按「文本 + 上下文」在已渲染正文中重新定位并着色。笔记集中在正文下方或右侧小区块展示。
- 复杂度最高，放最后实现。

### A4. 摘要分档
- `SummaryService.summarize(articleId, length?: 'short'|'medium'|'long')`，默认 medium。三套 prompt 模板（句数/段落要求不同）+ 不同 maxTokens。
- IPC `summarize-article` 增加可选 length 参数（向后兼容）。
- 前端 ReaderView：AI 摘要区旁加三档切换（短/中/长），切换即重新生成。

### A5. API Key 加密存储
- 用 Electron `safeStorage.encryptString/decryptString`。保存 LLM 配置时加密 apiKey 后存 `settings`（值用 base64），读取时解密。
- 启动迁移：检测 settings 中已有明文 key，自动加密回写。
- `safeStorage.isEncryptionAvailable()` 为 false 时降级明文并记录（开发兜底）。
- 仅改 `SettingsService` 的 LLM 配置读写路径，前端无感。

---

## B 档

### B1. 用量统计面板
- `Repository.getUsageStats()`：按 model / 日期 / agent_type 聚合 `llm_usage`（join `agent_runs` 取 agent_type）。
- IPC `get-usage-stats`；preload 暴露。
- 前端：SettingsView 增加「用量」标签页，表格 + 轻量柱状（纯 CSS 或简单 SVG，不引重型图表库）。

### B2. 文章收藏/星标
- 迁移给 `entries` 加 `is_starred INTEGER DEFAULT 0`。
- Repository：`setStarred(entryId, bool)`、`getStarredArticles()`；`toArticle` 带出 isStarred。
- IPC `set-article-starred` / `get-starred-articles`；preload 暴露。
- 前端：ArticleList 卡片 + ReaderView 头部加星标按钮；FeedSidebar 加「⭐ 收藏」虚拟入口；`ArticleFilter` 增加 `starred`。

### B3. 阅读进度记忆
- 迁移给 `entries` 加 `scroll_percent REAL DEFAULT 0`。
- IPC `save-scroll-percent(articleId, percent)`；打开文章时从 articleContent 带出并恢复。
- 前端 ReaderView：滚动防抖（~500ms）保存百分比；加载后 `nextTick` 恢复滚动位置。

### B4. AI 建议标签
- 新 `TagSuggestionAgent`：输入正文摘要/全文 + 现有标签名列表，prompt 要求「优先复用已有标签，最多 N 个候选」，返回候选数组。
- 新 `TagSuggestionService` + IPC `suggest-tags(articleId)`；preload 暴露。
- 前端 TagDialog：加「AI 建议」按钮 → 候选以勾选框列出（已有标签优先高亮）→ **用户勾选确认后才写入**，AI 不自动改标签。

---

## 实施顺序与验证

1. **地基**：版本化迁移 + WAL。跑 `npm run build` + 现有回归脚本。
2. **后端批次**：A1/A2/A4/A5 + B1/B2/B3/B4 的 Repository/Service/IPC/preload。每个 service 配 vitest 单测，`npm run build:main` 验证编译。
3. **前端接线**：各组件交互（搜索框、双语对照、摘要分档、星标、进度、用量页、建议标签）。`npm run build` 验证。
4. **划词高亮（A3）**：单独收尾，最复杂。

每批次结束运行 `npm run build` 确保 TS 编译通过；service 层逻辑用 vitest 覆盖；划词高亮等 UI 交互手动验证。

## 不做（YAGNI）
- 不引入 i18n、不做 Web/iframe 阅读模式、不做 Digest 导出、不做 ETag 条件请求、不做 SQLite→JSON 降级（与本次 9 项无关，避免扩散）。
- 不替换前端布局或组件框架。
- 不引入重型图表/状态管理库。

## 风险点
- A2 的 main→renderer 事件通道是新增机制，需确保窗口关闭/切换文章时正确取消订阅与中止进行中的翻译任务。
- A3 划词高亮的「重新定位」在正文 DOM 上按文本匹配，长文重复文本可能误匹配，用前后上下文降低歧义；接受少量边界 case 不完美。
- A5 safeStorage 在部分 Linux 环境不可用，已设计明文降级。
