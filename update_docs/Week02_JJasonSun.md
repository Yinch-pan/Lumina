# Week 02 - 模块 C：AI 摘要与翻译系统

**负责人**：林宇轩、孙佳杰
**日期**：2026-05-25 ~ 2026-05-31（第二周）

---

## 本周完成的功能

### 1. LLMProvider 抽象层（C1）

- 实现 LLMProvider 接口，支持 chat() 和 streamChat() 两种调用方式
- 实现 OpenAICompatibleProvider 类，支持 OpenAI 兼容 API（ECNU）
- 支持流式和非流式响应
- 完善的错误处理：配置验证、API 错误（401/403/429/5xx）、网络错误

**文件**：src/main/llm/provider.ts

### 2. 配置管理

- 实现 loadConfig() 从 config.json 加载配置
- 实现 validateConfig() 验证配置完整性
- 实现 renderPrompt() Prompt 模板渲染
- 创建 SummaryPromptTemplate 默认摘要 Prompt 模板
- 创建 config.example.json 配置模板

**文件**：src/main/llm/config.ts, src/main/llm/config.example.json

### 3. Summary Agent（C3）

- 实现 SummaryAgent 类
- 实现 summarize() 非流式摘要生成
- 实现 summarizeStream() 流式摘要生成
- 支持 SummaryOptions（title、temperature、maxTokens）
- 错误处理：空输入、模板渲染失败、API 调用失败

**文件**：src/main/llm/agents.ts

### 4. SummaryService

- 实现 ISummaryService 接口
- 集成 SummaryAgent 生成摘要
- 第二周使用 mock Markdown 数据
- 为第三周数据库存储预留接口

**文件**：src/main/services/SummaryService.ts

### 5. 测试

- 创建 27 个 mock 测试用例
- 覆盖：配置验证、非流式摘要、流式摘要、空输入、错误处理、Prompt 渲染
- 所有测试通过

**文件**：test-summary.js

### 6. 文档

- 创建模块 C 接口文档
- 包含：对外接口、依赖接口、类型定义、调用示例、错误处理

**文件**：docs/module-c-接口文档.md

---

## 新增/变更的接口说明

### 对外提供的接口

```typescript
// SummaryService
interface ISummaryService {
  summarize(articleId: string): Promise<string>
}

// LLMProvider（高级用法）
interface LLMProvider {
  chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse>
  streamChat(messages: Message[], options?: ChatOptions): AsyncIterable<string>
}
```

### 类型定义

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatOptions {
  temperature?: number
  maxTokens?: number
}

interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}
```

### 配置格式

```json
{
  "baseUrl": "https://chat.ecnu.edu.cn/open/api/v1",
  "apiKey": "your-api-key-here",
  "model": "ecnu-plus"
}
```

---

## 已知问题

1. config.json 编码问题：PowerShell 写入时可能导致 UTF-16 编码，已修复 .gitignore 编码
2. 依赖 dist 目录：测试脚本需要先编译 TypeScript 才能运行

---

## 待办（第三周）

- [ ] 实现 TranslationService
- [ ] 对接模块 B CleaningService 获取真实 cleaned Markdown
- [ ] 对接模块 D SettingsService 获取用户配置
- [ ] 实现 AI 结果存储（agent_runs 表）
- [ ] 实现 AI 结果展示 UI（ReaderView 集成）
- [ ] AI 任务状态管理（加载中/成功/失败）

---

## 依赖状态

| 依赖模块 | 接口 | 状态 |
|----------|------|------|
| 模块 B | CleaningService.clean() | 第三周对接 |
| 模块 D | SettingsService.getLLMConfig() | 第三周对接（当前使用 config.json） |

---

## 提交记录

```
ffd5ac9 docs: add module C interface documentation
8b111ae chore: stop tracking config.json (contains API key)
f16cb37 chore: fix .gitignore encoding and add config.example.json
eb68747 test(module-c): add mock tests for SummaryService
cfccc20 feat(module-c): implement SummaryService
7c4ee45 feat(module-c): implement OpenAICompatibleProvider and SummaryAgent
b60811c feat(module-c): add LLMProvider interface, config management, and openai SDK
```
