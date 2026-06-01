# A 模块开发问题与解决记录

## 1. Electron 无法加载 better-sqlite3

### 现象

完成 A 模块后启动 Electron 窗口时报错：

```text
better_sqlite3.node was compiled against a different Node.js version
NODE_MODULE_VERSION 127
This version of Node.js requires NODE_MODULE_VERSION 146
```

窗口无法正常打开。

### 原因

A 模块接入数据库后，主进程启动时会真正加载 `better-sqlite3` 原生模块。普通 `npm install` 安装出来的 `.node` 文件是按系统 Node.js ABI 编译的，而 Electron 自带 Node/V8 运行时，ABI 不一定相同。

之前没有 A 模块时，项目没有真正初始化数据库，所以这个问题没有暴露。

### 排查过程

1. 尝试按 Electron 目标重编译：

```powershell
npm rebuild better-sqlite3 --runtime=electron --target=42.3.0 --abi=146 --dist-url=https://electronjs.org/headers
```

结果：进入了正确的 Electron 重编译流程，但本机缺少 Visual Studio C++ Build Tools。

2. 安装 `electron-builder` 并尝试：

```powershell
npm install --save-dev electron-builder
npx electron-builder install-app-deps
```

结果：流程正确，但仍然因为缺少 C++ 工具链失败。

3. 安装 Visual Studio 2022 Build Tools 后再次重建。

结果：工具链问题解决，但 `better-sqlite3@12.10.0` 与 Electron `42.3.0` 的 V8 C++ API 不兼容，出现编译错误。

### 解决方式

将 Electron 从 `^42.3.0` 调整为 `^38.4.0`，并使用 `electron-builder` 重建原生依赖：

```powershell
npm install --save-dev electron@38.4.0
npx electron-builder install-app-deps
```

最终 `better-sqlite3` 成功按 Electron 运行时编译，Electron 窗口可以正常打开。

### 当前依赖状态

```json
{
  "electron": "^38.4.0",
  "electron-builder": "^26.8.1",
  "better-sqlite3": "^12.10.0"
}
```

注意：当前 `better-sqlite3` 已按 Electron ABI 编译，直接用系统 Node.js 运行加载数据库的脚本时，可能出现反向 ABI 不匹配。项目主运行目标是 Electron，因此当前状态是正确的。

## 2. 更新 Node.js 不能解决 Electron 原生模块问题

### 现象

更新 Node.js 并重新安装依赖后，构建和 Node 侧脚本可以恢复，但 Electron 启动仍然可能报 `better-sqlite3` ABI 问题。

### 原因

Electron 使用自己的 Node/V8 运行时。系统 Node.js 版本更新只能影响普通 Node 脚本，不能自动让原生模块匹配 Electron ABI。

### 结论

Electron 原生依赖需要通过 `@electron/rebuild` 或 `electron-builder install-app-deps` 按 Electron 版本重建。

## 3. OPML 导入时报 “An object could not be cloned”

### 现象

导入 OPML 时渲染进程提示：

```text
导入失败：An object could not be cloned.
```

### 原因

Electron IPC 需要使用结构化克隆传递数据。数据库查询对象、XML 解析对象或 Vue 响应式 Proxy 都可能不是可克隆的普通对象。

### 解决方式

1. 主进程 IPC 返回值统一 JSON 化：

```ts
function cloneForIpc<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
```

2. Repository 返回 Feed、Article、Tag、ArticleContent 时，显式转成 string、number、boolean 等普通类型。

3. OPML 导入前在渲染进程、preload 和主进程都把 `{ title, url }` 转为普通对象。

4. 无效 OPML 文件给出明确错误：

```text
该文件不是有效的 OPML，或其中没有可导入的订阅源
```

## 4. OPML 中单个订阅源超时导致整体失败

### 现象

导入包含 V2EX 的 OPML 时失败：

```text
Failed to import OPML feed "V2EX" (https://www.v2ex.com/index.xml): fetch failed
```

### 原因

这是单个 Feed URL 在当前 Node/Electron 网络环境下连接超时，不是 OPML 文件格式问题，也不是 IPC 问题。

### 解决方式

将 OPML 导入改成“部分成功”策略：

- 成功抓取的订阅源正常导入。
- 失败的订阅源记录标题、URL 和错误原因。
- UI 显示“已导入 N 个订阅源，M 个失败”。

## 5. 刷新后自定义名称被覆盖

### 现象

用户修改订阅源名称后，点击刷新，名称又变回 RSS 源标题。

### 原因

早期实现中，`FeedService.refreshFeed()` 会把解析到的 `parsed.title` 写回 `feeds.title`。当 `title` 同时承担“源站标题”和“用户显示名称”时，刷新会覆盖用户自定义名称。

### 第一阶段修复

刷新时不再更新 `title`，只更新描述、站点 URL、刷新时间和文章列表。

### 完整修复

后续将名称拆成：

- `feed_title`：RSS/Atom 源站原始标题。
- `custom_title`：用户自定义名称。
- 展示名称：`custom_title || feed_title || title`。

刷新时只更新 `feed_title`，不会覆盖 `custom_title`。

## 6. 编辑订阅源窗口容易误关闭

### 现象

编辑订阅源窗口点击背景就会关闭，容易误操作并丢失修改。

### 解决方式

- 移除编辑窗口的背景点击关闭。
- 只能通过右上角关闭按钮、取消、保存成功、删除成功关闭。
- 如果存在未保存修改，关闭前提示确认。

## 7. 仓库 Git 安全目录问题

### 现象

执行 Git 命令时出现：

```text
fatal: detected dubious ownership in repository
```

### 原因

当前运行用户 SID 与仓库目录所有者 SID 不一致，Git 出于安全考虑拒绝操作。

### 处理方式

没有修改全局 Git 配置，而是在必要 Git 命令中临时加入：

```powershell
git -c safe.directory=C:/Users/16955/Desktop/Mercury ...
```

这样只对当前命令生效，不污染全局配置。

## 8. 验证结果

最终验证：

```powershell
npm run build
```

结果：Vite 渲染进程构建通过，主进程 TypeScript 构建通过。

Electron 窗口已成功启动，主窗口标题：

```text
Mercury
```
