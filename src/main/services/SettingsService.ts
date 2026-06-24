import { Repository } from '../database/repository'
import { OpenAICompatibleProvider } from '../llm/provider'
import { LLMConfig } from '../types'
import { ISettingsService } from './interfaces'

/**
 * 设置服务
 * 负责应用设置、LLM 配置管理
 */
export class SettingsService implements ISettingsService {
  constructor(private readonly repository: Repository) {}

  async getLLMConfig(): Promise<LLMConfig> {
    const baseUrl = this.repository.getSetting('llm.baseUrl') ?? 'https://api.openai.com/v1'
    const apiKey = this.repository.getSetting('llm.apiKey') ?? ''
    const model = this.repository.getSetting('llm.model') ?? 'gpt-3.5-turbo'

    return {
      baseUrl,
      apiKey,
      model
    }
  }

  async saveLLMConfig(config: LLMConfig): Promise<void> {
    if (config.baseUrl !== undefined) {
      this.repository.setSetting('llm.baseUrl', config.baseUrl)
    }
    if (config.apiKey !== undefined) {
   this.repository.setSetting('llm.apiKey', config.apiKey)
    }
    if (config.model !== undefined) {
      this.repository.setSetting('llm.model', config.model)
    }
  }

  async getSetting(key: string): Promise<string | null> {
  return this.repository.getSetting(key)
  }

  async saveSetting(key: string, value: string): Promise<void> {
    this.repository.setSetting(key, value)
  }

  async getLLMUsageStats(): Promise<{
    totalCalls: number
    totalTokens: number
    summaryCalls: number
    translationCalls: number
    byModel: Array<{ model: string; calls: number; tokens: number }>
  }> {
    return this.repository.getLLMUsageStats()
  }

  async fetchModels(): Promise<string[]> {
    const config = await this.getLLMConfig()
    if (!config.apiKey) {
      throw new Error('请先填写 API Key')
    }
    return OpenAICompatibleProvider.listModels({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    })
  }

  async getAgentRunHistory(limit: number = 50): Promise<Array<{
    id: string
    entryId: string
    entryTitle: string
    agentType: string
    status: string
    errorMessage: string | null
    startedAt: number
    completedAt: number | null
    duration: number | null
  }>> {
    return this.repository.getAgentRunHistory(limit)
  }
}
