/**
 * AI Agents
 * 封装基于 LLMProvider 的智能代理，如摘要、翻译等
 */

import type { LLMProvider, LLMResponse, Message, ChatOptions } from './provider'
import type { LLMProviderConfig } from './config'
import { renderPrompt, SummaryPromptTemplate, TranslationPromptTemplate } from './config'
import { OpenAICompatibleProvider } from './provider'

/**
 * 摘要生成选项
 */
export interface SummaryOptions {
  /** 文章标题，用于 Prompt 模板中的 {title} 变量 */
  title?: string
  /** 生成温度，0-2 之间 */
  temperature?: number
  /** 最大生成 token 数 */
  maxTokens?: number
}

/**
 * 摘要代理
 * 基于 LLMProvider 实现文章摘要生成
 */
export class SummaryAgent {
  private provider: LLMProvider

  /**
   * 创建 SummaryAgent 实例
   * @param config LLM 配置（baseUrl / apiKey / model）
   * @param provider 可选的 LLMProvider 实例（用于 mock 测试），
   *                 若未提供则自动创建 OpenAICompatibleProvider
   */
  constructor(config: LLMProviderConfig, provider?: LLMProvider) {
    if (provider) {
      this.provider = provider
    } else {
      this.provider = new OpenAICompatibleProvider(config)
    }
  }

  /**
   * 非流式摘要生成
   * @param markdown 文章的 Markdown 内容
   * @param options 可选的摘要选项
   * @returns 摘要字符串
   */
  async summarize(markdown: string, options?: SummaryOptions): Promise<string> {
    const response = await this.summarizeWithUsage(markdown, options)
    return response.content
  }

  /**
   * 非流式摘要生成（含用量信息）
   * @param markdown 文章的 Markdown 内容
   * @param options 可选的摘要选项
   * @returns LLMResponse，含 content 和 usage
   * @throws Error 当 markdown 为空时抛出 "Markdown content cannot be empty"
   * @throws Error 当模板渲染或 API 调用失败时重新抛出
   */
  async summarizeWithUsage(markdown: string, options?: SummaryOptions): Promise<LLMResponse> {
    if (!markdown || markdown.trim() === '') {
      throw new Error('Markdown content cannot be empty')
    }

    let prompt: string
    try {
      prompt = renderPrompt(SummaryPromptTemplate, {
        title: options?.title ?? 'Untitled',
        content: markdown,
      })
    } catch (err) {
      throw new Error(`Failed to render summary prompt: ${err instanceof Error ? err.message : String(err)}`)
    }

    const messages: Message[] = [{ role: 'user', content: prompt }]

    const chatOptions: ChatOptions = {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    }

    try {
      return await this.provider.chat(messages, chatOptions)
    } catch (err) {
      throw new Error(`Summary generation failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  /**
   * 流式摘要生成
   * @param markdown 文章的 Markdown 内容
   * @param options 可选的摘要选项
   * @returns 异步迭代器，逐块返回摘要文本
   */
  async *summarizeStream(markdown: string, options?: SummaryOptions): AsyncIterable<string> {
    if (!markdown || markdown.trim() === '') {
      throw new Error('Markdown content cannot be empty')
    }

    let prompt: string
    try {
      prompt = renderPrompt(SummaryPromptTemplate, {
        title: options?.title ?? 'Untitled',
        content: markdown,
      })
    } catch (err) {
      throw new Error(`Failed to render summary prompt: ${err instanceof Error ? err.message : String(err)}`)
    }

    const messages: Message[] = [{ role: 'user', content: prompt }]

    const chatOptions: ChatOptions = {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    }

    yield* this.provider.streamChat(messages, chatOptions)
  }
}

export interface TranslationOptions {
  title?: string
  temperature?: number
  maxTokens?: number
}

export class TranslationAgent {
  private provider: LLMProvider

  constructor(config: LLMProviderConfig, provider?: LLMProvider) {
    this.provider = provider ?? new OpenAICompatibleProvider(config)
  }

  async translate(markdown: string, targetLang: string, options?: TranslationOptions): Promise<string> {
    const response = await this.translateWithUsage(markdown, targetLang, options)
    return response.content
  }

  async translateWithUsage(markdown: string, targetLang: string, options?: TranslationOptions): Promise<LLMResponse> {
    if (!markdown || markdown.trim() === '') {
      throw new Error('Markdown content cannot be empty')
    }

    const prompt = renderPrompt(TranslationPromptTemplate, {
      title: options?.title ?? 'Untitled',
      targetLang,
      content: markdown
    })
    const messages: Message[] = [{ role: 'user', content: prompt }]
    const chatOptions: ChatOptions = {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens
    }
    return await this.provider.chat(messages, chatOptions)
  }

  async *translateStream(markdown: string, targetLang: string, options?: TranslationOptions): AsyncIterable<string> {
    if (!markdown || markdown.trim() === '') {
      throw new Error('Markdown content cannot be empty')
    }

    const prompt = renderPrompt(TranslationPromptTemplate, {
      title: options?.title ?? 'Untitled',
      targetLang,
      content: markdown
    })
    const messages: Message[] = [{ role: 'user', content: prompt }]
    const chatOptions: ChatOptions = {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens
    }
    yield* this.provider.streamChat(messages, chatOptions)
  }
}
