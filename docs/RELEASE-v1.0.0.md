# Mercury v1.0.0 - 发布说明

## 📦 下载

### Windows

| 文件 | 大小 | 说明 | 推荐 |
|------|------|------|------|
| `Mercury-1.0.0-x64.exe` | ~200MB | NSIS 安装程序 | 推荐正式使用 |
| `Mercury-1.0.0-Portable.exe` | ~200MB | 便携版 | 推荐测试使用 |
| `win-unpacked/Mercury.exe` | ~200MB | 解压版 | 快速测试 |

**系统要求**: Windows 10/11 (64-bit)

### 安装方式

**方式 1: 安装版（推荐）**
1. 双击 `Mercury-1.0.0-x64.exe`
2. 选择安装目录（默认: `C:\Program Files\Mercury`）
3. 选择是否创建桌面快捷方式
4. 完成安装
5. 从开始菜单或桌面启动

**特点**:
- ✅ 系统集成（开始菜单、桌面快捷方式）
- ✅ 数据保存在用户目录
- ✅ 支持自动更新（未来版本）
- ✅ 规范的卸载方式

**方式 2: 便携版**
1. 双击 `Mercury-1.0.0-Portable.exe`
2. 直接运行，无需安装

**特点**:
- ✅ 无需安装
- ✅ 可放在 U 盘使用
- ✅ 双击即用
- ⚠️ 数据保存在同目录

**方式 3: 解压版（开发测试）**
1. 进入 `release/win-unpacked/` 目录
2. 双击 `Mercury.exe`

---

## ✨ 功能特性

### 核心功能

#### 📡 订阅管理（模块 A）
- ✅ 支持 RSS 2.0 和 Atom 1.0 格式
- ✅ OPML 导入/导出（批量订阅管理）
- ✅ 自动/手动刷新订阅
- ✅ 智能去重（基于 URL、GUID）
- ✅ 已读/未读状态管理
- ✅ 订阅源自定义名称

#### 📖 阅读体验（模块 B）
- ✅ HTML 内容清洗（sanitize-html）
- ✅ Markdown 转换（turndown）
- ✅ 清爽的 Reader View
- ✅ 自动抓取正文内容
- ✅ 图片懒加载
- ✅ 代码高亮显示

#### 🤖 AI 增强（模块 C）
- ⚠️ AI 文章摘要（需配置 LLM）
- ⚠️ AI 文章翻译（需配置 LLM）
- ✅ 支持 OpenAI-compatible API
- ✅ 可配置模型和参数

#### 🏷️ 标签与导出（模块 D）
- ✅ 文章标签管理
- ✅ 标签自动去重
- ✅ 按标签筛选文章
- ✅ Markdown 导出（含元信息、标签、摘要）
- ✅ LLM 配置管理
- ✅ 阅读偏好设置

### 数据管理
- ✅ 本地 SQLite 数据库
- ✅ 数据完全本地化
- ✅ 无需联网即可阅读
- ✅ 支持数据导出和备份

---

## 🎯 使用场景

1. **技术博客订阅**
   - Hacker News
   - GitHub Trending
   - 各大技术博客

2. **新闻资讯**
   - BBC News
   - 财经新闻
   - 科技媒体

3. **个人博客**
   - 独立博客
   - Medium
   - Dev.to

4. **知识管理**
   - 配合标签分类
   - 导出为 Markdown
   - 集成到笔记系统

---

## 📊 技术栈

### 前端
- **框架**: Vue 3.5.34
- **语言**: TypeScript 6.0.3
- **构建**: Vite 7.3.5
- **图标**: Lucide Vue Next

### 后端
- **运行时**: Electron 38.8.6 (Node.js)
- **数据库**: SQLite (better-sqlite3 12.10.0)
- **解析**: rss-parser 3.13.0
- **清洗**: sanitize-html 2.17.4
- **转换**: turndown 7.2.4
- **AI**: OpenAI SDK 4.0.0

### 打包
- **工具**: electron-builder 26.8.1
- **格式**: NSIS / Portable
- **大小**: ~200MB (包含完整 Chromium)

---

## 🔧 配置

### 数据存储位置

**Windows**:
```
%APPDATA%\mercury\
├── mercury.db          # SQLite 数据库
├── config.json         # 配置文件（如果有）
└── ...
```

**实际路径**: `C:\Users\你的用户名\AppData\Roaming\mercury\`

### LLM 配置（可选）

如需使用 AI 功能：

1. 打开设置（点击⚙️图标）
2. 在"大语言模型配置"填写：
   ```
   Base URL: https://api.openai.com/v1
   API Key: sk-xxxxx
   Model: gpt-4
   ```
3. 保存配置

**支持的 API**:
- OpenAI API
- Azure OpenAI
- 本地模型（兼容 OpenAI 格式）
- 其他第三方 API

---

## 🐛 已知问题

### 限制

1. **AI 功能需要配置**
   - 需要自己提供 LLM API Key
   - 未配置时 AI 按钮无效

2. **某些网站正文抓取失败**
   - 部分网站限制爬取
   - 可点击"查看原文"打开浏览器

3. **图标使用默认**
   - 当前使用 Electron 默认图标
   - 未来版本将添加自定义图标

4. **阅读设置未应用**
   - 设置可以保存
   - 但未实际应用到界面
   - 计划在未来版本实现

### Windows 特定问题

- **首次运行慢**: 初始化数据库需要几秒
- **杀毒软件误报**: 部分杀毒可能误报，请添加信任

---

## 📝 更新日志

### v1.0.0 (2026-06-03)

**新功能**:
- ✅ 完整的 RSS/Atom 订阅管理
- ✅ OPML 导入/导出
- ✅ HTML 内容清洗和 Markdown 转换
- ✅ 文章标签系统
- ✅ Markdown 导出功能
- ✅ LLM 配置管理
- ✅ 阅读设置

**模块**:
- ✅ 模块 A: 订阅与数据系统（陆锦云、颜泽宇）
- ✅ 模块 B: 清洗与阅读系统（于海洋、刘昊阳）
- ✅ 模块 C: AI 摘要与翻译（林宇轩、孙佳杰）
- ✅ 模块 D: 标签、导出与设置（潘飞扬、张震）

**技术债务**:
- ⚠️ 需要添加自定义图标
- ⚠️ 阅读设置需要实际应用
- ⚠️ 需要添加错误上报
- ⚠️ 需要添加自动更新

---

## 🚀 路线图

### v1.1.0（计划）
- [ ] 自定义应用图标
- [ ] 阅读设置实时应用
- [ ] 标签管理面板
- [ ] 按标签筛选（前端）
- [ ] 批量导出功能

### v1.2.0（计划）
- [ ] 自动更新功能
- [ ] 深色模式
- [ ] 快捷键自定义
- [ ] 搜索功能
- [ ] 文章收藏

### v2.0.0（远期）
- [ ] 插件系统
- [ ] 多账户支持
- [ ] 云同步
- [ ] 移动端适配

---

## 💡 反馈与贡献

### 报告问题

- **GitHub Issues**: https://github.com/Yinch-pan/Mercury/issues
- 提供详细的错误信息和复现步骤

### 功能建议

欢迎提交功能建议到 GitHub Issues

### 贡献代码

1. Fork 项目
2. 创建功能分支
3. 提交 Pull Request

---

## 📄 许可证

ISC License

Copyright (c) 2026 Mercury Team

---

## 👥 开发团队

- **陆锦云** - 模块 A
- **颜泽宇** - 模块 A
- **于海洋** - 模块 B
- **刘昊阳** - 模块 B
- **林宇轩** - 模块 C
- **孙佳杰** - 模块 C
- **潘飞扬** - 模块 D + 项目管理
- **张震** - 模块 D

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

**祝使用愉快！** 🎉📚✨

---

**下载链接**: 
- GitHub Releases: https://github.com/Yinch-pan/Mercury/releases/tag/v1.0.0
- 百度网盘: （待补充）
- 其他镜像: （待补充）
