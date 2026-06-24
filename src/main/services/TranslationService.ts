import { randomUUID } from 'crypto'
import { Repository } from '../database/repository'
import { TranslationAgent } from '../llm/agents'
import { LLMConfig } from '../types'
import { ITranslationService } from './interfaces'

export interface TranslationSegment {
  index: number
  source: string
  translated: string
  status: 'success' | 'failed'
  error?: string
}

export type TranslationProgress = (segment: TranslationSegment, total: number) => void

export class TranslationService implements ITranslationService {
  constructor(
    private readonly repository: Repository,
    private readonly getConfig: () => Promise<LLMConfig> | LLMConfig
  ) {}

  async translate(
    articleId: string,
    targetLang: string,
    onProgress?: TranslationProgress
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

    const segments = markdown
      .split(/\n\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
    const startedAt = Date.now()
    const runId = randomUUID()
    const config = await this.getConfig()
    const agent = new TranslationAgent(config)
    const results: TranslationSegment[] = []
    let promptTokens = 0
    let completionTokens = 0

    for (let i = 0; i < segments.length; i++) {
      const source = segments[i]
      let seg: TranslationSegment = { index: i, source, translated: source, status: 'failed' }
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const resp = await agent.translateSegment(source, normalizedTargetLang, content.title)
          if (resp.usage) {
            promptTokens += resp.usage.promptTokens
            completionTokens += resp.usage.completionTokens
          }
          seg = { index: i, source, translated: resp.content, status: 'success' }
          break
        } catch (err) {
          seg = {
            index: i,
            source,
            translated: source,
            status: 'failed',
            error: err instanceof Error ? err.message : String(err)
          }
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)))
          }
        }
      }
      results.push(seg)
      onProgress?.(seg, segments.length)
    }

    const combined = results.map((r) => `${r.source}\n\n${r.translated}`).join('\n\n')
    this.repository.createAgentRun({
      id: runId,
      entryId: articleId,
      agentType: 'translation',
      inputText: markdown,
      outputText: combined,
      status: 'completed',
      startedAt,
      completedAt: Date.now()
    })
    if (promptTokens || completionTokens) {
      this.repository.createLLMUsage({
        id: randomUUID(),
        agentRunId: runId,
        model: config.model,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        createdAt: Date.now()
      })
    }
    return combined
  }
}
