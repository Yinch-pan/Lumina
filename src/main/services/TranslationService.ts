import { randomUUID } from 'crypto'
import { Repository } from '../database/repository'
import { TranslationAgent } from '../llm/agents'
import { LLMConfig } from '../types'
import { ITranslationService } from './interfaces'

export class TranslationService implements ITranslationService {
  constructor(
    private readonly repository: Repository,
    private readonly getConfig: () => Promise<LLMConfig> | LLMConfig
  ) {}

  async translate(articleId: string, targetLang: string): Promise<string> {
    if (!articleId.trim()) {
      throw new Error('Article ID cannot be empty')
    }
    const normalizedTargetLang = targetLang.trim() || '中文'
    const content = this.repository.getArticleContent(articleId)
    if (!content) {
      throw new Error(`Article not found: ${articleId}`)
    }

    const markdown = content.cleanedMarkdown || content.rawHtml
    if (!markdown || !markdown.trim()) {
      throw new Error('文章内容为空，请先打开文章抓取正文')
    }

    const startedAt = Date.now()
    const runId = randomUUID()
    try {
      const config = await this.getConfig()
      const agent = new TranslationAgent(config)
      const response = await agent.translateWithUsage(markdown, normalizedTargetLang, { title: content.title })
      const translation = response.content
      this.repository.createAgentRun({
        id: runId,
        entryId: articleId,
        agentType: 'translation',
        inputText: markdown,
        outputText: translation,
        status: 'completed',
        startedAt,
        completedAt: Date.now()
      })
      if (response.usage) {
        this.repository.createLLMUsage({
          id: randomUUID(),
          agentRunId: runId,
          model: config.model,
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.promptTokens + response.usage.completionTokens,
          createdAt: Date.now()
        })
      }
      return translation
    } catch (error) {
      this.repository.createAgentRun({
        id: runId,
        entryId: articleId,
        agentType: 'translation',
        inputText: markdown,
        outputText: '',
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
        startedAt,
        completedAt: Date.now()
      })
      throw error
    }
  }
}
