/**
 * LLM Provider 抽象接口
 * 定义与大语言模型交互的统一接口
 */

import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { type LLMProviderConfig, validateConfig } from './config'

/** 消息角色 */
export type MessageRole = 'system' | 'user' | 'assistant'

/** 对话消息 */
export interface Message {
  role: MessageRole
  content: string
}

/** 调用选项 */
export interface ChatOptions {
  /** 生成温度，0-2 之间 */
  temperature?: number
  /** 最大生成 token 数 */
  maxTokens?: number
}

/** Token 用量统计 */
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
}

/** LLM 响应结果 */
export interface LLMResponse {
  /** 生成的文本内容 */
  content: string
  /** Token 用量（部分 provider 可能不返回） */
  usage?: TokenUsage
}

/**
 * LLM Provider 接口
 * 所有 LLM 提供者（OpenAI、ECNU 等）都应实现此接口
 */
export interface LLMProvider {
  /**
   * 非流式对话调用
   * @param messages 对话消息列表
   * @param options 可选调用参数
   * @returns 完整的响应结果
   */
  chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse>

  /**
   * 流式对话调用
   * @param messages 对话消息列表
   * @param options 可选调用参数
   * @returns 异步迭代器，逐块返回文本内容
   */
  streamChat(messages: Message[], options?: ChatOptions): AsyncIterable<string>
}

/**
 * OpenAI 兼容 API Provider
 * 支持 OpenAI、ECNU 等 OpenAI-compatible 接口
 */
export class OpenAICompatibleProvider implements LLMProvider {
  private client: OpenAI
  private model: string

  constructor(config: LLMProviderConfig) {
    validateConfig(config)
    this.model = config.model
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      timeout: 180_000,
    })
  }

  /**
   * 将内部 Message 格式转换为 OpenAI SDK 格式
   */
  private toOpenAIMessages(messages: Message[]): ChatCompletionMessageParam[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))
  }

  /**
   * 非流式对话调用
   */
  async chat(messages: Message[], options?: ChatOptions): Promise<LLMResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: this.toOpenAIMessages(messages),
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
      })

      const choice = response.choices[0]
      return {
        content: choice.message?.content ?? '',
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
            }
          : undefined,
      }
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * 流式对话调用
   */
  async *streamChat(
    messages: Message[],
    options?: ChatOptions,
  ): AsyncIterable<string> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: this.toOpenAIMessages(messages),
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        stream: true,
      })

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) {
          yield delta
        }
      }
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * 统一错误处理：将 OpenAI SDK 错误转换为有意义的 Error
   */
  private handleError(error: unknown): Error {
    if (error instanceof OpenAI.APIError) {
      const status = error.status
      if (status === 401 || status === 403) {
        return new Error(
          `LLM authentication failed (${status}): Invalid API key or insufficient permissions.`,
        )
      }
      if (status === 429) {
        return new Error('LLM rate limit exceeded. Please try again later.')
      }
      if (status && status >= 500) {
        return new Error(
          `LLM server error (${status}): The API is currently unavailable.`,
        )
      }
      return new Error(`LLM API error (${status}): ${error.message}`)
    }

    if (error instanceof Error) {
      // Network errors (ECONNREFUSED, ETIMEDOUT, etc.)
      if (
        'code' in error &&
        typeof (error as NodeJS.ErrnoException).code === 'string'
      ) {
        return new Error(
          `LLM network error (${(error as NodeJS.ErrnoException).code}): Unable to reach the API server.`,
        )
      }
      return new Error(`LLM error: ${error.message}`)
    }

    return new Error('LLM: An unknown error occurred.')
  }
}
