# 内嵌原文视图（迷你浏览器）设计

日期：2026-06-24

## 背景与目标

当前阅读视图中的「查看原文」是一个 `<a target="_blank">` 链接，点击后由系统默认浏览器打开原网页，用户离开了 Mercury。

目标：点击「查看原文」后，不再弹系统浏览器，而是在 Mercury 阅读区内就地加载原网页。整个阅读区切换为原网页（清洗正文隐藏），顶部提供「返回阅读视图」。内嵌视图为迷你浏览器：可在其中继续点击链接导航，带后退/前进/刷新，并保留「在系统浏览器打开」作为退路。

## 技术选型

使用 Electron 的 `<webview>` 标签（环境 Electron 38）。它是渲染层 DOM 元素，可直接放入 ReaderView 的 flex 布局，定位随容器，集成成本最低，符合「就地切换」诉求。

对比未采用：
- `WebContentsView`：操作系统级覆盖层，需主进程绝对坐标定位，与 Vue 布局对接繁琐。
- `BrowserView`：已废弃。

## 改动点

### 1. 主进程 `src/main/index.ts`
- `createWindow()` 的 `webPreferences` 增加 `webviewTag: true`。
- 新增 IPC `open-external-url`：校验 URL 协议为 `http`/`https`，再调用 `shell.openExternal(url)`，拒绝其他协议（如 `file://`）。用于「在系统浏览器打开」按钮及 webview 弹窗的兜底。
- 顶部 import 增加 `shell`。

### 2. preload `src/preload/index.ts`
- 在 `electronAPI` 上暴露 `openExternal(url: string)` → `ipcRenderer.invoke('open-external-url', url)`。
- （沿用现有暴露名 `electronAPI`，而非 `window.api`。）

### 3. 渲染层 `src/renderer/components/ReaderView.vue`（主要改动）
- 局部状态 `readerMode: ref<'clean' | 'web'>('clean')`，默认 `'clean'`。
- 局部状态 `webUrl`、`currentUrl`、`canGoBack`、`canGoForward`。
- 「查看原文」由 `<a>` 改为按钮，点击设 `webUrl = article.sourceUrl`、`readerMode = 'web'`。header 元信息区与 fallback 区两处都改为触发内嵌。
- `readerMode === 'web'` 时渲染内嵌浏览器层（覆盖 reader-content 区域）：
  - 顶部工具条：后退、前进、刷新、当前 URL（只读显示）、「在系统浏览器打开」、「返回阅读视图」。
  - `<webview :src="webUrl">` 占满剩余空间。
- webview 事件接线：
  - `did-navigate` / `did-navigate-in-page` → 更新 `currentUrl`，并刷新 `canGoBack()/canGoForward()`。
  - 后退/前进/刷新按钮调用 webview 的 `goBack()/goForward()/reload()`。
- webview 内的弹窗 / `target=_blank` 拦截放在主进程：Electron 38 已移除 webview 的 `new-window` DOM 事件，改用主进程 `web-contents-created` + `setWindowOpenHandler`，对 `getType() === 'webview'` 的 webContents 一律 `deny`，并把 http/https 链接交给 `shell.openExternal`。
- 文章切换 watch（`props.article.id`）中复位 `readerMode='clean'`，避免上一篇的网页残留到下一篇。
- TS/模板需识别 `webview` 自定义元素（在 `<script setup>` 处用合适方式声明/忽略类型）。

## 数据流

纯渲染层局部状态，不涉及 App.vue、不涉及数据库、不新增持久化。唯一跨进程的是 `webviewTag` 开关与 `open-external-url` 这个 IPC。

## 安全考量

- webview 默认独立 renderer，不继承 `nodeIntegration`，保持沙箱。
- 拦截 webview 弹窗（`new-window`），避免恶意页面弹出真窗口。
- `open-external-url` 仅接受 `http`/`https` URL 并交给 `shell.openExternal`，拒绝其他协议。

## 已知权衡

部分站点带 `X-Frame-Options` / CSP `frame-ancestors` 限制时可能拒绝在内嵌环境显示（程度比 iframe 轻，但非 100%）。遇到此类页面，保留「在系统浏览器打开」作为退路。

## 测试

手动验证：
- 点「查看原文」→ 阅读区切原网页。
- 页面内点链接能导航；后退/前进/刷新可用。
- 「返回阅读视图」回到清洗正文。
- 切换到另一篇文章时自动复位为 clean 模式。
- fallback 场景（cleanedHtml 为空）的「查看原文」也走内嵌。
- 构建/类型检查通过。
