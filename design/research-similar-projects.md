# Mercury 同类开源项目调研

> 调研日期：2026-05-20
> 目的：寻找可借鉴的跨平台 RSS 阅读器 + AI 功能开源项目

---

## 最值得关注的项目

### 1. [Folo (原 Follow)](https://github.com/RSSNext/folo) — 38.3k stars

- **技术栈**：TypeScript + Electron，全平台（Web/iOS/Android/桌面）
- **AI 功能**：翻译、摘要，功能最完整
- **许可证**：AGPL-3.0
- **状态**：非常活跃，6900 commits，244 releases，最新 release 2026.05
- **借鉴价值**：功能最全、最成熟，但 AGPL 协议意味着如果借用代码，项目也必须开源且 AGPL。体量大（全平台+社区功能），架构偏重

### 2. [Lettura](https://github.com/zhanglun/lettura) — 1.8k stars

- **技术栈**：**Tauri + TypeScript + Rust**，shadcn/ui + TailwindCSS
- **功能**：RSS 阅读、搜索、播客、键盘快捷键，**无 AI 功能**
- **许可证**：未明确标注
- **状态**：最近活跃度下降（最后 release 2024.12）
- **借鉴价值**：**技术栈最接近目标需求**——Tauri + Rust 后端 + TS 前端。可以参考其项目结构、Feed 解析、Tauri 集成方式。AI 部分需要自己加

### 3. [MrRSS](https://github.com/WCY-dt/MrRSS) — 2.3k stars

- **技术栈**：**Go + Vue3 + Wails v3**
- **AI 功能**：翻译、摘要、推荐，插件生态（Obsidian/Notion/FreshRSS）
- **许可证**：GPL-3.0
- **状态**：活跃，最新 release 2026.03
- **借鉴价值**：功能集和目标最对齐（AI 摘要/翻译 + 跨平台桌面），但技术栈不同（Go/Wails vs Rust/Tauri）。可以参考其 AI 集成设计和插件架构思路

### 4. [Fluent Reader](https://github.com/yang991178/fluent-reader) — 9.4k stars

- **技术栈**：Electron + React + Redux + Fluent UI
- **功能**：成熟的 RSS 阅读器，OPML、多服务同步、自动规则，**无 AI**
- **许可证**：BSD-3-Clause（宽松）
- **状态**：活跃，2026.04 有新 release
- **借鉴价值**：如果选 Electron 路线，这是最成熟的参考。BSD 协议友好。但无 AI，无 Tauri

---

## 其他相关项目

| 项目 | 技术栈 | 特点 |
|------|--------|------|
| [peterroe/Rss-Reader](https://github.com/peterroe/Rss-Reader) | Tauri + Vue3 | 轻量 Tauri RSS 阅读器，体量小 |
| [babarot/oksskolten](https://github.com/babarot/oksskolten) | Web (PWA) | AI 原生 RSS 阅读器，支持 Anthropic/Gemini/OpenAI，Meilisearch 全文搜索 |
| [trustin/rss-summarizer](https://github.com/trustin/rss-summarizer) | — | 不是阅读器，是 Feed 处理管道：AI 摘要 + 翻译，生成新 Feed |
| [FreshRSS](https://github.com/FreshRSS/FreshRSS) | PHP | 自托管 Web RSS 聚合器，9.4k stars，多用户，功能成熟 |
| [awesome-tauri](https://github.com/tauri-apps/awesome-tauri) | — | Tauri 应用/插件/资源索引 |
| [ALL-about-RSS](https://github.com/AboutRSS/ALL-about-RSS) | — | RSS 工具、服务、社区、教程综合索引 |

---

## 对比总结

| 维度 | 最佳参考 |
|------|---------|
| Tauri 项目结构 / Feed 解析 | **Lettura** |
| AI 功能集设计（摘要/翻译/标签） | **MrRSS** 或 **Folo** |
| Electron 路线的成熟实现 | **Fluent Reader** |
| 整体功能最完整 | **Folo**（但 AGPL 限制大） |

## 结论

没有一个项目能直接拿来用——要么缺 AI（Lettura、Fluent Reader），要么技术栈不匹配（MrRSS 用 Go/Wails），要么协议太严（Folo 的 AGPL）。但可以分层借鉴：**Lettura 的 Tauri 架构 + MrRSS 的 AI 集成思路**，是最接近目标的组合。
