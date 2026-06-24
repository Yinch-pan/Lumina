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

/**
 * 摘要长度档位
 */
export type SummaryLength = 'short' | 'medium' | 'long'

/**
 * 三档摘要 Prompt 模板
 * 使用 {variable} 格式进行变量替换
 */
export const SummaryPromptTemplates: Record<SummaryLength, string> = {
  short: `你是一个专业的文章摘要助手。请对以下文章生成极简中文摘要。

文章标题：{title}
文章内容：
{content}

要求：
1. 用 2-3 句话概括核心观点
2. 长度控制在 80 字以内
3. 客观简洁`,
  medium: `你是一个专业的文章摘要助手。请对以下文章内容生成简洁、准确的中文摘要。

文章标题：{title}
文章内容：
{content}

要求：
1. 摘要应包含文章的核心观点和关键信息
2. 长度控制在 200 字以内
3. 使用客观、简洁的语言`,
  long: `你是一个专业的文章摘要助手。请对以下文章生成详细中文摘要。

文章标题：{title}
文章内容：
{content}

要求：
1. 分点梳理文章主旨、论据和结论
2. 长度 300-500 字
3. 保留关键细节，使用客观语言`,
}

/**
 * 各档位摘要的最大生成 token 数
 */
export const SummaryMaxTokens: Record<SummaryLength, number> = { short: 256, medium: 512, long: 1024 }

export const TranslationPromptTemplate = `你是一个专业翻译助手。请将以下文章翻译为{targetLang}，保留 Markdown 结构和链接。

文章标题：{title}
文章内容：
{content}

要求：
1. 忠实表达原文含义
2. 保留标题、列表、代码块和链接格式
3. 只输出译文，不要添加解释`

/**
 * 从 config.json 加载 LLM 配置
 * @deprecated Use configGetter pattern instead to avoid reading local secret files
 * @returns LLMProviderConfig 配置对象
 */
export function loadConfig(): LLMProviderConfig {
  const configPath = path.join(__dirname, 'config.json')
  const raw = fs.readFileSync(configPath, 'utf-8')
  const config = JSON.parse(raw) as LLMProviderConfig
  return config
}

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
