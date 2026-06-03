# Week 02 开发文档 — 张震（模块 D）

## 本周完成的功能

### 1. 数据访问层 (repository.ts)
- 实现了完整的数据库操作封装，涵盖：
  - 标签 CRUD（insertTag, selectAllTags, deleteTagById, updateTagName, findTagByName）
  - 文章-标签关联（insertEntryTag, deleteEntryTag, selectTagsByEntryId, selectEntriesByTagId）
  - 文章查询（selectEntryById, selectAllEntries, selectEntriesByFeedId）
  - 设置持久化（selectSetting, upsertSetting, selectLLMConfig, saveLLMConfig）

### 2. TagService — 标签服务
- 实现 `ITagService` 接口的全部方法
- 标签创建时自动去重
- 给文章打标签时自动创建不存在的标签
- 按标签筛选文章功能

### 3. ExportService — 导出服务
- 实现 `IExportService` 接口的全部方法
- 单篇 Markdown 导出：包含标题、元信息、AI 摘要、AI 翻译、正文
- 批量导出：按文章标题生成文件名，自动处理特殊字符

### 4. SettingsService — 设置服务
- 实现 `ISettingsService` 接口的全部方法
- LLM 配置持久化到 SQLite settings 表
- 通用键值对设置存取

### 5. IPC 层
- 扩展 preload/index.ts，暴露完整的标签、导出、设置 API
- 在主进程 index.ts 中注册所有 IPC handlers
- 集成 Electron dialog（showSaveDialog, showOpenDialog）用于文件导出

### 6. 前端组件
- **SettingsView.vue**：LLM 配置和应用设置的真实保存/加载，集成标签管理面板
- **ReaderView.vue**：标签显示与交互（添加/移除标签），Markdown 导出（调用系统保存对话框）
- **TagManager.vue**（新增）：标签管理面板，支持创建、重命名、删除标签
- **App.vue**：串联所有真实 API，标签筛选逻辑，按 Feed + 标签双重筛选

### 7. 其他
- 添加 Vue 类型声明文件 (env.d.ts)

## 新增/变更的接口

### 新增 IPC 通道
| 通道名 | 参数 | 说明 |
|--------|------|------|
| `get-all-tags` | - | 获取所有标签（含使用统计） |
| `create-tag` | name | 创建标签 |
| `delete-tag` | tagId | 删除标签及关联 |
| `update-tag` | tagId, newName | 重命名标签 |
| `add-tag-to-article` | articleId, tagName | 给文章添加标签 |
| `remove-tag-from-article` | articleId, tagName | 从文章移除标签 |
| `get-article-tags` | articleId | 获取文章的所有标签 |
| `get-articles-by-tag` | tagName | 按标签筛选文章 |
| `export-markdown` | articleId, filePath | 导出单篇 Markdown |
| `export-multiple-markdown` | articleIds[], dirPath | 批量导出 Markdown |
| `show-save-dialog` | options | 显示系统保存对话框 |
| `show-open-dialog` | options | 显示系统打开对话框 |
| `get-llm-config` | - | 获取 LLM 配置 |
| `save-llm-config` | config | 保存 LLM 配置 |
| `get-setting` | key | 获取设置项 |
| `save-setting` | key, value | 保存设置项 |

### 新增文件
- `src/main/database/repository.ts`
- `src/main/services/TagService.ts`
- `src/main/services/ExportService.ts`
- `src/main/services/SettingsService.ts`
- `src/renderer/components/TagManager.vue`
- `src/env.d.ts`

### 变更文件
- `src/preload/index.ts` — 扩展 IPC 接口
- `src/main/index.ts` — 注册 IPC handlers
- `src/renderer/App.vue` — 串联真实 API
- `src/renderer/components/ReaderView.vue` — 标签交互 & 导出
- `src/renderer/components/SettingsView.vue` — 真实保存/加载

## 已知问题和待办

1. **文章数据仍为 Mock**：文章列表和文章内容目前使用前端 Mock 数据，需要等待模块 A 完成后对接真实 ArticleService
2. **AI 功能占位**：摘要和翻译功能仍为 alert 占位，等待模块 C 完成后对接
3. **Feed 功能占位**：添加订阅和刷新功能仍为 alert 占位，等待模块 A 完成后对接
4. **标签筛选性能**：当文章数量较多时，按标签筛选需要优化（当前在前端内存中筛选）
