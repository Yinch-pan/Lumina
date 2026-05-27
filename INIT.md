# Mercury Demo 骨架

这是 Mercury 项目的第一周交付成果：一个可运行的 Demo 骨架，包含完整的三栏布局和 Mock 数据交互。

## 已完成功能

### ✅ 项目初始化
- Electron + Vue3 + TypeScript 项目结构
- Vite 构建配置
- 依赖管理（better-sqlite3, rss-parser, 等）

### ✅ UI 骨架
- 顶部标题栏（含设置按钮）
- 左侧 Feed 侧边栏
  - 添加订阅按钮（占位）
  - 刷新按钮（占位）
  - 标签筛选
  - Feed 列表展示
- 中间文章列表
  - 文章列表展示
  - 已读/未读状态
  - 文章标签显示
- 右侧阅读区
  - 文章标题和元信息
  - AI 摘要区域（占位）
  - AI 翻译区域（占位）
  - 文章正文展示
  - 操作按钮（摘要、翻译、标签、导出）
- 设置页面（全屏覆盖）
  - LLM 配置（Base URL、API Key、Model）
  - 阅读设置（字体、行距、主题）
  - 应用信息

### ✅ Mock 数据
- 3 个 Mock Feed
- 3 篇 Mock 文章
- 4 个 Mock 标签
- 完整的文章内容示例

### ✅ 基础交互
- 点击 Feed 切换文章列表
- 点击文章查看详情
- 点击标签筛选（UI 交互）
- 点击操作按钮弹出提示

### ✅ 数据模型定义
- TypeScript 类型定义（Feed, Article, ArticleContent, Tag, LLMConfig）
- SQLite 表结构定义（feeds, entries, entry_contents, tags, entry_tags, agent_runs, llm_usage, settings）
- 数据库初始化脚本

### ✅ Service 层接口
- IFeedService
- IArticleService
- ICleaningService
- ISummaryService
- ITranslationService
- ITagService
- IExportService
- ISettingsService

## 项目结构

\`\`\`
Mercury/
├── src/
│   ├── main/       # Electron 主进程
│   │   ├── index.ts       # 主进程入口
│   │   ├── database/      # 数据库
│   │   │   └── init.ts    # 数据库初始化
│   │   ├── services/      # Service 层
│   │   │   └── interfaces.ts  # Service 接口定义
│   │   └── types/         # 类型定义
│   │       └── index.ts
│   ├── preload/        # Preload 脚本
│   │   └── index.ts
│   └── renderer/      # Vue3 渲染进程
│       ├── main.ts        # 渲染进程入口
│       ├── App.vue      # 主组件
│       ├── components/    # UI 组件
│       │   ├── TitleBar.vue
│       │   ├── FeedSidebar.vue
│       │   ├── ArticleList.vue
│       │   └── ReaderView.vue
│       └── styles/        # 样式
│           └── index.css
├── index.html        # HTML 入口
├── vite.config.ts         # Vite 配置
├── tsconfig.json          # TypeScript 配置
├── tsconfig.main.json   # 主进程 TS 配置
├── package.json
└── README.md
\`\`

## 如何运行

### 开发模式

1. 安装依赖：
\`\`\`bash
npm install
\`\`\`

2. 启动开发服务器：
\`\`\`bash
npm run dev
\`\`\`

3. 在另一个终端启动 Electron：
\`\`\`bash
npm run dev:electron
\`\`\`

或者使用快捷脚本：
\`\`\`bash
./dev.sh
\`\`\`

### 构建

\`\`\`bash
npm run build
\`\`\`

## 验收标准

✅ 启动 App
✅ 左侧显示 mock feed 列表
✅ 中间显示 mock article list
✅ 点击文章
✅ 右侧显示 mock reader content
✅ Summary / Translation / Tag / Export 按钮占位可见

## 下一步工作

第 2~4 周将由 4 个模块组并行开发：

- **模块 A**：订阅与数据系统（陆锦云、颜泽宇）
- **模块 B**：清洗与阅读系统（于海洋、刘昊阳）
- **模块 C**：AI 摘要与翻译系统（林宇轩、孙佳杰）
- **模块 D**：标签、导出与设置系统（潘飞扬、张震）

各模块将基于此骨架进行开发，实现真实功能。

## 技术栈

- **桌面框架**: Electron
- **前端框架**: Vue3 + TypeScript
- **构建工具**: Vite
- **本地数据库**: SQLite (better-sqlite3)
- **Feed 解析**: rss-parser
- **OPML 解析**: fast-xml-parser
- **内容清洗**: sanitize-html
- **Markdown 转换**: turndown
- **图标**: lucide-vue-next

## 注意事项

1. 当前所有功能都是 Mock 数据和占位实现
2. 数据库初始化代码已定义但未在主进程中调用
3. Service 接口已定义但未实现
4. IPC 通信接口已定义但未实现
5. 所有按钮点击都是 alert 提示

这些将在后续模块开发中逐步实现。
