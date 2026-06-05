# 模块 B 交接说明：正文清洗与 ReaderView

更新时间：2026-06-05

面向对象：继续接手模块 B 的同事。

当前结论：PR #11 已合并，是模块 B 的基础交付；PR #12 是在 PR #11 之后继续完善清洗质量、阅读视图、测试和文档的当前跟进 PR。功能代码目前已经能完成“打开文章时自动清洗正文、保存 cleanedHtml / cleanedMarkdown、在 ReaderView 中稳定展示”的主流程。下一步要把它从“核心逻辑可用”推进到“真实订阅源大规模可用”，重点是跑真实订阅清洗矩阵，把失败样例沉淀成回归测试。

## 1. 当前 PR 状态

| 项目 | 状态 |
|---|---|
| 主仓库 | `Yinch-pan/Mercury` |
| 当前工作分支 | `fix/module-b-reader-cleaning` |
| PR #11 | 已合并，标题：`Fix module B cleaning and reader view` |
| PR #12 | 打开中，标题：`Polish Module B cleaning and reader handoff` |
| PR #12 目标 | 从 `Yinch-pan/Mercury:fix/module-b-reader-cleaning` 合并到 `Yinch-pan/Mercury:main` |
| 功能代码最新提交 | `109eab9 fix(module-b): remove xkcd footer noise from reader` |

注意：如果使用之前导出的本地 demo，例如 `D:\桌面\win-unpacked`，它大概率还是旧构建。PR #12 合并后需要重新 `npm run build` / `npm run pack` 或重新导出 Electron 包，demo 目录才会包含这些修复。

## 2. PR #11 初始版做了什么

PR #11 主要把模块 B 的基本框架跑通：

1. 新增 `CleaningService`，用 `@mozilla/readability` 和 `jsdom` 从 raw HTML 中提取正文。
2. 用 `sanitize-html` 生成可安全渲染的 `cleanedHtml`。
3. 用 `turndown` 生成供 AI 摘要、翻译、Markdown 导出使用的 `cleanedMarkdown`。
4. 新增 `CleanedContent` 类型。
5. 将 `ICleaningService` 接口统一为 `clean(rawHtml, url)`，让清洗逻辑可以根据原文 URL 解析相对链接。
6. 在 `ArticleService.getArticleContent()` 中接入清洗逻辑：文章内容读取时，如果 `cleanedHtml` 或 `cleanedMarkdown` 为空，会自动清洗并保存。
7. 对 ReaderView 做了基础阅读样式优化，覆盖标题、正文、图片、代码块、表格、长文章滚动、空正文兜底。
8. 补了模块 B 初始验证脚本，并更新 `package-lock.json` 以记录清洗相关依赖。

PR #11 的意义：模块 B 从“只有初步清洗实现”变成了“文章打开时可以自动清洗并进入 ReaderView 展示”的闭环。

## 3. PR #12 在 PR #11 后继续做了什么

### 3.1 清洗服务增强

涉及文件：

- `src/main/services/CleaningService.ts`
- `src/main/services/interfaces.ts`
- `src/main/types/index.ts`

继续增强点：

1. 增强懒加载图片处理，支持 `data-src`、`data-original`、`data-original-src`、`data-lazy-src`、`data-hi-res-src`、`data-actualsrc` 等常见属性。
2. 支持 `srcset` 和 `picture/source`，并把相对 URL 解析成绝对 URL。
3. 对 `href`、`src`、`srcset` 做协议白名单校验，移除 `javascript:` 等不安全链接。
4. 过滤 1x1 或 2x2 的 tracking pixel。
5. 禁止不安全的 SVG data image，只允许常见安全图片 MIME 类型。
6. 保留技术文章常用 inline 标签，例如 `kbd`、`samp`、`var`、`ins`、`del`。
7. 增加 xkcd 类图片型页面的兜底内容选择能力，避免 Readability 抽取不到足够文字时丢掉主图。
8. 增加 `#bottom` 等噪声选择器，解决 xkcd 页面底部 `Comics I enjoy`、`Other things`、`Netscape Navigator` 等页脚噪声进入正文的问题。

### 3.2 ArticleService 对接增强

涉及文件：

- `src/main/services/ArticleService.ts`

继续增强点：

1. 读取文章时，如果 `rawHtml` 缺失，会先根据文章 URL 抓取原文 HTML。
2. 如果 `cleanedHtml` 或 `cleanedMarkdown` 缺失，会自动调用 `CleaningService.clean(rawHtml, url)`。
3. 清洗结果会保存回内容仓储，避免每次重复清洗。
4. 覆盖了文章不存在、抓取失败、已有清洗结果不重复清洗等边界情况。

### 3.3 ReaderView 阅读体验增强

涉及文件：

- `src/renderer/components/ReaderView.vue`
- `src/renderer/App.vue`
- `src/renderer/components/SettingsView.vue`

继续增强点：

1. ReaderView 增加加载态、错误态、空正文兜底态、未选择文章空状态。
2. 接入阅读设置：字体大小、行距、浅色/深色主题。
3. 设置页保存阅读偏好后，ReaderView 能刷新使用最新设置。
4. 正文区域支持长文章滚动，不撑破页面。
5. 图片最大宽度限制为容器宽度，避免横向溢出。
6. 代码块和表格支持内部横向滚动，避免把整个页面撑宽。
7. 文章标签展示在标题元信息下方，方便和模块 D 的标签能力对接。
8. 保留顶部 5 个动作按钮：AI 摘要、AI 翻译、添加标签、标记未读、导出。

### 3.4 测试与文档补充

新增或完善：

- `test/module-b-cleaning-verification.cjs`
- `test/module-b-article-service-verification.cjs`
- `docs/module-b-implementation-summary.md`
- `docs/module-b-user-guide.md`
- `docs/module-b-test-checklist.md`

测试覆盖点：

1. 普通正文提取。
2. 图片、懒加载图片、`srcset`、相对 URL 解析。
3. 不安全链接清理。
4. 技术 inline 标签保留。
5. xkcd 类页面回归：保留漫画图片，移除底部页脚噪声。
6. ArticleService 自动清洗并保存。
7. `rawHtml` 缺失时先抓取再清洗。
8. 已有清洗结果时不重复清洗。
9. 文章不存在、抓取失败等错误路径。

## 4. 当前如何证明“已经修了”

已经完成的验证：

```bash
npm run build
npm run verify:module-b
```

2026-06-05 本地重新执行结果：

```text
Module B cleaning verification passed
Module B article service verification passed
```

其中 `npm run verify:module-b` 会执行：

1. `npm run build:main`
2. `node test/module-b-cleaning-verification.cjs`
3. `node test/module-b-article-service-verification.cjs`

可视化证明：

- 本机生成过 xkcd 清洗证明页面、截图和 JSON 检查结果。
- 证明点包括：漫画主图保留、页脚噪声移除、检查项全部 PASS。
- 本机路径：
  - `C:\Users\LEGION\Documents\Codex\2026-06-04\new-chat\outputs\module-b-xkcd-cleaning-proof.html`
  - `C:\Users\LEGION\Documents\Codex\2026-06-04\new-chat\outputs\module-b-xkcd-cleaning-proof.png`
  - `C:\Users\LEGION\Documents\Codex\2026-06-04\new-chat\outputs\module-b-xkcd-cleaning-proof.json`

如果要把证据发给其他人，建议把 PNG 和 HTML 一起发过去；如果只放进 PR，则建议后续新增一个自动生成 HTML report 的脚本，把真实订阅验收报告放到 `docs/` 或 `test/reports/`。

## 5. 当前模块 B 可用程度

已经比较稳的部分：

1. CleaningService 主流程可用：HTML 正文提取、安全清洗、Markdown 转换。
2. ArticleService 对接可用：打开文章时自动补清洗并保存。
3. ReaderView 可用：正文展示、图片、代码块、表格、长文章滚动、加载/错误/空状态。
4. 阅读设置可用：字体大小、行距、主题。
5. 标签展示可用：能显示模块 D 写入的标签。
6. 自动化测试可用：`npm run verify:module-b` 能覆盖模块 B 核心逻辑。

还不能直接宣称“完美”的部分：

1. 真实订阅源没有系统性跑完 8-12 个源、每个源 3 篇文章的验收矩阵。
2. 真实站点中仍可能有特殊 DOM、登录墙、反爬、图片防盗链、摘要型 RSS 等情况。
3. Electron 原生运行和重新打包需要单独验收，尤其是 `better-sqlite3` 原生依赖。
4. 模块 C 摘要/翻译还应明确优先消费 `cleanedMarkdown`，并补跨模块集成测试。

## 6. 下一步同事可以继续做什么

目标：把模块 B 从“核心功能可用”推进到“真实订阅场景稳定可用”。

### 第一步：合并 PR #12

先 review PR #12：

1. 看 `CleaningService.ts` 的清洗策略是否符合团队预期。
2. 看 `ReaderView.vue` 的阅读样式是否和整体 UI 风格一致。
3. 跑一次：

```bash
npm install
npm run build
npm run verify:module-b
```

通过后合并 PR #12。

### 第二步：重新构建可演示 demo

PR #12 合并后，重新构建 Electron demo：

```bash
npm run build
npm run pack
```

如果需要 Windows 安装包：

```bash
npm run dist:win
```

环境建议：

1. Node.js 使用 20.19+ 或 22.12+。
2. 如果 `better-sqlite3` 安装失败，Windows 需要装 Visual Studio C++ Build Tools。
3. 不要直接拿旧的 `D:\桌面\win-unpacked` 当最新效果，它需要重新打包后替换。

### 第三步：做真实订阅源清洗矩阵

建议先选结构稳定、知名、容易演示的源，不要一开始就用需要登录或强反爬的网站。

第一批推荐：

| 订阅源 | Feed URL | 测试目的 |
|---|---|---|
| xkcd | `https://xkcd.com/rss.xml` | 图片型短内容，验证主图保留、页脚噪声移除 |
| 阮一峰的网络日志 | `http://www.ruanyifeng.com/blog/atom.xml` | 中文长文，验证段落、链接、代码块 |
| GitHub Blog | `https://github.blog/feed/` | 英文技术文章，验证图片、代码、标题结构 |
| Hacker News | `https://news.ycombinator.com/rss` | 外链型 RSS，验证原文跳转和抓取失败兜底 |

第二批可以扩展到 8-12 个源。每个源抽 3 篇文章，至少覆盖：

1. 短文章。
2. 长文章。
3. 图片文章。
4. 技术文章。
5. 外链文章。
6. 可能只有摘要的 RSS。

建议记录表：

| 字段 | 说明 |
|---|---|
| feedName | 订阅源名称 |
| feedUrl | RSS/Atom 地址 |
| articleTitle | 文章标题 |
| articleUrl | 原文 URL |
| rawHtmlLength | 原始 HTML 长度 |
| cleanedHtmlLength | 清洗后 HTML 长度 |
| cleanedMarkdownLength | 清洗后 Markdown 长度 |
| hasMainImage | 是否保留主图 |
| hasCodeOrTable | 是否保留代码块或表格 |
| hasFooterNoise | 是否混入页脚、导航、评论、广告 |
| readerOverflow | ReaderView 是否横向溢出 |
| fallbackShown | 是否进入兜底状态 |
| result | PASS / FAIL |
| notes | 失败原因和截图路径 |

验收标准建议：

1. 第一批 4 个源、每个 3 篇文章，至少 10/12 PASS。
2. 扩展到 8-12 个源后，整体 PASS 率达到 90% 以上。
3. FAIL 的样例不能只口头记录，要保存原文 URL、截图、raw HTML 片段或 fixture。

### 第四步：把失败样例变成回归测试

真实订阅测试中如果发现失败，不建议立刻堆大量站点特例。推荐流程：

1. 先保存失败文章的最小 HTML fixture。
2. 在 `test/module-b-cleaning-verification.cjs` 增加一个明确的断言。
3. 只针对可泛化的问题改清洗规则，例如懒加载属性、噪声选择器、内容选择策略。
4. 重新跑：

```bash
npm run verify:module-b
```

可以后续新增目录：

```text
test/fixtures/module-b/
test/reports/module-b/
```

其中 fixtures 放最小 HTML 样例，reports 放真实订阅矩阵报告。

### 第五步：补模块 C / D 集成验证

模块 B 给其他模块的核心输出是 `cleanedMarkdown` 和 `cleanedHtml`。

模块 C 建议：

1. `SummaryService` 摘要和翻译优先使用 `ArticleContent.cleanedMarkdown`。
2. 如果 `cleanedMarkdown` 为空，再调用 `getArticleContent()` 触发清洗。
3. 补一个集成测试，确认传给 LLM 的不是 `rawHtml`。

模块 D 建议：

1. Markdown 导出优先使用 `cleanedMarkdown`。
2. 导出内容包含标题、作者、发布时间、原文 URL、标签。
3. 标签展示由 ReaderView 只读显示，标签新增/删除仍由模块 D 负责。

### 第六步：最终验收标准

模块 B 可以认为基本完结时，应满足：

1. `npm run build` 通过。
2. `npm run verify:module-b` 通过。
3. Electron demo 重新打包后能正常运行。
4. 真实订阅矩阵 8-12 个源、每个 3 篇文章，整体 PASS 率不低于 90%。
5. 至少覆盖 xkcd、中文长文、英文技术博客、外链型 RSS。
6. ReaderView 在桌面宽度和 390px 窄屏宽度无横向溢出。
7. 清洗失败时不崩溃，能展示“查看原文”兜底。
8. 发现过的真实失败样例已经进入 fixture 或测试报告。

## 7. 给同事的简短交接话术

可以直接发这段：

> 模块 B 的基础清洗和阅读视图已经从 PR #11 做到可运行闭环，PR #12 又继续补了图片懒加载、srcset、相对链接、安全链接、tracking pixel、技术标签保留、xkcd 页脚噪声、ReaderView 状态/阅读设置/标签展示、ArticleService 边界测试和文档。现在 `npm run build`、`npm run verify:module-b` 都能过。下一步不要再先大改架构，先合并 PR #12，然后用 xkcd、阮一峰、GitHub Blog、Hacker News 等真实订阅跑清洗矩阵，每个源抽 3 篇文章，记录 raw/cleaned 长度、图片保留、噪声、Markdown、ReaderView 溢出和截图。真实失败样例再沉淀为 fixture 和回归测试，这样模块 B 就能从“核心逻辑完成”推进到“真实可用”。

