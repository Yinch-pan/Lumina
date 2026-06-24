# ReaderView 阅读体验交互增强 — 设计方案

> 日期：2026-06-24
> 目标：借鉴其他组的 UI 交互细节，增强 Mercury 阅读区(ReaderView)的阅读体验。**主题架构保持现状不变**：三栏布局、CSS 变量体系、全局亮/暗主题都不动。改动集中在 `ReaderView.vue`，少量涉及 `App.vue`(导航、摘要流式订阅)与主进程(仅摘要流式事件通道)。

## 背景

经盘点，Mercury 前端"可用但原始"：核心功能完整(阅读/标签/高亮/翻译/收藏)，但阅读区交互细节欠缺。用户选定本次聚焦**阅读体验细节**，共 7 项(摘要流式、快速调节栏、代码块复制、图片灯箱、进度条、返回顶部、上下篇导航)。

参考来源：第 5 组(可调阅读器排版、正文宽度、localStorage 持久化)、翻译流式(已有先例，摘要对称实现)。

## 设计原则

1. 主题架构零改动：复用现有 `--reading-font-size` / `--reading-line-height` / `--card-bg` / `--text-color` / `--border-color` / `--hover-bg` 等变量与 `data-theme` 亮/暗机制。
2. 改动集中在 ReaderView.vue 内部；导航与摘要流式订阅在 App.vue；摘要流式事件通道在主进程。
3. 新交互不得干扰已有功能：划词高亮(mouseup)、滚动进度持久化(@scroll 防抖存 DB)、高亮重新着色(watch article + DOM 操作)。
4. 操作 `v-html` 渲染后 DOM 的功能(代码复制、图片灯箱、高亮着色)共用一个"渲染后处理"入口，避免重复遍历与执行顺序冲突。

---

## 功能 1：摘要流式输出

**现状**：后端 `SummaryAgent.summarizeStream`(基于 provider.streamChat)已存在，但 IPC `summarize-article` 走的是非流式 `SummaryService.summarize`，前端等整段返回。翻译已有逐段流式先例(`translate-progress` 事件 + `onTranslateProgress` preload + App 订阅)。

**方案**(对称翻译流式)：
- 主进程：新增 `SummaryService.summarizeStream(articleId, length, onChunk)` 或在现有 summarize 基础上加流式路径；IPC handler `summarize-article` 改为流式，通过 `mainWindow.webContents.send('summary-progress', { articleId, chunk, done })` 推送。最终完整摘要仍落库 agent_runs(与现有逻辑一致)。
- preload：新增 `onSummaryProgress(cb)`，注册 `ipcRenderer.on('summary-progress', listener)`，返回 unsubscribe 函数。env.d.ts 同步类型。
- ReaderView：摘要区(`<section v-if="article.summary">`)在流式期间随 chunk 累加显示，显示"生成中"态(光标/spinner)，`done` 后定型。
- App.vue：onMounted 订阅 `onSummaryProgress`，按 `articleId === selectedArticleId` 过滤，累加到 `selectedArticleContent.summary`；切换文章时清空流式态；onUnmounted 取消订阅。复用 Task 6(翻译流式)已建立的订阅/清理模式。

**注意**：摘要分档(short/medium/long)已存在，流式需保留 length 参数透传。

---

## 功能 2：阅读区快速调节栏

**现状**：字号/行高只能在设置页(SettingsView)改，通过 `applyReadingSettings()` 设 CSS 变量。正文 `.content-section` 宽度硬编码 `max-width: 820px`。

**方案**：阅读区 header 放一个"Aa"图标按钮，点击展开浮层(popover)，含三项(**不做独立阅读主题**，复用全局亮/暗)：
- **字号**：±按钮调 `--reading-font-size`(范围 12–24px)，即时生效。
- **行高**：±按钮调 `--reading-line-height`(范围 1.4–2.2)，即时生效。
- **正文宽度**：窄/中/宽三档(680 / 820 / 960px)，通过 `--reading-content-width` 新变量驱动 `.content-section` 的 max-width。
- 三项改动即时写 CSS 变量(`document.documentElement.style.setProperty`)并持久化到 settings(`reading.fontSize` / `reading.lineHeight` / `reading.contentWidth`)，与设置页共享同一份值(设置页读写同样的 key)。
- 浮层点击外部关闭(document click 监听，组件卸载时移除)。

**注意**：`.content-section` 当前 `max-width: 820px` 改为 `max-width: var(--reading-content-width, 820px)`；App.vue 的 `applyReadingSettings` 加载时也读 `reading.contentWidth`。

---

## 功能 3：代码块复制按钮

**现状**：正文是 `v-html` 渲染的 `renderedHtml`(含高亮 mark)，`<pre>` 是动态内容，无法在模板静态加按钮。

**方案**：
- 在"渲染后处理"入口(见设计原则 4：watch article + nextTick，与高亮着色同一时机)遍历 `.article-content pre`，给每个 `<pre>` 设 `position: relative` 并注入一个绝对定位右上角的"复制"按钮(若已注入则跳过，避免重复)。
- 点击 `navigator.clipboard.writeText(pre.textContent ?? '')`，按钮短暂变"已复制 ✓"(1.5s 后恢复)。
- 按钮配色用主题变量，暗色适配。
- 高亮重新着色操作的是整个 `renderedHtml` 字符串替换(在 computed 里)；代码复制按钮是渲染后注入 DOM，两者不冲突——但都依赖"article 变化后处理"时机，需在同一个 watch 回调内有序执行(先等 DOM 稳定，再注入按钮)。

---

## 功能 4：图片点击灯箱

**方案**：
- 事件委托：在 `.article-content` 容器上监听 click，判断 `event.target` 是否为 `IMG`，是则取 `src` 打开灯箱。避免给每张图单独绑监听。
- 灯箱：一个 `ref<string | null>` 控制开关，用 `<Teleport to="body">` 渲染全屏遮罩(黑底半透明) + 居中大图(`max-width: 90vw; max-height: 90vh`)。
- 关闭：点遮罩空白处、或按 Esc(灯箱打开时绑 keydown，关闭时移除)。
- 不干扰划词高亮：现有 mouseup 逻辑已判断 `sel.isCollapsed` 跳过空选区，点击图片不产生选区，无冲突(实现后需验证)。

---

## 功能 5：阅读进度条 + 返回顶部

**现状**：`onScroll` 已计算 `percent = scrollTop / max` 并经 500ms 防抖存 DB(`handleSaveScroll` → saveScrollPercent)。

**方案**：拆分 onScroll 为「即时 UI 更新」+「防抖存 DB」：
- onScroll 入口立即更新两个响应式态：`scrollProgress`(0–1，驱动进度条宽度) 和 `showBackTop`(scrollTop > 600px)。**即时，不防抖**。
- 现有的"存进度到 DB"逻辑保留在 500ms 防抖分支内，行为不变。
- **进度条**：`.reader-header` 底部一条 2px 细条，宽度 = `scrollProgress * 100%`，颜色用主题强调色。
- **返回顶部**：`showBackTop` 为真时右下角浮现圆形按钮，点击 `contentRef.scrollTo({ top: 0, behavior: 'smooth' })`。

**注意**：不能破坏现有 scroll 进度持久化(Task 8)与切文章时的滚动位置恢复(watch article.id)。

---

## 功能 6：上一篇 / 下一篇导航

**现状**：ReaderView 只接收单篇 `article`，不知道列表上下文；App.vue 持有 `articleList`(按显示顺序) 和 `selectedArticleId`。

**方案**：
- ReaderView：header 加"上一篇 / 下一篇"按钮，emit `navigate: ['prev' | 'next']`。接收 props `hasPrev` / `hasNext`(boolean)控制按钮禁用态。
- App.vue：处理 `navigate`，在 `articles`(当前显示的过滤后列表)中定位 `selectedArticleId` 索引，切到前/后一篇(复用 `handleSelectArticle`)。计算 `hasPrev`/`hasNext` 传给 ReaderView。
- 到首/末篇时对应按钮禁用。
- **只做按钮，不加键盘快捷键**(用户确认)。

**注意**：用 App.vue 里实际驱动 ArticleList 的那份顺序(注意 `articles` computed 可能因 filter/搜索而变)，导航应基于当前可见列表。

---

## 实施顺序与验证

ReaderView 是前端组件，本项目无 vue-tsc 类型检查(vite build 不校验 .vue 模板类型)，验证靠 `npm run build` 编译通过 + 手动验收。摘要流式涉及主进程，可加 `test/feature-summary-stream.cjs` 验证流式回调(参考 feature-translation.cjs)。

建议顺序：
1. 摘要流式(后端事件通道 + 前端订阅) — 有翻译流式先例
2. 快速调节栏(纯前端 + settings 持久化 + 正文宽度变量)
3. 进度条 + 返回顶部(拆 onScroll)
4. 上/下一篇导航(ReaderView emit + App 逻辑)
5. 代码块复制 + 图片灯箱(共用渲染后处理入口，与高亮协调)

每步 `npm run build` 验证编译；摘要流式跑后端测试；DOM 类(代码复制/灯箱/高亮)需手动验收互不干扰。

## 不做(YAGNI)

- 不引入独立"阅读主题"(sepia 等)，复用全局亮/暗。
- 不加键盘快捷键(j/k、空格翻页等)——本次范围是阅读区按钮交互。
- 不动三栏布局、不做面板折叠/拖拽、不做 Toast 系统、不做无限滚动(这些是"交互流畅度"方向，本次聚焦阅读体验)。
- 不引入新的 UI 组件库或图表库。

## 风险点

- **渲染后 DOM 处理的时机协调**：高亮着色(字符串替换，在 computed)、代码复制按钮注入、图片灯箱事件委托三者都在 article 渲染后生效。代码复制按钮注入需在 DOM 稳定后(nextTick)执行且幂等(防重复注入)。图片灯箱用事件委托(挂容器)天然规避重复绑定问题。
- **onScroll 拆分**：即时 UI 更新与防抖存 DB 必须都保留，不能因加进度条破坏 Task 8 的进度持久化。
- **摘要流式落库**：流式完成后仍需写 agent_runs，确保缓存/历史正确(与非流式行为一致)。
- **正文宽度变量**：`--reading-content-width` 是新变量，需在 :root 给默认值，避免设置未加载时正文塌缩。
