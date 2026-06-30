# Lumina

> 跨平台、本地优先、AI 增强的 RSS 阅读器。

Lumina（项目代号 Mercury）是一款基于 Electron + Vue 3 + SQLite 的桌面 RSS 阅读器。订阅数据完全本地存储，可离线阅读；接入任意 OpenAI 兼容的大模型后，还能一键完成摘要、翻译、标签推荐。

## ✨ 功能特性

### 订阅与同步
- RSS 2.0 / Atom 1.0 / JSON Feed 解析
- 添加、编辑、删除订阅源
- OPML 导入与导出
- 手动 / 定时刷新，基于 URL、GUID 智能去重
- 已读 / 未读状态、未读计数

### 阅读体验
- 基于 Readability + sanitize-html 的正文清洗
- 清爽的 Reader View，自动渲染图片、代码块、表格
- 内嵌 Web 视图，可直接查看原文页面
- 文本高亮与笔记（多色标记 + 备注）
- 上一篇 / 下一篇快速切换，自动标记已读

### AI 增强
- 短 / 中 / 长三档 AI 摘要
- 中英互译（任意目标语言）
- 标签智能推荐
- 配置任意 OpenAI 兼容接口（OpenAI、Azure、本地模型、第三方网关）
- AI 结果流式输出，避免长文阻塞

### 组织与导出
- 自定义标签，按标签筛选文章
- 单篇 / 批量 Markdown 导出（含元信息、标签、正文）
- OPML 导出，迁移到其他阅读器
- 阅读偏好设置（字体、行距、主题）

### 数据
- 全部数据保存在本地 SQLite，离线可用
- API Key 通过 Electron safeStorage 加密落盘
- 数据目录跨平台一致，便于备份

## 🚀 快速开始

### 环境要求
- Node.js ≥ 18
- npm（或 pnpm / yarn）
- Windows 用户：建议安装 Visual Studio Build Tools（用于编译 `better-sqlite3` 原生模块）

### 安装

```bash
npm install
```

中国大陆用户若 Electron 下载缓慢，可在仓库根目录创建 `.npmrc`：

```
electron_mirror=https://npmmirror.com/mirrors/electron/
```

若安装后启动报 `MODULE_VERSION` 不匹配，重新编译原生模块：

```bash
npx @electron/rebuild -v 38.8.6 -m node_modules/better-sqlite3
```

### 开发

需要两个终端，先起 Vite，再起 Electron：

```bash
# 终端 1
npm run dev

# 终端 2
npm run dev:electron
```

Windows / WSL 也可直接运行项目自带脚本：

```bash
./dev.sh
```

### 验证

```bash
npm run build              # 编译主进程 + 渲染进程
npm run test:services      # 服务层回归测试
npm run verify:module-b    # 内容清洗验证
```

### 打包

```bash
npm run dist:win    # Windows: NSIS 安装包 + Portable
npm run dist:mac    # macOS: DMG + ZIP
npm run dist:linux  # Linux: AppImage + DEB
```

产物输出到 `release/`。

## 🛠️ 技术栈

| 类别 | 选型 |
|------|------|
| 桌面框架 | Electron 38 |
| 前端 | Vue 3.5 + TypeScript + Vite 7 |
| 数据库 | SQLite（better-sqlite3） |
| Feed 解析 | rss-parser、fast-xml-parser |
| 内容清洗 | @mozilla/readability + jsdom + sanitize-html |
| Markdown | turndown |
| AI 接入 | openai SDK（OpenAI 兼容协议） |
| 图标 | lucide-vue-next |
| 打包 | electron-builder |

## 📂 项目结构

```
Mercury/
├── src/
│   ├── main/                # Electron 主进程
│   │   ├── database/        # SQLite Schema + 仓储层
│   │   ├── services/        # Feed / Article / Cleaning /
│   │   │                    # Summary / Translation /
│   │   │                    # Tag / Highlight / Export / Settings
│   │   ├── cleaners/        # 内容清洗管线
│   │   ├── llm/             # Provider 抽象 + AI Agents
│   │   ├── security/        # safeStorage 加密
│   │   ├── types/           # 共享类型
│   │   └── index.ts         # 主进程入口
│   ├── preload/             # Context Bridge IPC API
│   └── renderer/            # Vue 前端
│       ├── components/      # FeedSidebar / ArticleList /
│       │                    # ReaderView / SettingsView / ...
│       ├── styles/
│       └── App.vue
├── docs/                    # 设计与交付文档
├── test/                    # 回归测试
├── design/                  # 原型与设计稿
└── package.json
```

## 📖 使用指南

### 添加订阅
1. 点击左侧栏 **+** 按钮
2. 输入 Feed URL
3. 自动抓取并入库

常用源示例：
- Hacker News — `https://news.ycombinator.com/rss`
- 阮一峰的网络日志 — `http://www.ruanyifeng.com/blog/atom.xml`
- GitHub Trending — `https://mshibanami.github.io/GitHubTrendingRSS/daily/all.xml`

### 配置 LLM
1. 顶部 **⚙️ 设置** → 大语言模型配置
2. 填入 Base URL、API Key、Model
3. 保存后即可在阅读页使用摘要、翻译、标签推荐

支持任何 OpenAI 兼容协议：OpenAI、Azure OpenAI、本地 Ollama / vLLM、第三方网关等。

### AI 摘要 / 翻译
在阅读页顶部工具栏点击 **短摘要 / 中摘要 / 长摘要**，或 **译为中文 / 译为英文**。结果会以流式方式渲染在正文上方。

### 高亮与笔记
在正文中选中文本，弹出工具条选择颜色或添加备注。所有高亮持久化到本地数据库，重新打开仍在。

### 导出
- 单篇导出：阅读页右上角 **📤 导出**
- 批量导出：列表多选后导出为 Markdown
- 订阅迁移：设置页导出 OPML

## 🗄️ 数据存储

数据库与配置位于系统标准用户数据目录：

| 平台 | 路径 |
|------|------|
| Windows | `%APPDATA%\mercury\` |
| macOS | `~/Library/Application Support/mercury/` |
| Linux | `~/.config/mercury/` |

备份只需复制该目录；API Key 已通过 OS 提供的 safeStorage 加密，跨机器迁移需重新输入。

## 👥 开发团队

| 模块 | 成员 | 职责 |
|------|------|------|
| A · 订阅与数据 | 陆锦云、颜泽宇 | Feed 解析、OPML、刷新同步、正文抓取 |
| B · 清洗与阅读 | 于海洋、刘昊阳 | HTML 清洗、Markdown 转换、Reader View |
| C · AI 摘要与翻译 | 林宇轩、孙佳杰 | LLM Provider、Summary / Translation Agent |
| D · 标签、导出、设置 | 潘飞扬、张震 | 标签、高亮、Markdown 导出、LLM 配置 |

### 协作节奏
项目按五周推进，每周由其中一组上台汇报当周进展、演示模块成果并接受其他组的反馈；最后一周由组长进行整体总结汇报，全员一同进入集成测试与 Bug 修复阶段，共同收尾交付。

## 🐛 已知问题

- 阅读偏好（字体大小、行距、主题）可保存但尚未完全应用到 Reader View
- 应用图标仍为 Electron 默认图标，自定义图标资源待补齐

## 📄 许可证

ISC License · Copyright © 2026 Lumina Team

## 🙏 致谢

感谢 Electron、Vue、Vite、TypeScript、better-sqlite3、rss-parser、@mozilla/readability、sanitize-html、turndown、openai-node 等开源项目。

---

**Happy reading.** 📚
