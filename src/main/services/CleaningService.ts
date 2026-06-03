import sanitizeHtml from 'sanitize-html'
import TurndownService from 'turndown'
import { Repository } from '../database/repository'
import { ICleaningService } from './interfaces'

type FetchText = (url: string) => Promise<string>

const DEFAULT_USER_AGENT = 'Mercury/1.0 RSS Reader'

/**
 * 内容清洗服务
 * 负责正文抓取、HTML 清洗、Markdown 转换
 *
 * 注意：当前实现是简化版本，只做基础 HTML 清洗
 * 完整版本需要使用 @mozilla/readability + jsdom 提取正文
 */
export class CleaningService implements ICleaningService {
  private readonly turndownService: TurndownService

  constructor(
    private readonly repository: Repository,
    private readonly fetchText: FetchText = defaultFetchText
  ) {
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    })
  }

  async cleanArticle(
    articleId: string,
    url: string
  ): Promise<{
    cleanedHtml: string
    cleanedMarkdown: string
    title?: string
    author?: string
  }> {
    // 获取原始 HTML
    let rawHtml = this.repository.getArticleContent(articleId)?.rawHtml
    if (!rawHtml) {
      rawHtml = await this.fetchText(url)
      this.repository.upsertEntryContent({
        entryId: articleId,
        rawHtml,
        cleanedHtml: null,
        cleanedMarkdown: null,
        fetchedAt: Date.now()
      })
    }

    // 清洗 HTML
    const cleanedHtml = this.cleanHtml(rawHtml)

    // 转换为 Markdown
    const cleanedMarkdown = this.convertToMarkdown(cleanedHtml)

    // 保存清洗后的内容
  this.repository.upsertEntryContent({
      entryId: articleId,
      rawHtml,
      cleanedHtml,
      cleanedMarkdown,
      fetchedAt: Date.now()
    })

    return {
      cleanedHtml,
      cleanedMarkdown
    }
  }

  /**
   * 清洗 HTML 内容
   * 保留有用的标签，移除不安全和干扰内容
   */
  private cleanHtml(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: [
        'p',
        'br',
        'div',
        'span',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
      'a',
        'strong',
        'em',
        'code',
        'pre',
        'blockquote',
        'img',
        'table',
     'thead',
        'tbody',
        'tr',
        'th',
        'td'
      ],
      allowedAttributes: {
        a: ['href', 'title', 'target'],
        img: ['src', 'alt', 'title', 'width', 'height'],
        code: ['class'],
        pre: ['class']
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      transformTags: {
        a: (_tagName: string, attribs: Record<string, string>) => {
          return {
            tagName: 'a',
            attribs: {
              ...attribs,
              target: '_blank',
            rel: 'noopener noreferrer'
            }
          }
        }
      }
    })
  }

  /**
   * 将 HTML 转换为 Markdown
   */
  private convertToMarkdown(html: string): string {
    return this.turndownService.turndown(html)
  }
}

async function defaultFetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  return response.text()
}
