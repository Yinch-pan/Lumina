# Mercury 跨平台 MVP：产品边界与架构说明

## 1. 项目定位

Mercury 是一个 **跨平台的、本地优先、AI 增强型 RSS 阅读器**。

它支持用户完成从 **订阅源导入、文章获取、内容清洗、阅读展示，到 AI 总结、AI 翻译、标签管理和 Markdown 导出** 的完整流程。

本项目参考 `neolee/mercury` 的产品设计与架构思想，但不直接迁移其 macOS / SwiftUI 代码，而是重新实现一个面向 **Windows、macOS、Linux** 的跨平台 MVP。

---

## 2. 核心产品流程

Mercury 的主链路如下：

```text
订阅源导入
  → Feed 刷新
  → 文章入库
  → 正文抓取
  → 内容清洗
  → 阅读展示
  → AI 总结 / AI 翻译
  → 标签管理
  → Markdown 导出
```

最终 Demo 必须围绕这条主链路展开。

---

## 3. 产品原则

### 3.1 本地优先

Mercury 默认将用户数据保存在本机，包括：

- Feed 订阅列表；
- 文章元数据；
- 原始 HTML；
- cleaned HTML；
- cleaned Markdown；
- AI 总结结果；
- AI 翻译结果；
- 标签；
- 本地配置；
- 导出记录。

Mercury 不要求用户注册账号，不主动采集用户数据。只有当用户主动触发 AI 总结或 AI 翻译时，系统才会将必要文本发送给用户配置的大模型服务。

### 3.2 跨平台

Mercury 目标支持：

- Windows；
- macOS；
- Linux。

项目必须避免将业务逻辑绑定到某一个操作系统。平台差异集中在路径管理、配置管理、密钥存储和打包方式中处理。

### 3.3 大模型中立

Mercury 不绑定某一家大模型服务。

AI 功能统一通过 `LLMProvider` 接口调用，优先支持 OpenAI-compatible API。用户可以自行配置：

- Base URL；
- API Key；
- Model。

### 3.4 小步实现

本项目第一阶段只做 MVP，不追求一次性复刻完整产品。所有开发围绕主链路推进，优先保证可运行、可演示、可验收。

---

## 4. 功能边界

## 4.1 P0：MVP 必做功能

P0 功能是五周内必须完成、最终 Demo 必须展示的功能。

| 模块 | 功能 | 说明 |
|---|---|---|
| 订阅源管理 | OPML 导入 | 支持用户从其他 RSS 阅读器迁移订阅源 |
| Feed 刷新 | RSS / Atom 解析与刷新 | 获取订阅源中的文章列表 |
| 本地文章库 | 保存 Feed、文章元数据、已读状态 | 使用 SQLite 本地存储 |
| 正文抓取 | 根据文章 URL 获取网页 HTML | 抓取失败时提供原文链接 fallback |
| 内容清洗 | cleaned HTML / cleaned Markdown | 将网页正文转换为适合阅读和 AI 处理的格式 |
| 阅读展示 | 三栏界面与 Reader View | 左侧订阅源，中间文章列表，右侧阅读区 |
| AI 总结 | 单篇文章 Summary Agent | 基于 cleaned Markdown 生成文章总结 |
| AI 翻译 | 单篇文章 Translation Agent | 对单篇文章生成翻译 |
| 标签系统 | 手动标签、按标签筛选 | 支持基础内容整理 |
| Markdown 导出 | 单篇文章导出 | 包含标题、链接、正文、总结、翻译、标签等 |
| LLM 配置 | Base URL / API Key / Model | 支持 OpenAI-compatible API |
| 本地优先 | 数据默认保存在本机 | 不要求账号，不主动采集用户数据 |
| 跨平台基础 | Windows / macOS / Linux 友好 | 代码结构不绑定单一平台 |

---

## 4.2 P1：可选增强功能

P1 功能有价值，但必须在 P0 主链路稳定后再考虑。

| 功能 | 说明 |
|---|---|
| AI 推荐标签 | 基于文章内容自动推荐标签 |
| OPML 导出 | 支持导出订阅源 |
| 简单文章笔记 | 支持给文章添加 Markdown 笔记 |
| 深色模式 | 提升阅读体验 |
| 中英文界面切换 | 支持多语言界面 |
| LLM 用量统计面板 | 展示 token 或请求用量 |
| 多篇文章合并导出 | 按标签或时间批量导出文章 |
| 简单全文搜索 | 搜索标题、正文或标签 |

---

## 4.3 P2：五周内暂不做

以下功能五周内暂不做，避免项目范围失控。

1. 云同步；
2. 账号系统；
3. 移动端 App；
4. 浏览器插件；
5. 批量 AI 总结；
6. 批量 AI 打标签；
7. 复杂 Prompt 模板管理；
8. PDF 导出；
9. 社交分享；
10. 插件生态；
11. 自动更新系统；
12. 多设备同步。

---

## 5. 系统架构

Mercury 采用分层架构，目标是让 UI、业务逻辑、数据存储、AI 调用和平台差异相互解耦。

```text
UI 层
  主窗口 / Feed Sidebar / Article List / Reader View / Settings

        ↓

Service 层
  FeedService / ArticleService / CleaningService
  SummaryService / TranslationService / TagService / ExportService

        ↓

协议与接口层
  Repository / ContentCleaner / LLMProvider / AgentTask / Exporter

        ↓

基础设施层
  SQLite / Feed Parser / OPML Parser / HTML Fetcher
  Cleaner / Markdown Converter / LLM API / Local Cache / Logger

        ↓

Platform Adapter 层
  路径管理 / 配置管理 / 密钥存储 / 打包适配 / 系统差异处理
```

---

## 6. 架构约束

项目开发必须遵守以下约束：

1. UI 不直接访问数据库；
2. UI 不直接调用 LLM API；
3. UI 不直接处理平台路径；
4. 业务逻辑不写死 Windows / macOS / Linux 路径；
5. Feed、Article、Cleaning、AI、Export 都通过 Service 层协调；
6. AI 请求必须通过 `LLMProvider`；
7. Summary、Translation、Tagging 必须通过 `AgentTask`；
8. 内容清洗必须通过 `ContentCleaner`；
9. 导出必须通过 `Exporter`；
10. 所有耗时任务不能阻塞 UI；
11. API Key、token、个人配置不得提交到 GitHub；
12. 平台差异必须集中在 Platform Adapter 层处理。

---

## 7. 关键模块说明

## 7.1 UI 层

UI 层负责用户交互和结果展示，不负责复杂业务逻辑。

主要组成：

- 主窗口；
- Feed Sidebar；
- Article List；
- Reader View；
- Settings 页面；
- Summary 展示区域；
- Translation 展示区域；
- Tag 展示与筛选区域；
- Markdown Export 操作入口。

UI 层只调用 Service 层，不直接操作数据库、LLM API 或本地路径。

---

## 7.2 Service 层

Service 层负责协调业务流程。

| Service | 职责 |
|---|---|
| FeedService | OPML 导入、Feed 刷新 |
| ArticleService | 文章入库、文章状态管理 |
| CleaningService | 正文抓取与内容清洗 |
| SummaryService | 调用 Summary Agent |
| TranslationService | 调用 Translation Agent |
| TagService | 标签创建、绑定、筛选 |
| ExportService | Markdown 导出 |

---

## 7.3 协议与接口层

协议层用于稳定模块边界，避免各模块互相耦合。

### LLMProvider

负责统一大模型调用。

输入：

- Base URL；
- API Key；
- Model；
- Messages；
- Temperature。

输出：

- 文本结果；
- 模型信息；
- 用量信息；
- 错误信息。

---

### ContentCleaner

负责将网页内容转为可阅读、可分析的格式。

输入：

- article_url；
- raw_html。

输出：

- cleaned_html；
- cleaned_markdown；
- title；
- author；
- error。

---

### AgentTask

负责统一 AI 任务。

任务类型包括：

- summary；
- translation；
- tagging。

MVP 阶段只实现：

- SummaryAgent；
- TranslationAgent。

---

### Exporter

负责统一导出能力。

MVP 阶段只实现：

- MarkdownExporter。

---

## 8. 本地数据设计

Mercury 使用 SQLite 作为本地数据库。

建议核心表包括：

| 表名 | 说明 |
|---|---|
| feeds | 订阅源信息 |
| entries | 文章元数据 |
| entry_contents | 文章正文、cleaned HTML、cleaned Markdown |
| tags | 标签 |
| entry_tags | 文章与标签关系 |
| agent_runs | AI 任务运行记录 |
| llm_usage | LLM 用量记录 |
| settings | 本地配置 |

本地目录结构建议如下：

```text
Mercury/
├─ mercury.db
├─ cache/
│  ├─ raw_html/
│  ├─ cleaned_html/
│  └─ images/
├─ exports/
├─ logs/
└─ config.json
```

不同平台使用不同根目录，但内部结构保持一致。

| 平台 | 本地数据目录 |
|---|---|
| Windows | `%APPDATA%/Mercury/` |
| macOS | `~/Library/Application Support/Mercury/` |
| Linux | `~/.local/share/mercury/` 或 `$XDG_DATA_HOME/mercury/` |

所有路径必须通过统一路径模块获取，例如：

- `get_app_data_dir()`；
- `get_database_path()`；
- `get_cache_dir()`；
- `get_log_dir()`；
- `get_export_dir()`；
- `get_config_path()`。

---

## 9. 技术路线

本项目采用跨平台友好的技术路线。

| 层级 | 技术选择 |
|---|---|
| 编程语言 | Python |
| 桌面 UI | PySide6 |
| 本地数据库 | SQLite |
| 平台路径 | platformdirs + pathlib |
| Feed 解析 | feedparser |
| OPML 解析 | listparser 或轻量自写 |
| 网页抓取 | httpx / requests |
| HTML 解析 | BeautifulSoup |
| 内容清洗 | trafilatura / readability-lxml |
| Markdown 转换 | markdownify |
| AI 接入 | OpenAI-compatible API |
| 密钥存储 | keyring；MVP 可先用本地配置，但必须禁止提交 |
| 测试 | pytest |
| 打包 | PyInstaller |
| 协作 | GitHub Issues + PR + Milestones |

---

## 10. 跨平台实现要求

为了保证项目不是单平台实现，开发中必须遵守：

1. 禁止写死 `C:\` 路径；
2. 禁止写死 `~/Library` 路径；
3. 禁止使用字符串手动拼接路径；
4. 所有路径使用 `pathlib.Path`；
5. 所有平台路径通过 `platformdirs` 或统一路径模块获取；
6. 平台相关逻辑不得散落在业务代码中；
7. 打包方式可以按平台分别处理，但业务逻辑必须共用。

MVP 最低跨平台验收标准：

1. 至少一个平台完整跑通主链路；
2. 至少第二个平台可以启动 App 并初始化数据库；
3. 代码中没有写死某一平台路径；
4. 核心业务逻辑不依赖某一个操作系统。

理想验收标准：

1. Windows、macOS、Linux 均可启动；
2. 至少两个平台可以完成主要流程；
3. 第三个平台有明确兼容性说明和待测清单。

---

## 11. 最终 Demo 主线

最终展示时，Mercury 必须能够演示以下流程：

```text
打开 Mercury
  → 导入 OPML
  → 刷新 Feed
  → 查看文章列表
  → 打开文章
  → 显示 cleaned Reader View
  → 生成 AI Summary
  → 生成 AI Translation
  → 添加标签
  → 导出 Markdown
```

这个主线是判断 MVP 是否完成的核心标准。

---

## 12. 项目成功标准

本项目是否成功，不以功能数量多少为标准，而以以下指标为标准：

1. 主链路是否跑通；
2. 产品边界是否清晰；
3. 架构是否解耦；
4. 本地优先原则是否落实；
5. 跨平台实现是否具备基础；
6. AI 功能是否通过统一接口调用；
7. Markdown 导出是否完成闭环；
8. GitHub 是否有清晰的 Issue、PR 和文档记录；
9. 最终 Demo 是否稳定；
10. 项目成员能否清楚解释功能取舍、架构设计和实现路线。

---

## 13. 第一阶段交付目标

第一周不以完整功能为目标，而以产品启动和架构定型为目标。

第一阶段应完成：

1. 项目定位；
2. 功能边界；
3. 技术路线；
4. 系统架构；
5. 本地优先设计；
6. 跨平台设计；
7. 核心协议设计；
8. GitHub 仓库结构；
9. Issue / PR 模板；
10. 最小 App 骨架。

第一周最小可演示内容：

```text
启动 App
  → 左侧显示 mock feed
  → 中间显示 mock article list
  → 点击文章
  → 右侧显示 mock reader content
  → 显示 Summary / Translation / Tag / Export 按钮占位
```

---

## 14. 简要结论

Mercury 跨平台 MVP 的核心不是堆功能，而是完成一条稳定的信息处理链路：

```text
订阅 → 获取 → 清洗 → 阅读 → 总结 → 翻译 → 标签 → 导出
```

项目第一阶段应重点完成产品边界、架构边界和技术路线确认。后续开发必须围绕这条主链路推进，并通过本地 SQLite 存储、平台路径抽象、PySide6 跨平台 UI、`LLMProvider` 统一接口和 Service 层解耦，保证 Mercury 具备本地优先、跨平台和 AI 增强三项核心能力。
