/**
 * 真实 API 测试脚本
 * 使用 ECNU API 测试摘要和翻译功能
 */

const { OpenAICompatibleProvider } = require('./dist/main/llm/provider')
const { SummaryAgent, TranslationAgent } = require('./dist/main/llm/agents')

const config = {
  baseUrl: 'https://chat.ecnu.edu.cn/open/api/v1',
  apiKey: 'sk-3a6d410e57ff48ff8b010d891a95ecc1',
  model: 'ecnu-plus'
}

const testMarkdown = `# Mercury RSS 阅读器

Mercury 是一个跨平台、本地优先、AI 增强型 RSS 阅读器。

## 核心功能

1. **订阅管理**：支持 RSS/Atom 格式
2. **内容清洗**：自动提取正文
3. **AI 摘要**：利用 LLM 生成文章摘要
4. **AI 翻译**：支持多语言翻译

## 技术栈

- Electron + Vue3 + TypeScript
- SQLite 数据库
- OpenAI-compatible API

Mercury 旨在提供一个高效、智能的阅读体验。`

async function testRealAPI() {
  console.log('=== 真实 API 测试 ===\n')

  // 1. 测试 Provider
  console.log('1. 测试 OpenAICompatibleProvider...')
  try {
    const provider = new OpenAICompatibleProvider(config)
    console.log('   ✓ Provider 创建成功')

    // 2. 测试非流式调用
    console.log('\n2. 测试非流式调用...')
    const response = await provider.chat([
      { role: 'user', content: '你好，请简单介绍一下自己。' }
    ])
    console.log('   ✓ 非流式调用成功')
    console.log('   响应内容:', response.content.substring(0, 100) + '...')
    if (response.usage) {
      console.log('   Token 用量:', response.usage)
    }

    // 3. 测试流式调用
    console.log('\n3. 测试流式调用...')
    let streamContent = ''
    for await (const chunk of provider.streamChat([
      { role: 'user', content: '用一句话介绍 RSS 阅读器。' }
    ])) {
      streamContent += chunk
    }
    console.log('   ✓ 流式调用成功')
    console.log('   流式内容:', streamContent.substring(0, 100) + '...')

  } catch (error) {
    console.error('   ✗ Provider 测试失败:', error.message)
    return
  }

  // 4. 测试 SummaryAgent
  console.log('\n4. 测试 SummaryAgent...')
  try {
    const summaryAgent = new SummaryAgent(config)
    const summary = await summaryAgent.summarize(testMarkdown, {
      title: 'Mercury RSS 阅读器介绍'
    })
    console.log('   ✓ 摘要生成成功')
    console.log('   摘要内容:', summary)
  } catch (error) {
    console.error('   ✗ 摘要生成失败:', error.message)
  }

  // 5. 测试 TranslationAgent
  console.log('\n5. 测试 TranslationAgent...')
  try {
    const translationAgent = new TranslationAgent(config)
    const translation = await translationAgent.translate(testMarkdown, 'en', {
      title: 'Mercury RSS 阅读器介绍'
    })
    console.log('   ✓ 翻译生成成功')
    console.log('   翻译内容:', translation.substring(0, 200) + '...')
  } catch (error) {
    console.error('   ✗ 翻译生成失败:', error.message)
  }

  console.log('\n=== 测试完成 ===')
}

// 运行测试
testRealAPI().catch(console.error)
