# A 模块功能与实现说明

## 1. 模块定位

A 模块是 Mercury 的“订阅与数据系统”，负责主链路前半段：

```text
订阅源导入
  -> Feed 刷新
  -> 文章入库
  -> 正文原始 HTML 抓取
```

它为后续模块提供基础数据：

- 模块 B：使用 raw HTML 做内容清洗。
- 模块 C：基于清洗后的内容做摘要和翻译。
- 模块 D：基于文章数据做标签、导出和设置。

## 2. 后端新增能力

### 2.1 Repository 数据访问层

新增文件：

- `src/main/database/repository.ts`

主要职责：

- 封装 `feeds`、`entries`、`entry_contents`、`tags` 等表的读写。
- 提供 Feed 列表、文章列表、未读数量、文章内容、已读状态等查询。
- 对返回给 IPC/UI 的对象做普通类型转换，避免结构化克隆失败。

### 2.2 FeedService

新增文件：

- `src/main/services/FeedService.ts`

实现能力：

- 添加 RSS/Atom 订阅源。
- 编辑订阅源显示名称。
- 删除订阅源。
- 获取订阅源列表。
- 手动刷新单个订阅源。
- 刷新全部订阅源。
- 自动刷新到期订阅源。
- OPML 预览、导入、导出。
- 文章解析、入库和去重。

使用依赖：

- `rss-parser`：解析 RSS/Atom。
- `fast-xml-parser`：解析和生成 OPML。

### 2.3 ArticleService

新增文件：

- `src/main/services/ArticleService.ts`

实现能力：

- 按 Feed 查询文章列表。
- 查询全部文章。
- 查询未读文章。
- 获取文章详细内容。
- 懒抓取文章 raw HTML 并写入 `entry_contents.raw_html`。
- 标记文章已读/未读。

### 2.4 IPC 与 preload

修改文件：

- `src/main/index.ts`
- `src/preload/index.ts`
- `src/renderer/env.d.ts`

新增或补齐接口：

- `getFeedList()`
- `addFeed(url)`
- `updateFeed(feedId, updates)`
- `resetFeedTitle(feedId)`
- `deleteFeed(feedId)`
- `refreshFeed(feedId)`
- `refreshAllFeeds()`
- `selectOpmlFile()`
- `selectOpmlExportPath()`
- `previewOpml(filePath)`
- `importOpmlFeeds(feeds)`
- `exportOpml(filePath)`
- `getArticleList(feedId)`
- `getAllArticles()`
- `getUnreadArticles()`
- `getArticleContent(articleId)`
- `markArticleRead(articleId)`
- `markArticleUnread(articleId)`

## 3. 数据库实现

### 3.1 基础表

A 模块主要使用：

- `feeds`：订阅源信息。
- `entries`：文章元数据。
- `entry_contents`：文章 raw HTML、cleaned HTML、Markdown。

### 3.2 订阅源名称拆分

`feeds` 表新增字段：

- `feed_title`：RSS/Atom 源站返回的原始标题。
- `custom_title`：用户自定义显示名称。

显示名称优先级：

```text
custom_title -> feed_title -> title
```

这样刷新订阅源时可以更新源站标题，同时不覆盖用户自定义名称。

### 3.3 刷新频率持久化

`feeds` 表新增字段：

- `refresh_interval_minutes`：自动刷新频率，单位分钟，`0` 表示手动刷新。
- `last_refreshed_at`：最近一次刷新时间。

启动时会自动迁移旧数据库：

- `feed_title` 为空时用旧 `title` 初始化。
- `refresh_interval_minutes` 默认设为 `0`。
- `last_refreshed_at` 默认设为旧 `updated_at`。

## 4. Feed 与文章功能

### 4.1 添加订阅源

流程：

1. 用户输入 RSS/Atom URL。
2. `FeedService.addFeed()` 规范化 URL。
3. 使用 `rss-parser` 抓取并解析 Feed。
4. 写入 `feeds` 表。
5. 解析文章条目并写入 `entries` 表。
6. UI 重新加载订阅源和文章列表。

### 4.2 文章入库与去重

去重策略：

- 优先按文章 URL 查重。
- 如果存在 GUID，则按同一 Feed 下的 GUID 查重。

重复刷新同一订阅源时，不会重复插入已有文章。

### 4.3 文章状态

支持：

- 点击文章后标记为已读。
- 手动标记已读/未读。
- 查询全部、未读、已读文章。
- Feed 未读数量动态计算。

### 4.4 原始正文抓取

点击文章详情时：

1. 先查 `entry_contents` 是否已有 raw HTML。
2. 没有则根据文章 URL 发起 fetch。
3. 抓取成功后写入 `entry_contents.raw_html`。
4. 抓取失败时保留原文链接作为 fallback。

## 5. OPML 功能

### 5.1 OPML 导入

支持：

- 点击选择 `.opml` / `.xml` 文件。
- 拖拽 `.opml` / `.xml` 文件到导入区域。
- 预览 OPML 中的订阅源。
- 全选/单选订阅源。
- 导入选中的订阅源。
- 部分成功导入。
- 逐项导入进度。

逐项导入时，渲染进程会按订阅源循环调用：

```text
importOpmlFeeds([当前 Feed])
```

每个 Feed 会显示状态：

- 等待导入
- 导入中
- 已导入
- 导入失败

### 5.2 OPML 导出

支持通过原生保存对话框选择路径，并将当前订阅源导出为 OPML 文件。

导出字段包括：

- 标题
- RSS URL
- 站点 URL

## 6. 自动刷新

Electron 主进程启动后会开启一个每分钟执行一次的检查器：

1. 读取全部订阅源。
2. 跳过 `refresh_interval_minutes = 0` 的订阅源。
3. 判断当前时间距离 `last_refreshed_at` 是否达到刷新频率。
4. 到期后调用 `refreshFeed()`。

如果某个订阅源刷新失败，不会影响其他源。失败源会记录本次检查时间，避免失效源每分钟重复阻塞。

## 7. 前端 UI 实现

### 7.1 添加订阅对话框

新增文件：

- `src/renderer/components/AddSubscriptionDialog.vue`

能力：

- 输入订阅源 URL。
- 输入可选自定义名称。
- 添加过程中显示 loading。
- 添加失败时在对话框内展示错误。

### 7.2 编辑订阅对话框

新增文件：

- `src/renderer/components/EditSubscriptionDialog.vue`

能力：

- 展示不可编辑的订阅源 URL。
- 编辑自定义名称。
- 查看源站原始名称。
- 一键恢复源站原始名称。
- 设置刷新频率。
- 删除订阅源。
- 未保存修改时关闭前确认。

### 7.3 OPML 导入对话框

新增文件：

- `src/renderer/components/OpmlImportDialog.vue`

能力：

- 点击选择 OPML 文件。
- 拖拽上传 OPML 文件。
- 预览订阅源列表。
- 全选/单选。
- 显示逐项导入进度。
- 显示部分失败原因。

### 7.4 Feed Sidebar

修改文件：

- `src/renderer/components/FeedSidebar.vue`

能力：

- 添加订阅。
- 刷新当前订阅源。
- 导入 OPML。
- 导出 OPML。
- 展示 Feed 标题、URL、未读数。
- Feed hover 或选中时显示编辑按钮。
- 无订阅源时显示空状态。

### 7.5 Article List

修改文件：

- `src/renderer/components/ArticleList.vue`

能力：

- 全部 / 未读 / 已读筛选。
- 加载状态。
- 空状态。
- 未读视觉提示。

## 8. 已完成的 A 模块功能清单

- RSS/Atom Feed 解析。
- Feed 添加、编辑、删除。
- Feed 手动刷新。
- Feed 自动定时刷新。
- 刷新频率持久化。
- 用户自定义名称。
- 恢复源站原始名称。
- 文章入库与去重。
- Feed 未读数量计算。
- 文章全部/未读/已读筛选。
- 文章已读/未读状态管理。
- 文章 raw HTML 懒抓取和存储。
- OPML 点击选择导入。
- OPML 拖拽上传。
- OPML 预览、全选、单选。
- OPML 逐项导入进度。
- OPML 部分成功/失败汇总。
- OPML 导出。
- A 模块 IPC handlers 和 preload API。
- Electron 环境真实数据接入，浏览器环境保留 mock fallback。

## 9. 不属于 A 模块的功能

以下能力在文档中归属其他模块，A 模块只提供基础数据：

| 功能 | 归属 |
|---|---|
| cleaned HTML / cleaned Markdown | 模块 B |
| 阅读样式系统 | 模块 B |
| AI 摘要 | 模块 C |
| AI 翻译 | 模块 C |
| LLM 配置 | 模块 D |
| 标签 CRUD | 模块 D |
| 技术 / 产品 / 设计分类 | 模块 D |
| Markdown 导出文章 | 模块 D |
| 全文搜索 | 更偏模块 D 或后续 P1 可选 |

## 10. 验证方式

已执行：

```powershell
npm run build
```

结果：构建通过。

建议手动测试：

1. 添加 `https://www.ruanyifeng.com/blog/atom.xml`。
2. 刷新订阅源，确认文章不会重复插入。
3. 编辑订阅源名称，刷新后确认自定义名称不被覆盖。
4. 点击“恢复源站原始名称”。
5. 设置刷新频率，关闭后重新打开确认保存成功。
6. 导入 OPML，测试点击选择和拖拽上传。
7. 选择多个订阅源导入，观察逐项进度和失败提示。
8. 导出 OPML，确认文件可生成。
