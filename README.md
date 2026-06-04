# Mercury RSS 阅读器

Mercury 是一个跨平台、本地优先的 RSS 阅读器，基于 Electron + Vue 3 + TypeScript + SQLite 构建。

## ✨ 功能特性

### ✅ 已实现功能

#### 📡 订阅管理（模块 A）
- ✅ RSS 2.0 和 Atom 1.0 格式订阅源支持
- ✅ 添加/删除/编辑订阅源
- ✅ OPML 导入/导出（批量订阅管理）
- ✅ 手动/自动刷新订阅
- ✅ 智能去重（基于 URL、GUID）
- ✅ 已读/未读状态管理
- ✅ 订阅源自定义名称和刷新间隔

#### 📖 内容清洗与阅读（模块 B）
- ✅ HTML 内容清洗（sanitize-html）
- ✅ Markdown 转换（turndown）
- ✅ 清爽的 Reader View 阅读界面
- ✅ 自动抓取正文内容
- ✅ 文章元信息展示（标题、作者、发布时间、来源）

#### 🏷️ 标签、导出与设置（模块 D）
- ✅ 文章标签管理
- ✅ 标签自动去重
- ✅ 按标签筛选文章
- ✅ Markdown 导出（含元信息、标签）
- ✅ LLM 配置管理（Base URL、API Key、Model）
- ✅ 阅读偏好设置（字体大小、行距、主题）

#### 🗄️ 数据管理
- ✅ 本地 SQLite 数据库
- ✅ 数据完全本地化，无需联网即可阅读
- ✅ 支持数据导出和备份

### ⚠️ 部分实现功能

#### 🤖 AI 功能（模块 C）
- ⚠️ AI 文章摘要（需配置 LLM，功能未完全集成）
- ⚠️ AI 文章翻译（需配置 LLM，功能未完全集成）
- ✅ 支持 OpenAI-compatible API
- ✅ LLM 配置持久化

> **注意**：AI 功能的后端服务已实现（SummaryService），但前端集成尚未完成。当前版本配置 LLM 后，摘要和翻译按钮为占位符。

---

## 🚀 快速开始

### 安装依赖

```bash
npm install
```
### 开发模式

推荐使用两个终端分别启动：

```bash
# 终端 1: 启动 Vite 开发服务器
npm run dev

# 终端 2: 等待 Vite 启动后，启动 Electron
npm run dev:electron
```

### 构建打包

```bash
# 编译代码
npm run build

# 打包 Windows 版本
npm run dist:win

# 打包 macOS 版本
npm run dist:mac

# 打包 Linux 版本
npm run dist:linux
```

打包后的文件在 `release/` 目录：
- Windows: `Mercury-1.0.0-x64.exe` (安装版) 和 `Mercury-1.0.0-Portable.exe` (便携版)
- macOS: `Mercury-1.0.0-x64.dmg` 和 `Mercury-1.0.0-x64-mac.zip`
- Linux: `Mercury-1.0.0-x86_64.AppImage` 和 `Mercury-1.0.0-amd64.deb`

---

## 📖 使用指南

### 1. 添加订阅源

1. 点击左侧边栏的 **"+"** 按钮
2. 输入 RSS Feed URL
3. 点击"添加"
4. 自动刷新获取文章

**示例 RSS 源：**
- Hacker News: `https://news.ycombinator.com/rss`
- 阮一峰的网络日志: `http://www.ruanyifeng.com/blog/atom.xml`
- GitHub Trending: `https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml`

### 2. 导入 OPML

如果你有其他 RSS 阅读器的订阅列表：

1. 点击左侧边栏的 **"导入"** 按钮
2. 选择 `.opml` 文件
3. 选择要导入的订阅源
4. 点击"导入选中的订阅"

### 3. 阅读文章

1. 在左侧选择订阅源
2. 在中间选择文章
3. 右侧显示清洗后的文章正文
4. 自动标记为已读

### 4. 添加标签

1. 打开一篇文章
2. 点击右侧的 **"🏷️ 添加标签"** 按钮
3. 在弹出对话框中输入标签名称
4. 标签会显示在文章详情中

### 5. 导出 Markdown

1. 打开要导出的文章
2. 点击右侧的 **"📤 导出"** 按钮
3. 选择保存位置
4. 文件包含：标题、元信息、标签、正文

### 6. 配置 LLM（可选）

1. 点击顶部的 **"⚙️"** 设置按钮
2. 在"大语言模型配置"区域填写：
   - **Base URL**: 你的 AI API 地址（例如 `https://api.openai.com/v1`）
   - **API Key**: 你的 API 密钥
   - **Model**: 模型名称（例如 `gpt-4`）
3. 点击"保存 LLM 配置"

**支持的 API：**
- OpenAI API
- Azure OpenAI
- OpenAI 兼容接口（本地模型、其他云服务）

---

## 🛠️ 技术栈

### 前端
- **框架**: Vue 3.5.34
- **语言**: TypeScript 6.0.3
- **构建**: Vite 7.3.5
- **图标**: Lucide Vue Next

### 后端
- **运行时**: Electron 38.8.6 (Node.js)
- **数据库**: SQLite (better-sqlite3 12.10.0)
- **Feed 解析**: rss-parser 3.13.0
- **内容清洗**: sanitize-html 2.17.4
- **Markdown 转换**: turndown 7.2.4
- **AI 接入**: OpenAI SDK 4.0.0

### 打包
- **工具**: electron-builder 26.8.1
- **格式**: NSIS / Portable / DMG / AppImage / DEB

---

## 📊 项目结构

```
Mercury/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── database/      # SQLite 数据库层
│   │   ├── services/      # 业务逻辑层
│   │   ├── llm/          # LLM 相关（SummaryAgent 等）
│   │   └── index.ts       # 主进程入口
│   ├── preload/      # Preload 脚本（Context Bridge）
│   └── renderer/         # Vue 前端
│       ├── components/   # UI 组件
│       └── App.vue       # 主应用
├── docs/               # 项目文档
├── release/              # 打包输出目录
└── package.json
```

---

## 👥 开发团队

| 模块 | 成员 | 职责 |
|------|------|------|
| 模块 A：订阅与数据 | 陆锦云、颜泽宇 | Feed 解析、OPML 导入、刷新同步、正文抓取 |
| 模块 B：清洗与阅读 | 于海洋、刘昊阳 | 内容清洗、Markdown 转换、Reader View |
| 模块 C：AI 摘要与翻译 | 林宇轩、孙佳杰 | LLM Provider、Summary Agent、Translation Agent |
| 模块 D：标签、导出与设置 | 潘飞扬、张震 | 标签管理、Markdown 导出、LLM 配置、应用设置 |

---

## 📅 开发时间线

| 阶段 | 周次 | 日期 | 内容 |
|------|------|------|------|
| Demo 骨架 | 第 1 周 | 05/18 ~ 05/24 | 项目初始化 + 基础骨架 |
| 模块并行开发 | 第 2 周 | 05/25 ~ 05/31 | 4 组并行开发各自模块 |
| 模块并行开发 | 第 3 周 | 06/01 ~ 06/07 | 继续开发 + 模块间初步对接 |
| 模块并行开发 | 第 4 周 | 06/08 ~ 06/14 | 功能收尾 + 跨模块联调 |
| 集成交付 | 第 5 周 | 06/15 ~ 06/21 | 集成测试 + Bug 修复 + 文档 + 演示准备 |

---

## 🐛 已知问题

1. **AI 功能未完全集成**
   - SummaryService 和 TranslationService 后端已实现
   - 前端尚未完成 IPC 调用集成
   - 当前版本点击"摘要"或"翻译"按钮仅显示占位提示

2. **阅读设置未应用**
   - 字体大小、行距、主题等设置可以保存
   - 但尚未应用到 Reader View 界面

3. **应用图标使用默认**
   - 当前使用 Electron 默认图标
   - 待添加自定义图标（build/icon.ico）

---

## 📄 许可证

ISC License

Copyright (c) 2026 Mercury Team

---

## 🙏 致谢

感谢以下开源项目：

- Electron
- Vue.js
- TypeScript
- Vite
- better-sqlite3
- rss-parser
- sanitize-html
- turndown
- 以及所有其他依赖

---

**祝阅读愉快！** 📚✨
