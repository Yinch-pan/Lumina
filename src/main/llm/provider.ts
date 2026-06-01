/**
 * LLM Provider 抽象接口
 * 定义与大语言模型交互的统一接口
 */

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
