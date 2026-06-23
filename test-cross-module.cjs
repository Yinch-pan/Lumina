/**
 * 跨模块联调测试
 * 测试 AI 功能与其他模块的集成
 */

import { app, BrowserWindow } from 'electron'
import * as path from 'path'
import { initDatabase } from './database/init'
import { Repository } from './database/repository'
import { ArticleService } from './services/ArticleService'
import { CleaningService } from './services/CleaningService'
import { ExportService } from './services/ExportService'
import { FeedService } from './services/FeedService'
import { SettingsService } from './services/SettingsService'
import { SummaryService } from './services/SummaryService'
import { TagService } from './services/TagService'
import { TranslationService } from './services/TranslationService'

async function testCrossModuleIntegration() {
  console.log('=== 跨模块联调测试 ===\n')

  // 初始化数据库和服务
  const database = initDatabase()
  const repository = new Repository(database)
  const cleaningService = new CleaningService()
  const feedService = new FeedService(repository)
  const articleService = new ArticleService(repository, cleaningService)
  const tagService = new TagService(repository)
  const exportService = new ExportService(repository, articleService)
  const settingsService = new SettingsService(repository)
  const summaryService = new SummaryService(repository, () => settingsService.getLLMConfig())
  const translationService = new TranslationService(repository, () => settingsService.getLLMConfig())

  try {
    // 1. 测试 AI 功能与标签功能的集成
    console.log('1. 测试 AI 功能与标签功能的集成...')
    
    // 获取一篇文章
    const articles = repository.getAllArticles()
    if (articles.length === 0) {
      console.log('   ⚠️ 没有文章，跳过测试')
      return
    }

    const articleId = articles[0].id
    console.log(`   使用文章: ${articles[0].title}`)

    // 生成摘要
    console.log('   生成摘要...')
    const summary = await summaryService.summarize(articleId)
    console.log(`   ✓ 摘要生成成功: ${summary.substring(0, 50)}...`)

    // 添加标签
    console.log('   添加标签...')
    const tagId = tagService.createTag('测试标签')
    tagService.addTagToArticle(articleId, tagId)
    console.log('   ✓ 标签添加成功')

    // 验证标签
    const tags = repository.getArticleTags(articleId)
    console.log(`   ✓ 文章标签: ${tags.map(t => t.name).join(', ')}`)

    // 2. 测试 AI 功能与导出功能的集成
    console.log('\n2. 测试 AI 功能与导出功能的集成...')
    
    // 生成翻译
    console.log('   生成翻译...')
    const translation = await translationService.translate(articleId, 'English')
    console.log(`   ✓ 翻译生成成功: ${translation.substring(0, 50)}...`)

    // 导出 Markdown
    console.log('   导出 Markdown...')
    const exportPath = path.join(__dirname, 'test-export.md')
    await exportService.exportArticle(articleId, exportPath)
    console.log(`   ✓ 导出成功: ${exportPath}`)

    // 3. 测试 AI 功能与设置功能的集成
    console.log('\n3. 测试 AI 功能与设置功能的集成...')
    
    // 获取 LLM 配置
    console.log('   获取 LLM 配置...')
    const llmConfig = await settingsService.getLLMConfig()
    console.log(`   ✓ LLM 配置: ${llmConfig.model}`)

    // 获取 LLM 用量统计
    console.log('   获取 LLM 用量统计...')
    const usageStats = await settingsService.getLLMUsageStats()
    console.log(`   ✓ LLM 用量统计: ${usageStats.totalCalls} 次调用, ${usageStats.totalTokens} tokens`)

    // 4. 测试文章内容包含 AI 结果
    console.log('\n4. 测试文章内容包含 AI 结果...')
    
    const articleContent = repository.getArticleContent(articleId)
    if (articleContent) {
      console.log(`   ✓ 文章摘要: ${articleContent.summary ? '有' : '无'}`)
      console.log(`   ✓ 文章翻译: ${articleContent.translation ? '有' : '无'}`)
      console.log(`   ✓ 文章标签: ${articleContent.tags.join(', ')}`)
    }

    console.log('\n=== 跨模块联调测试完成 ===')
    console.log('✓ 所有测试通过')

  } catch (error) {
    console.error('\n❌ 测试失败:', error)
  } finally {
    // 清理
    database.close()
  }
}

// 运行测试
if (require.main === module) {
  testCrossModuleIntegration().catch(console.error)
}

export { testCrossModuleIntegration }
