import { Repository } from '../database/repository'
import { TagSuggestionAgent } from '../llm/agents'
import { LLMConfig } from '../types'

export class TagSuggestionService {
  constructor(
    private readonly repository: Repository,
    private readonly getConfig: () => Promise<LLMConfig> | LLMConfig
  ) {}

  async suggestTags(articleId: string): Promise<string[]> {
    const content = this.repository.getArticleContent(articleId)
    if (!content) {
      throw new Error(`Article not found: ${articleId}`)
    }
    const markdown = content.cleanedMarkdown || content.rawHtml || content.title
    const existing = this.repository.getAllTags().map((t) => t.name)
    const config = await this.getConfig()
    const agent = new TagSuggestionAgent(config)
    return agent.suggest(markdown, content.title, existing)
  }
}
