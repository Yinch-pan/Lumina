# 模块 B 验收清单

## 1. 自动化验收

在项目根目录运行：

```bash
npm run verify:module-b
```

预期结果：

```text
Module B cleaning verification passed
Module B article service verification passed
```

再运行完整构建：

```bash
npm run build
```

预期结果：

- renderer 构建通过。
- main TypeScript 构建通过。
- 无 TypeScript 类型错误。

## 2. CleaningService 验收项

| 编号 | 检查项 | 预期结果 |
|---|---|---|
| B-CLEAN-01 | 普通正文 | 保留标题、段落、列表 |
| B-CLEAN-02 | 噪声清理 | 移除导航、侧边栏、广告、评论、脚本 |
| B-CLEAN-03 | 图片 | 保留图片、alt、图注 |
| B-CLEAN-04 | 懒加载图片 | `data-src` 等属性可转换为 `src` |
| B-CLEAN-05 | srcset | 相对 `srcset` 可解析为绝对 URL |
| B-CLEAN-06 | 链接 | 相对链接可解析为绝对 URL |
| B-CLEAN-07 | 安全 | 移除 `javascript:` 等不安全链接 |
| B-CLEAN-08 | 代码块 | 保留 `pre/code` 并输出 Markdown fenced code |
| B-CLEAN-09 | 技术内联标记 | 保留 `kbd`、`var` 等技术文章常见标记 |
| B-CLEAN-10 | 图片安全 | 拒绝不安全的 SVG data image |
| B-CLEAN-11 | 表格 | 表格可横向滚动，不撑破页面 |
| B-CLEAN-12 | 失败兜底 | 空 HTML 或提取失败时返回可显示的兜底内容 |
| B-CLEAN-13 | xkcd 图片型页面 | 保留漫画图片，移除 `Comics I enjoy`、`Other things`、`Netscape Navigator` 等页脚噪声 |

## 3. ArticleService 验收项

| 编号 | 检查项 | 预期结果 |
|---|---|---|
| B-SVC-01 | 已有 `rawHtml`、无清洗结果 | 自动调用 CleaningService 并保存 |
| B-SVC-02 | 缺少 `rawHtml` | 先抓取源 URL，再清洗并保存 |
| B-SVC-03 | 已有完整清洗结果 | 不重复清洗 |
| B-SVC-04 | 文章不存在 | 抛出明确错误 |
| B-SVC-05 | 抓取失败 | ReaderView 展示加载失败状态 |

当前自动化已覆盖 B-SVC-01 到 B-SVC-05。

## 4. ReaderView 手动验收项

| 编号 | 操作 | 预期结果 |
|---|---|---|
| B-UI-01 | 打开应用，不选择文章 | 显示“选择一篇文章开始阅读” |
| B-UI-02 | 点击一篇文章 | 右侧显示加载状态，然后展示正文 |
| B-UI-03 | 正文为空 | 显示“正文暂时无法显示”和“查看原文”链接 |
| B-UI-04 | 加载失败 | 显示“正文加载失败”和错误信息 |
| B-UI-05 | 点击“查看原文” | 在浏览器打开原文 URL |
| B-UI-06 | 顶部按钮 | AI 摘要、AI 翻译、添加标签、标记未读、导出按钮都存在 |
| B-UI-07 | 文章有标签 | 标题元信息下方显示标签 |
| B-UI-08 | 长文章 | 右侧正文区域可滚动 |
| B-UI-09 | 长代码块或表格 | 只在正文内部横向滚动，不撑破整个页面 |
| B-UI-10 | 窄屏宽度 | 按钮换行，正文不横向溢出 |
| B-UI-11 | 深色主题 | 背景、正文、按钮、标签、代码块都切换到深色配色 |

## 5. 阅读设置验收项

| 编号 | 操作 | 预期结果 |
|---|---|---|
| B-SET-01 | 设置字体大小为 14/16/18/20 | ReaderView 正文字号变化 |
| B-SET-02 | 设置行距为 1.5/1.8/2.0 | ReaderView 正文行距变化 |
| B-SET-03 | 设置主题为深色 | ReaderView 使用深色主题 |
| B-SET-04 | 保存设置后关闭设置页 | 阅读区样式保持最新设置 |

## 6. 推荐真实订阅源

用于手动验收时，建议优先选择稳定、结构简单的订阅源：

| 订阅源 | URL | 用途 |
|---|---|---|
| xkcd | `https://xkcd.com/rss.xml` | 图片型文章、短正文 |
| 阮一峰的网络日志 | `http://www.ruanyifeng.com/blog/atom.xml` | 中文长文、段落和链接 |
| GitHub Blog | `https://github.blog/feed/` | 英文技术文章、图片和代码 |
| Hacker News | `https://news.ycombinator.com/rss` | 外链文章列表，适合测试原文跳转 |

不建议验收时优先使用需要登录、强反爬、图片防盗链严重的网站。

## 7. 当前验收记录

已完成：

- `npm run build` 通过。
- `npm run verify:module-b` 通过。
- 本地 Vite 页面检查 ReaderView 正常显示文章标题、元信息、5 个操作按钮和正文。
- 桌面宽度无横向溢出。
- 390px 窄屏宽度无横向溢出。
- 真实 xkcd 页面清洗证明已生成：保留漫画图片，移除页脚噪声。

环境说明：

- 系统 Node.js 20.10.0 低于 Vite 7 要求，建议升级到 Node.js 20.19+ 或 22.12+。
- 本次验证使用 Codex 自带 Node.js 24.14.0 完成。
- 由于本机缺少 Visual Studio C++ Build Tools，未在本机重新完整编译 `better-sqlite3` 原生依赖。
