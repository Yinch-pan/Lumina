# 模块 C：AI 摘要与翻译系统 - 接口文档

> 最后更新：2026-06-01
> 负责人：林宇轩、孙佳杰

---

## 目录

1. [概述](#概述)
2. [对外提供的接口](#对外提供的接口)
3. [依赖的外部接口](#依赖的外部接口)
4. [类型定义](#类型定义)
5. [调用示例](#调用示例)
6. [错误处理](#错误处理)

---

## 概述

模块 C 负责 AI 摘要与翻译功能，核心组件：

| 组件 | 文件 | 说明 |
|------|------|------|
| LLMProvider | src/main/llm/provider.ts | LLM 调用抽象层 |
| OpenAICompatibleProvider | src/main/llm/provider.ts | OpenAI 兼容 API 实现 |
| SummaryAgent | src/main/llm/agents.ts | 摘要生成代理 |
| SummaryService | src/main/services/SummaryService.ts | 摘要服务（对外接口） |
| TranslationService | src/main/services/TranslationService.ts | 翻译服务（第三周实现） |

---

## 对外提供的接口

### 1. SummaryService

**文件位置**：src/main/services/SummaryService.ts

**接口定义**：

`	ypescript
interface ISummaryService {
  /**
   * 生成文章摘要
   * @param articleId 文章 ID
   * @returns 摘要字符串
   * @throws Error 当 articleId 为空时
   * @throws Error 当摘要生成失败时
   */
  summarize(articleId: string): Promise<string>
}
`

**调用方**：
- UI 层（ReaderView.vue）- 展示文章摘要
- 模块 D（ExportService）- 导出时包含摘要

**使用示例**：

`	ypescript
import { SummaryService } from './services/SummaryService'
import { loadConfig } from './llm/config'

// 创建实例
const config = loadConfig()
const summaryService = new SummaryService(config)

// 生成摘要
try {
  const summary = await summaryService.summarize('article-123')
  console.log('摘要:', summary)
} catch (error) {
  console.error('摘要生成失败:', error.message)
}
`

**返回示例**：

`
Mercury 是一款跨平台、本地优先且具备 AI 增强功能的 RSS 阅读器。其核心功能包括支持 RSS/Atom 格式的订阅管理、自动提取正文的内容清洗技术，以及利用大语言模型（LLM）生成文章摘要的 AI 摘要服务。
`

**当前状态**：
- 第二周：使用 mock Markdown 数据
- 第三周：对接 CleaningService 获取真实数据

---

### 2. TranslationService（第三周实现）

**文件位置**：src/main/services/TranslationService.ts

**接口定义**：

`	ypescript
interface ITranslationService {
  /**
   * 翻译文章
   * @param articleId 文章 ID
   * @param targetLang 目标语言代码（如 'en', 'ja', 'ko'）
   * @returns 翻译后的文本
   * @throws Error 当 articleId 为空时
   * @throws Error 当翻译失败时
   */
  translate(articleId: string, targetLang: string): Promise<string>
}
`

**调用方**：
- UI 层（ReaderView.vue）- 展示翻译结果
- 模块 D（ExportService）- 导出时包含翻译

**使用示例**（第三周可用）：

`	ypescript
import { TranslationService } from './services/TranslationService'

const translationService = new TranslationService(config)

// 翻译为英文
const english = await translationService.translate('article-123', 'en')

// 翻译为日文
const japanese = await translationService.translate('article-123', 'ja')
`

**当前状态**：第三周实现

---

### 3. LLMProvider（高级用法）

**文件位置**：src/main/llm/provider.ts

**接口定义**：

`	ypescript
interface LLMProvider {
  /**
   * 非流式对话调用
   * @param messages 消息列表
   * @param options 可选参数
   * @returns LLM 响应
   */
  chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse>

  /**
   * 流式对话调用
   * @param messages 消息列表
   * @param options 可选参数
   * @returns 异步迭代器
   */
  streamChat(messages: Message[], options?: ChatOptions): AsyncIterable<string>
}
`

**使用场景**：
- 需要直接调用 LLM 的场景
- 自定义 Prompt 的场景

**使用示例**：

`	ypescript
import { OpenAICompatibleProvider } from './llm/provider'
import { loadConfig, validateConfig } from './llm/config'

const config = loadConfig()
validateConfig(config)

const provider = new OpenAICompatibleProvider(config)

// 非流式调用
const response = await provider.chat([
  { role: 'system', content: '你是一个助手' },
  { role: 'user', content: '你好' }
])
console.log(response.content)

// 流式调用
for await (const chunk of provider.streamChat([
  { role: 'user', content: '讲一个故事' }
])) {
  process.stdout.write(chunk)
}
`

---

## 依赖的外部接口

### 1. 依赖模块 B：CleaningService

**接口签名**：

`	ypescript
interface ICleaningService {
  /**
   * 清洗文章内容
   * @param articleId 文章 ID
   * @param url 文章 URL
   * @returns 清洗后的内容
   */
  cleanArticle(articleId: string, url: string): Promise<{
    cleanedHtml: string      // 清洗后的 HTML
    cleanedMarkdown: string  // 转换后的 Markdown
    title?: string           // 文章标题
    author?: string          // 作者
  }>
}
`

**模块 C 的使用方式**：

`	ypescript
// 第三周对接示例
const content = await cleaningService.cleanArticle(articleId, url)
const summary = await summaryAgent.summarize(content.cleanedMarkdown)
`

**当前状态**：模块 C 第二周使用 mock 数据，第三周对接

---

### 2. 依赖模块 D：SettingsService

**接口签名**：

`	ypescript
interface ISettingsService {
  /**
   * 获取 LLM 配置
   * @returns LLM 配置对象
   */
  getLLMConfig(): Promise<LLMConfig>
}

interface LLMConfig {
  baseUrl: string   // API 基础 URL
  apiKey: string    // API 密钥
  model: string     // 模型名称
}
`

**模块 C 的使用方式**：

`	ypescript
// 第三周对接示例
const config = await settingsService.getLLMConfig()
const provider = new OpenAICompatibleProvider(config)
`

**当前状态**：模块 C 第二周使用 config.json，第三周对接

---

## 类型定义

### Message

`	ypescript
interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}
`

### ChatOptions

`	ypescript
interface ChatOptions {
  temperature?: number  // 生成温度，0-2 之间，默认 1
  maxTokens?: number    // 最大生成 token 数
}
`

### LLMResponse

`	ypescript
interface LLMResponse {
  content: string                    // 生成的文本
  usage?: {
    promptTokens: number             // 输入 token 数
    completionTokens: number         // 输出 token 数
  }
}
`

### SummaryOptions

`	ypescript
interface SummaryOptions {
  title?: string        // 文章标题，用于 Prompt 模板
  temperature?: number  // 生成温度
  maxTokens?: number    // 最大 token 数
}
`

---

## 调用示例

### 完整的摘要生成流程

`	ypescript
// 1. 导入依赖
import { SummaryService } from './services/SummaryService'
import { loadConfig, validateConfig } from './llm/config'

// 2. 加载配置
const config = loadConfig()
validateConfig(config)

// 3. 创建服务实例
const summaryService = new SummaryService(config)

// 4. 生成摘要
async function getArticleSummary(articleId: string): Promise<string> {
  try {
    const summary = await summaryService.summarize(articleId)
    return summary
  } catch (error) {
    if (error.message.includes('Article ID cannot be empty')) {
      console.error('文章 ID 不能为空')
    } else if (error.message.includes('Summary generation failed')) {
      console.error('摘要生成失败，请检查网络或 API 配置')
    }
    throw error
  }
}
`

### 在 Vue 组件中使用

`ue
<script setup lang="ts">
import { ref } from 'vue'

const summary = ref('')
const loading = ref(false)
const error = ref(null)

async function loadSummary(articleId) {
  loading.value = true
  error.value = null
  
  try {
    // 通过 IPC 调用主进程
    summary.value = await window.electronAPI.summarizeArticle(articleId)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="loading">生成摘要中...</div>
  <div v-else-if="error">{{ error }}</div>
  <div v-else>{{ summary }}</div>
</template>
`

---

## 错误处理

### 错误类型

| 错误消息 | 原因 | 处理建议 |
|----------|------|----------|
| Article ID cannot be empty | 传入的 articleId 为空 | 检查参数 |
| Markdown content cannot be empty | 文章内容为空 | 检查文章是否存在 |
| LLM API key is not configured | API key 未配置 | 引导用户配置 |
| LLM authentication failed (401) | API key 无效 | 引导用户重新配置 |
| LLM rate limit exceeded (429) | 请求过于频繁 | 稍后重试 |
| LLM server error (5xx) | 服务器错误 | 稍后重试 |
| LLM network error | 网络连接失败 | 检查网络 |

### 错误处理最佳实践

`	ypescript
try {
  const summary = await summaryService.summarize(articleId)
} catch (error) {
  // 解析错误类型
  if (error.message.includes('401')) {
    // API key 无效，引导用户重新配置
    showSettingsDialog()
  } else if (error.message.includes('429')) {
    // 请求限制，稍后重试
    setTimeout(() => retry(), 5000)
  } else {
    // 其他错误
    showErrorMessage(error.message)
  }
}
`

---

## 配置说明

### config.json 格式

`json
{
  "baseUrl": "https://chat.ecnu.edu.cn/open/api/v1",
  "apiKey": "your-api-key-here",
  "model": "ecnu-plus"
}
`

### 支持的模型

| 模型 | 说明 |
|------|------|
| ecnu-plus | 默认模型，Qwen3.6-27B |
| ecnu-max | DeepSeek-V4-Flash |

---

## 更新日志

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-06-01 | 1.0 | 第二周完成，SummaryService 可用 |
| 2026-06-05 | 2.0 | 第三周完成，TranslationService 可用，真实 API 测试通过 |

---

## 真实 API 测试报告

**测试时间**：2026-06-05
**测试环境**：ECNU API (https://chat.ecnu.edu.cn/open/api/v1)
**测试模型**：ecnu-plus (Qwen3.6-27B)

### 测试结果

| 测试项 | 状态 | 说明 |
|--------|------|------|
| Provider 创建 | ✅ 通过 | OpenAICompatibleProvider 正常初始化 |
| 非流式调用 | ✅ 通过 | 返回完整响应，Token 用量统计正常 |
| 流式调用 | ✅ 通过 | 逐块返回内容，无错误 |
| SummaryAgent | ✅ 通过 | 摘要生成成功，内容准确 |
| TranslationAgent | ✅ 通过 | 翻译生成成功，翻译质量良好 |

### 测试详情

**1. 非流式调用**
- 输入：`"你好，请简单介绍一下自己。"`
- 输出：通义千问自我介绍
- Token 用量：promptTokens: 19, completionTokens: 76

**2. 流式调用**
- 输入：`"用一句话介绍 RSS 阅读器。"`
- 输出：RSS 阅读器定义
- 流式传输正常，无延迟问题

**3. SummaryAgent**
- 输入：Mercury RSS 阅读器介绍（约 300 字）
- 输出：高质量中文摘要（约 150 字）
- 摘要准确捕捉了核心功能和技术栈

**4. TranslationAgent**
- 输入：Mercury RSS 阅读器介绍
- 输出：英文翻译
- 翻译准确，专业术语处理得当

### API 配置

```json
{
  "baseUrl": "https://chat.ecnu.edu.cn/open/api/v1",
  "apiKey": "your-api-key-here",
  "model": "ecnu-plus"
}
```

### 结论

所有功能测试通过，API 调用稳定可靠。摘要和翻译质量满足预期要求。

---

## 联系方式

如有问题，请联系：林宇轩、孙佳杰