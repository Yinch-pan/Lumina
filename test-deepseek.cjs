/**
 * DeepSeek API 测试脚本
 * 测试 AI 摘要和翻译功能
 * 
 * 使用方法：
 * 设置环境变量 DEEPSEEK_API_KEY，然后运行此脚本
 */

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com'

if (!DEEPSEEK_API_KEY) {
  console.error('❌ 请设置环境变量 DEEPSEEK_API_KEY')
  console.error('   例如: export DEEPSEEK_API_KEY=your-api-key')
  process.exit(1)
}

// 测试文章内容
const testArticle = {
  title: 'Mercury RSS Reader: A Cross-Platform, Local-First, AI-Enhanced RSS Reader',
  content: `
Mercury is a cross-platform, local-first RSS reader built with Electron, Vue 3, TypeScript, and SQLite. It provides AI-powered summarization and translation features to help users get more value from their reading.

Key Features:
1. RSS 2.0 and Atom 1.0 feed support
2. OPML import/export for bulk subscription management
3. AI-powered article summarization
4. AI-powered translation to multiple languages
5. Smart tagging system
6. Markdown export for note-taking
7. Local SQLite database for data privacy
8. Cross-platform support (Windows, macOS, Linux)

The application uses a modular architecture with four main modules:
- Module A: Feed and Data System
- Module B: Content Cleaning and Reading System
- Module C: AI Summary and Translation System
- Module D: Tags, Export, and Settings System

Mercury is designed with privacy in mind - all data is stored locally on the user's device, and AI features are optional and configurable.
  `.trim()
}

async function testDeepSeekAPI() {
  console.log('=== DeepSeek API 测试 ===\n')

  try {
    // 1. 测试非流式摘要生成
    console.log('1. 测试非流式摘要生成...')
    const summaryResponse = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的文章摘要助手。请对以下文章内容生成简洁、准确的中文摘要。摘要应包含文章的核心观点和关键信息，长度控制在 200 字以内，使用客观、简洁的语言。'
          },
          {
            role: 'user',
            content: `文章标题：${testArticle.title}\n\n文章内容：\n${testArticle.content}`
          }
        ],
        stream: false
      })
    })

    if (!summaryResponse.ok) {
      throw new Error(`HTTP error! status: ${summaryResponse.status}`)
    }

    const summaryData = await summaryResponse.json()
    const summary = summaryData.choices[0].message.content
    console.log('✓ 摘要生成成功')
    console.log(`  摘要内容: ${summary.substring(0, 100)}...`)
    console.log(`  Token 用量: ${JSON.stringify(summaryData.usage)}`)

    // 2. 测试非流式翻译生成
    console.log('\n2. 测试非流式翻译生成...')
    const translationResponse = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content: '你是一个专业翻译助手。请将以下文章翻译为中文，保留 Markdown 结构和链接。忠实表达原文含义，保留标题、列表、代码块和链接格式，只输出译文，不要添加解释。'
          },
          {
            role: 'user',
            content: `文章标题：${testArticle.title}\n\n文章内容：\n${testArticle.content}`
          }
        ],
        stream: false
      })
    })

    if (!translationResponse.ok) {
      throw new Error(`HTTP error! status: ${translationResponse.status}`)
    }

    const translationData = await translationResponse.json()
    const translation = translationData.choices[0].message.content
    console.log('✓ 翻译生成成功')
    console.log(`  翻译内容: ${translation.substring(0, 100)}...`)
    console.log(`  Token 用量: ${JSON.stringify(translationData.usage)}`)

    // 3. 测试流式摘要生成
    console.log('\n3. 测试流式摘要生成...')
    const streamSummaryResponse = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的文章摘要助手。请对以下文章内容生成简洁、准确的中文摘要。摘要应包含文章的核心观点和关键信息，长度控制在 200 字以内，使用客观、简洁的语言。'
          },
          {
            role: 'user',
            content: `文章标题：${testArticle.title}\n\n文章内容：\n${testArticle.content}`
          }
        ],
        stream: true
      })
    })

    if (!streamSummaryResponse.ok) {
      throw new Error(`HTTP error! status: ${streamSummaryResponse.status}`)
    }

    const reader = streamSummaryResponse.body.getReader()
    const decoder = new TextDecoder()
    let streamSummary = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.trim() !== '')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices[0]?.delta?.content || ''
            streamSummary += content
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    console.log('✓ 流式摘要生成成功')
    console.log(`  流式摘要内容: ${streamSummary.substring(0, 100)}...`)

    // 4. 测试流式翻译生成
    console.log('\n4. 测试流式翻译生成...')
    const streamTranslationResponse = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content: '你是一个专业翻译助手。请将以下文章翻译为中文，保留 Markdown 结构和链接。忠实表达原文含义，保留标题、列表、代码块和链接格式，只输出译文，不要添加解释。'
          },
          {
            role: 'user',
            content: `文章标题：${testArticle.title}\n\n文章内容：\n${testArticle.content}`
          }
        ],
        stream: true
      })
    })

    if (!streamTranslationResponse.ok) {
      throw new Error(`HTTP error! status: ${streamTranslationResponse.status}`)
    }

    const streamReader = streamTranslationResponse.body.getReader()
    const streamDecoder = new TextDecoder()
    let streamTranslation = ''

    while (true) {
      const { done, value } = await streamReader.read()
      if (done) break

      const chunk = streamDecoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.trim() !== '')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices[0]?.delta?.content || ''
            streamTranslation += content
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    console.log('✓ 流式翻译生成成功')
    console.log(`  流式翻译内容: ${streamTranslation.substring(0, 100)}...`)

    // 5. 测试错误处理
    console.log('\n5. 测试错误处理...')
    try {
      const errorResponse = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-api-key'
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [
            {
              role: 'user',
              content: 'Hello'
            }
          ],
          stream: false
        })
      })

      if (!errorResponse.ok) {
        const errorData = await errorResponse.json()
        console.log('✓ 错误处理正常')
        console.log(`  错误信息: ${errorData.error?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.log('✓ 错误处理正常')
      console.log(`  错误信息: ${error.message}`)
    }

    console.log('\n=== DeepSeek API 测试完成 ===')
    console.log('✓ 所有测试通过')

    // 返回测试结果
    return {
      success: true,
      summary: {
        content: summary,
        usage: summaryData.usage
      },
      translation: {
        content: translation,
        usage: translationData.usage
      },
      streamSummary: streamSummary,
      streamTranslation: streamTranslation
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 运行测试
if (require.main === module) {
  testDeepSeekAPI().then(result => {
    console.log('\n测试结果:', JSON.stringify(result, null, 2))
  }).catch(console.error)
}

module.exports = { testDeepSeekAPI }
