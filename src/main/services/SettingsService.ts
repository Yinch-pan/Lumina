import { Repository } from '../database/repository'
import { LLMConfig } from '../types'
import { encryptSecret, decryptSecret } from '../security/secureStore'
import { ISettingsService } from './interfaces'

/**
 * 设置服务
 * 负责应用设置、LLM 配置管理
 */
export class SettingsService implements ISettingsService {
  constructor(private readonly repository: Repository) {}

  async getLLMConfig(): Promise<LLMConfig> {
    const baseUrl = this.repository.getSetting('llm.baseUrl') ?? 'https://api.openai.com/v1'
    const apiKey = decryptSecret(this.repository.getSetting('llm.apiKey') ?? '')
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
      this.repository.setSetting('llm.apiKey', encryptSecret(config.apiKey))
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

  async getUsageStats(): Promise<Array<{ model: string; agentType: string; day: string; requests: number; totalTokens: number }>> {
    return this.repository.getUsageStats()
  }
}
