import { randomUUID } from 'crypto'
import { Repository } from '../database/repository'
import { SummaryAgent } from '../llm/agents'
import { LLMConfig } from '../types'
import { ISummaryService } from './interfaces'

export class SummaryService implements ISummaryService {
  private static readonly MAX_RETRIES = 3

  constructor(
    private readonly repository: Repository,
    private readonly getConfig: () => Promise<LLMConfig> | LLMConfig
  ) {}

  async summarize(
    articleId: string,
    onProgress?: (data: { type: string; attempt: number; maxAttempts: number; error?: string }) => void
  ): Promise<string> {
    if (!articleId.trim()) {
      throw new Error('Article ID cannot be empty')
    }

    const content = this.repository.getArticleContent(articleId)
    if (!content) {
      throw new Error(`Article not found: ${articleId}`)
    }

    const markdown = content.cleanedMarkdown || content.rawHtml
    if (!markdown || !markdown.trim()) {
      throw new Error('文章内容为空，请先打开文章抓取正文')
    }

    let lastError: Error | null = null
    for (let attempt = 1; attempt <= SummaryService.MAX_RETRIES; attempt++) {
      const startedAt = Date.now()
      const runId = randomUUID()
      try {
        if (attempt > 1) {
          onProgress?.({ type: 'summary', attempt, maxAttempts: SummaryService.MAX_RETRIES })
        }
        const config = await this.getConfig()
        const agent = new SummaryAgent(config)
        const response = await agent.summarizeWithUsage(markdown, { title: content.title })
        const summary = response.content
        this.repository.createAgentRun({
          id: runId,
          entryId: articleId,
          agentType: 'summary',
          inputText: markdown,
          outputText: summary,
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
        return summary
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        this.repository.createAgentRun({
          id: runId,
          entryId: articleId,
          agentType: 'summary',
          inputText: markdown,
          outputText: '',
          status: 'failed',
          errorMessage: `Attempt ${attempt}/${SummaryService.MAX_RETRIES}: ${lastError.message}`,
          startedAt,
          completedAt: Date.now()
        })
        if (attempt < SummaryService.MAX_RETRIES) {
          onProgress?.({
            type: 'summary',
            attempt,
            maxAttempts: SummaryService.MAX_RETRIES,
            error: lastError.message
          })
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }
    throw lastError || new Error('Summary generation failed after all retries')
  }

  async summarizeStream(
    articleId: string,
    onProgress?: (data: { type: string; attempt: number; maxAttempts: number; error?: string }) => void,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    if (!articleId.trim()) {
      throw new Error('Article ID cannot be empty')
    }

    const content = this.repository.getArticleContent(articleId)
    if (!content) {
      throw new Error(`Article not found: ${articleId}`)
    }

    const markdown = content.cleanedMarkdown || content.rawHtml
    if (!markdown || !markdown.trim()) {
      throw new Error('文章内容为空，请先打开文章抓取正文')
    }

    let lastError: Error | null = null
    for (let attempt = 1; attempt <= SummaryService.MAX_RETRIES; attempt++) {
      const startedAt = Date.now()
      const runId = randomUUID()
      try {
        if (attempt > 1) {
          onProgress?.({ type: 'summary', attempt, maxAttempts: SummaryService.MAX_RETRIES })
        }
        const config = await this.getConfig()
        const agent = new SummaryAgent(config)
        let summary = ''
        for await (const chunk of agent.summarizeStream(markdown, { title: content.title })) {
          summary += chunk
          onChunk?.(chunk)
        }
        this.repository.createAgentRun({
          id: runId,
          entryId: articleId,
          agentType: 'summary',
          inputText: markdown,
          outputText: summary,
          status: 'completed',
          startedAt,
          completedAt: Date.now()
        })
        return summary
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        this.repository.createAgentRun({
          id: runId,
          entryId: articleId,
          agentType: 'summary',
          inputText: markdown,
          outputText: '',
          status: 'failed',
          errorMessage: `Attempt ${attempt}/${SummaryService.MAX_RETRIES}: ${lastError.message}`,
          startedAt,
          completedAt: Date.now()
        })
        if (attempt < SummaryService.MAX_RETRIES) {
          onProgress?.({
            type: 'summary',
            attempt,
            maxAttempts: SummaryService.MAX_RETRIES,
            error: lastError.message
          })
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }
    throw lastError || new Error('Summary generation failed after all retries')
  }
}
