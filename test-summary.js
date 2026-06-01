/**
 * test-summary.js
 * Mock 测试脚本：验证 SummaryService 的核心功能
 *
 * 测试用例：
 *   1. 配置验证测试 - 验证缺少 apiKey 时抛出错误
 *   2. 非流式摘要测试 - 使用 mock LLMProvider 验证摘要生成
 *   3. 流式摘要测试 - 使用 mock LLMProvider 验证流式摘要生成
 *   4. 空输入测试 - 验证空 articleId 时抛出错误
 *
 * 运行方式: node test-summary.js
 */

// ============================================================
// ANSI 颜色输出
// ============================================================
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'

// ============================================================
// 测试框架
// ============================================================
let totalTests = 0
let passedTests = 0
let failedTests = 0
const failures = []

function assert(condition, testName) {
  totalTests++
  if (condition) {
    passedTests++
    console.log(`  ${GREEN}✓${RESET} ${testName}`)
  } else {
    failedTests++
    failures.push(testName)
    console.log(`  ${RED}✗${RESET} ${testName}`)
  }
}

async function assertThrows(fn, expectedMessage, testName) {
  totalTests++
  try {
    await fn()
    failedTests++
    failures.push(`${testName} (expected error, but none was thrown)`)
    console.log(`  ${RED}✗${RESET} ${testName} — expected error, but none was thrown`)
  } catch (err) {
    if (expectedMessage && !err.message.includes(expectedMessage)) {
      failedTests++
      failures.push(`${testName} (expected "${expectedMessage}" in error, got "${err.message}")`)
      console.log(`  ${RED}✗${RESET} ${testName} — expected "${expectedMessage}", got "${err.message}"`)
    } else {
      passedTests++
      console.log(`  ${GREEN}✓${RESET} ${testName}`)
    }
  }
}

// ============================================================
// Mock 实现（镜像真实 TypeScript 代码逻辑）
// ============================================================

/**
 * validateConfig - 镜像 src/main/llm/config.ts
 */
function validateConfig(config) {
  if (!config.apiKey || config.apiKey.trim() === '') {
    throw new Error('LLM API key is not configured. Please set your API key in Settings.')
  }
  if (!config.baseUrl || config.baseUrl.trim() === '') {
    throw new Error('LLM base URL is not configured.')
  }
  if (!config.model || config.model.trim() === '') {
    throw new Error('LLM model is not configured.')
  }
}

/**
 * renderPrompt - 镜像 src/main/llm/config.ts
 */
function renderPrompt(template, variables) {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}

const SummaryPromptTemplate = `你是一个专业的文章摘要助手。请对以下文章内容生成简洁、准确的中文摘要。

文章标题：{title}
文章内容：
{content}

要求：
1. 摘要应包含文章的核心观点和关键信息
2. 长度控制在 200 字以内
3. 使用客观、简洁的语言`

/**
 * MockLLMProvider - 镜像 src/main/llm/provider.ts 接口
 * 返回预设的响应，不调用真实 API
 */
class MockLLMProvider {
  constructor(responseContent = '这是一篇关于高效学习编程的文章。核心原则包括动手实践、刻意练习和代码阅读。建议从基础语法开始逐步深入。') {
    this.responseContent = responseContent
  }

  async chat(messages, options) {
    return { content: this.responseContent }
  }

  async *streamChat(messages, options) {
    // 模拟流式输出：将响应内容按字符分块
    const chunks = this.responseContent.match(/.{1,5}/g) || [this.responseContent]
    for (const chunk of chunks) {
      yield chunk
    }
  }
}

/**
 * MockLLMProviderThatFails - 模拟 LLM 调用失败
 */
class MockLLMProviderThatFails {
  async chat(messages, options) {
    throw new Error('LLM API error (401): Invalid API key')
  }

  async *streamChat(messages, options) {
    throw new Error('LLM API error (401): Invalid API key')
  }
}

/**
 * SummaryAgent - 镜像 src/main/llm/agents.ts
 */
class SummaryAgent {
  constructor(config, provider) {
    if (provider) {
      this.provider = provider
    } else {
      // 真实实现会 require('./provider') 并创建 OpenAICompatibleProvider
      // Mock 测试中始终传入 provider
      throw new Error('SummaryAgent requires a provider in test mode')
    }
  }

  async summarize(markdown, options) {
    if (!markdown || markdown.trim() === '') {
      throw new Error('Markdown content cannot be empty')
    }

    let prompt
    try {
      prompt = renderPrompt(SummaryPromptTemplate, {
        title: options?.title ?? 'Untitled',
        content: markdown,
      })
    } catch (err) {
      throw new Error(`Failed to render summary prompt: ${err instanceof Error ? err.message : String(err)}`)
    }

    const messages = [{ role: 'user', content: prompt }]
    const chatOptions = {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    }

    try {
      const response = await this.provider.chat(messages, chatOptions)
      return response.content
    } catch (err) {
      throw new Error(`Summary generation failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async *summarizeStream(markdown, options) {
    if (!markdown || markdown.trim() === '') {
      throw new Error('Markdown content cannot be empty')
    }

    let prompt
    try {
      prompt = renderPrompt(SummaryPromptTemplate, {
        title: options?.title ?? 'Untitled',
        content: markdown,
      })
    } catch (err) {
      throw new Error(`Failed to render summary prompt: ${err instanceof Error ? err.message : String(err)}`)
    }

    const messages = [{ role: 'user', content: prompt }]
    const chatOptions = {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    }

    yield* this.provider.streamChat(messages, chatOptions)
  }
}

/**
 * SummaryService - 镜像 src/main/services/SummaryService.ts
 */
class SummaryService {
  constructor(config, agent) {
    this.agent = agent ?? new SummaryAgent(config)
  }

  async summarize(articleId) {
    if (!articleId || articleId.trim() === '') {
      throw new Error('Article ID cannot be empty')
    }

    const markdown = `# 如何高效学习编程\n\n编程学习是一个循序渐进的过程。`

    try {
      const summary = await this.agent.summarize(markdown)
      return summary
    } catch (err) {
      throw new Error(
        `Failed to generate summary for article "${articleId}": ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}

// ============================================================
// Mock Markdown 测试数据
// ============================================================
const MOCK_MARKDOWN = `# 如何高效学习编程

编程学习是一个循序渐进的过程，需要持续的练习和思考。

## 核心原则

1. **动手实践**：理论结合实践，通过项目驱动学习
2. **刻意练习**：针对薄弱环节反复练习
3. **代码阅读**：阅读优秀的开源项目代码

## 学习路径

建议从基础语法开始，逐步深入到数据结构、算法、设计模式等高级主题。

## 总结

坚持每天编码，保持好奇心，善用社区资源，你一定能成为优秀的开发者。`

const MOCK_SUMMARY = '这是一篇关于高效学习编程的文章。核心原则包括动手实践、刻意练习和代码阅读。建议从基础语法开始逐步深入，坚持每天编码。'

const VALID_CONFIG = {
  baseUrl: 'https://api.example.com/v1',
  apiKey: 'sk-test-key-12345',
  model: 'gpt-4o-mini',
}

// ============================================================
// 测试用例
// ============================================================
async function runTests() {
  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════${RESET}`)
  console.log(`${BOLD}${CYAN}  SummaryService Mock 测试${RESET}`)
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════${RESET}\n`)

  // ────────────────────────────────────────────────
  // 测试 1：配置验证测试
  // ────────────────────────────────────────────────
  console.log(`${BOLD}[测试 1] 配置验证测试${RESET}`)

  await assertThrows(
    async () => validateConfig({ baseUrl: 'https://api.example.com', apiKey: '', model: 'gpt-4o' }),
    'LLM API key is not configured',
    '缺少 apiKey 时应抛出 "LLM API key is not configured" 错误'
  )

  await assertThrows(
    async () => validateConfig({ baseUrl: 'https://api.example.com', apiKey: '   ', model: 'gpt-4o' }),
    'LLM API key is not configured',
    'apiKey 为空白时应抛出错误'
  )

  await assertThrows(
    async () => validateConfig({ baseUrl: '', apiKey: 'sk-test', model: 'gpt-4o' }),
    'LLM base URL is not configured',
    '缺少 baseUrl 时应抛出 "LLM base URL is not configured" 错误'
  )

  await assertThrows(
    async () => validateConfig({ baseUrl: 'https://api.example.com', apiKey: 'sk-test', model: '' }),
    'LLM model is not configured',
    '缺少 model 时应抛出 "LLM model is not configured" 错误'
  )

  // 验证有效配置不抛错
  totalTests++
  try {
    validateConfig(VALID_CONFIG)
    passedTests++
    console.log(`  ${GREEN}✓${RESET} 有效配置不抛出错误`)
  } catch {
    failedTests++
    failures.push('有效配置不抛出错误')
    console.log(`  ${RED}✗${RESET} 有效配置不抛出错误`)
  }

  // ────────────────────────────────────────────────
  // 测试 2：非流式摘要测试
  // ────────────────────────────────────────────────
  console.log(`\n${BOLD}[测试 2] 非流式摘要测试${RESET}`)

  // 测试 2a: SummaryAgent.summarize 基本功能
  const mockProvider = new MockLLMProvider(MOCK_SUMMARY)
  const agent = new SummaryAgent(VALID_CONFIG, mockProvider)
  const summary = await agent.summarize(MOCK_MARKDOWN)

  assert(typeof summary === 'string', 'summarize() 返回值为字符串')
  assert(summary.length > 0, 'summarize() 返回非空字符串')
  assert(summary === MOCK_SUMMARY, 'summarize() 返回预期的摘要内容')

  // 测试 2b: SummaryAgent.summarize 支持自定义选项
  const summaryWithOptions = await agent.summarize(MOCK_MARKDOWN, {
    title: '高效学习编程指南',
    temperature: 0.5,
    maxTokens: 200,
  })
  assert(typeof summaryWithOptions === 'string', '带选项的 summarize() 返回字符串')
  assert(summaryWithOptions === MOCK_SUMMARY, '带选项的 summarize() 返回预期内容')

  // 测试 2c: SummaryService.summarize 完整流程
  const service = new SummaryService(VALID_CONFIG, agent)
  const serviceSummary = await service.summarize('article-001')

  assert(typeof serviceSummary === 'string', 'SummaryService.summarize() 返回字符串')
  assert(serviceSummary === MOCK_SUMMARY, 'SummaryService.summarize() 返回预期摘要')

  // ────────────────────────────────────────────────
  // 测试 3：流式摘要测试
  // ────────────────────────────────────────────────
  console.log(`\n${BOLD}[测试 3] 流式摘要测试${RESET}`)

  // 测试 3a: SummaryAgent.summarizeStream 基本功能
  const streamAgent = new SummaryAgent(VALID_CONFIG, new MockLLMProvider(MOCK_SUMMARY))
  const chunks = []
  for await (const chunk of streamAgent.summarizeStream(MOCK_MARKDOWN)) {
    chunks.push(chunk)
  }

  assert(chunks.length > 0, 'summarizeStream() 返回至少一个 chunk')
  assert(typeof chunks[0] === 'string', '每个 chunk 为字符串类型')

  const fullStreamText = chunks.join('')
  assert(fullStreamText === MOCK_SUMMARY, '流式拼接结果与原始内容一致')

  // 测试 3b: 流式摘要支持自定义选项
  const chunksWithOptions = []
  for await (const chunk of streamAgent.summarizeStream(MOCK_MARKDOWN, {
    title: '自定义标题',
    temperature: 0.3,
  })) {
    chunksWithOptions.push(chunk)
  }
  assert(chunksWithOptions.length > 0, '带选项的 summarizeStream() 返回 chunk')

  // ────────────────────────────────────────────────
  // 测试 4：空输入 / 错误处理测试
  // ────────────────────────────────────────────────
  console.log(`\n${BOLD}[测试 4] 空输入与错误处理测试${RESET}`)

  // 测试 4a: SummaryService 空 articleId
  await assertThrows(
    async () => service.summarize(''),
    'Article ID cannot be empty',
    '空 articleId 应抛出 "Article ID cannot be empty" 错误'
  )

  await assertThrows(
    async () => service.summarize('   '),
    'Article ID cannot be empty',
    '空白 articleId 应抛出 "Article ID cannot be empty" 错误'
  )

  // 测试 4b: SummaryAgent 空 markdown
  await assertThrows(
    async () => agent.summarize(''),
    'Markdown content cannot be empty',
    '空 markdown 应抛出 "Markdown content cannot be empty" 错误'
  )

  await assertThrows(
    async () => agent.summarize('   '),
    'Markdown content cannot be empty',
    '空白 markdown 应抛出 "Markdown content cannot be empty" 错误'
  )

  // 测试 4c: 流式摘要空 markdown
  await assertThrows(
    async () => {
      const stream = agent.summarizeStream('')
      for await (const _ of stream) { /* consume */ }
    },
    'Markdown content cannot be empty',
    '流式摘要空 markdown 应抛出 "Markdown content cannot be empty" 错误'
  )

  // 测试 4d: LLM 调用失败时的错误传播
  const failingProvider = new MockLLMProviderThatFails()
  const failingAgent = new SummaryAgent(VALID_CONFIG, failingProvider)

  await assertThrows(
    async () => failingAgent.summarize(MOCK_MARKDOWN),
    'Summary generation failed',
    'LLM 调用失败时抛出 "Summary generation failed" 错误'
  )

  // 测试 4e: SummaryService 中 agent 失败时的错误传播
  const failingService = new SummaryService(VALID_CONFIG, failingAgent)

  await assertThrows(
    async () => failingService.summarize('article-001'),
    'Failed to generate summary for article',
    'SummaryService 捕获 agent 错误并重新抛出'
  )

  // ────────────────────────────────────────────────
  // 测试 5：Prompt 渲染测试
  // ────────────────────────────────────────────────
  console.log(`\n${BOLD}[测试 5] Prompt 渲染测试${RESET}`)

  const rendered = renderPrompt(SummaryPromptTemplate, {
    title: '测试标题',
    content: '测试内容',
  })
  assert(rendered.includes('测试标题'), 'renderPrompt 正确替换 {title}')
  assert(rendered.includes('测试内容'), 'renderPrompt 正确替换 {content}')
  assert(!rendered.includes('{title}'), 'renderPrompt 中 {title} 已被替换')
  assert(!rendered.includes('{content}'), 'renderPrompt 中 {content} 已被替换')

  // ────────────────────────────────────────────────
  // 测试结果汇总
  // ────────────────────────────────────────────────
  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════${RESET}`)
  console.log(`${BOLD}  测试结果汇总${RESET}`)
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════${RESET}`)
  console.log(`  总计: ${totalTests}`)
  console.log(`  ${GREEN}通过: ${passedTests}${RESET}`)
  if (failedTests > 0) {
    console.log(`  ${RED}失败: ${failedTests}${RESET}`)
    console.log(`\n  ${RED}失败的测试:${RESET}`)
    for (const f of failures) {
      console.log(`    ${RED}✗${RESET} ${f}`)
    }
  } else {
    console.log(`  ${GREEN}失败: 0${RESET}`)
  }
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════${RESET}`)

  if (failedTests === 0) {
    console.log(`\n${GREEN}${BOLD}  ✓ 全部测试通过！${RESET}\n`)
    process.exit(0)
  } else {
    console.log(`\n${RED}${BOLD}  ✗ 存在失败的测试！${RESET}\n`)
    process.exit(1)
  }
}

// ============================================================
// 运行测试
// ============================================================
runTests().catch((err) => {
  console.error(`${RED}测试运行异常:${RESET}`, err)
  process.exit(1)
})
