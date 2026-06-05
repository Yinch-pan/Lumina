import * as fs from 'fs'
import * as path from 'path'

/**
 * LLM Provider 配置接口
 */
export interface LLMProviderConfig {
  baseUrl: string
  apiKey: string
  model: string
}

/**
 * 默认摘要 Prompt 模板
 * 使用 {variable} 格式进行变量替换
 */
export const SummaryPromptTemplate = `你是一个专业的文章摘要助手。请对以下文章内容生成简洁、准确的中文摘要。

文章标题：{title}
文章内容：
{content}

要求：
1. 摘要应包含文章的核心观点和关键信息
2. 长度控制在 200 字以内
3. 使用客观、简洁的语言`

export const TranslationPromptTemplate = `你是一位专业的翻译专家。请将以下文章翻译为{targetLang}。

文章标题：{title}
文章内容：
{content}

要求：
1. 保持原文的格式和结构
2. 翻译准确、流畅、自然
3. 专业术语使用常见译法
4. 保留原文的段落和列表格式`

/**
 * 验证 LLM 配置的完整性
 * @param config 待验证的配置对象
 * @throws Error 当 apiKey 为空时抛出错误
 */
export function validateConfig(config: LLMProviderConfig): void {
  if (!config.apiKey || config.apiKey.trim() === '') {
    throw new Error('LLM API key is not configured. Please set your API key in Settings.')
  }
  if (!config.baseUrl || config.baseUrl.trim() === '') {
    throw new Error('LLM base URL is not configured.')
  }
  if (!config.model || config.model.trim() === '') {
    throw new Error('LLM model is not configured.')
  }
}

/**
 * 渲染 Prompt 模板，将 {variable} 替换为实际值
 * @param template 包含 {variable} 占位符的模板字符串
 * @param variables 键值对，key 为变量名（不含花括号），value 为替换值
 * @returns 渲染后的字符串
 */
export function renderPrompt(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}
