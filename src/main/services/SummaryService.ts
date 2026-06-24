import { randomUUID } from 'crypto'
import { Repository } from '../database/repository'
import { SummaryAgent } from '../llm/agents'
import { LLMConfig } from '../types'
import { ISummaryService } from './interfaces'

export class SummaryService implements ISummaryService {
  constructor(
    private readonly repository: Repository,
    private readonly getConfig: () => Promise<LLMConfig> | LLMConfig
  ) {}

  async summarize(articleId: string, length: 'short' | 'medium' | 'long' = 'medium'): Promise<string> {
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

    const startedAt = Date.now()
    const runId = randomUUID()
    try {
      const config = await this.getConfig()
      const agent = new SummaryAgent(config)
      const response = await agent.summarizeWithUsage(markdown, { title: content.title, length })
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
      this.repository.createAgentRun({
        id: runId,
        entryId: articleId,
        agentType: 'summary',
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
