import { randomUUID } from 'crypto'
import { Repository } from '../database/repository'
import { TranslationAgent } from '../llm/agents'
import { LLMConfig } from '../types'
import { ITranslationService } from './interfaces'

export class TranslationService implements ITranslationService {
  private static readonly MAX_RETRIES = 3

  constructor(
    private readonly repository: Repository,
    private readonly getConfig: () => Promise<LLMConfig> | LLMConfig
  ) {}

  async translate(
    articleId: string,
    targetLang: string,
    onProgress?: (data: { type: string; attempt: number; maxAttempts: number; error?: string }) => void
  ): Promise<string> {
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

    let lastError: Error | null = null
    for (let attempt = 1; attempt <= TranslationService.MAX_RETRIES; attempt++) {
      const startedAt = Date.now()
      const runId = randomUUID()
      try {
        if (attempt > 1) {
          onProgress?.({ type: 'translation', attempt, maxAttempts: TranslationService.MAX_RETRIES })
        }
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
        lastError = error instanceof Error ? error : new Error(String(error))
        this.repository.createAgentRun({
          id: runId,
          entryId: articleId,
          agentType: 'translation',
          inputText: markdown,
          outputText: '',
          status: 'failed',
          errorMessage: `Attempt ${attempt}/${TranslationService.MAX_RETRIES}: ${lastError.message}`,
          startedAt,
          completedAt: Date.now()
        })
        if (attempt < TranslationService.MAX_RETRIES) {
          onProgress?.({
            type: 'translation',
            attempt,
            maxAttempts: TranslationService.MAX_RETRIES,
            error: lastError.message
          })
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }
    throw lastError || new Error('Translation failed after all retries')
  }

  async translateStream(
    articleId: string,
    targetLang: string,
    onProgress?: (data: { type: string; attempt: number; maxAttempts: number; error?: string }) => void,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
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

    let lastError: Error | null = null
    for (let attempt = 1; attempt <= TranslationService.MAX_RETRIES; attempt++) {
      const startedAt = Date.now()
      const runId = randomUUID()
      try {
        if (attempt > 1) {
          onProgress?.({ type: 'translation', attempt, maxAttempts: TranslationService.MAX_RETRIES })
        }
        const config = await this.getConfig()
        const agent = new TranslationAgent(config)
        let translation = ''
        for await (const chunk of agent.translateStream(markdown, normalizedTargetLang, { title: content.title })) {
          translation += chunk
          onChunk?.(chunk)
        }
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
        return translation
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        this.repository.createAgentRun({
          id: runId,
          entryId: articleId,
          agentType: 'translation',
          inputText: markdown,
          outputText: '',
          status: 'failed',
          errorMessage: `Attempt ${attempt}/${TranslationService.MAX_RETRIES}: ${lastError.message}`,
          startedAt,
          completedAt: Date.now()
        })
        if (attempt < TranslationService.MAX_RETRIES) {
          onProgress?.({
            type: 'translation',
            attempt,
            maxAttempts: TranslationService.MAX_RETRIES,
            error: lastError.message
          })
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }
    throw lastError || new Error('Translation failed after all retries')
  }
}
