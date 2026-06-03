import { ISettingsService } from './interfaces'
import { LLMConfig } from '../types'
import * as repo from '../database/repository'

export class SettingsService implements ISettingsService {
  async getLLMConfig(): Promise<LLMConfig> {
    return repo.selectLLMConfig()
  }

  async saveLLMConfig(config: LLMConfig): Promise<void> {
    repo.saveLLMConfig(config)
  }

  async getSetting(key: string): Promise<string | null> {
    return repo.selectSetting(key)
  }

  async saveSetting(key: string, value: string): Promise<void> {
    repo.upsertSetting(key, value)
  }
}
