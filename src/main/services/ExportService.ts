import { promises as fs } from 'fs'
import * as path from 'path'
import { Repository } from '../database/repository'
import { ArticleContent } from '../types'
import { IArticleService, IExportService } from './interfaces'

/**
 * 导出服务
 * 负责 Markdown 导出功能
 */
export class ExportService implements IExportService {
  constructor(
    private readonly repository: Repository,
    private readonly articleService: IArticleService
  ) {}

  async exportArticle(articleId: string, filePath: string): Promise<void> {
    // 获取文章完整内容
    const content = await this.articleService.getArticleContent(articleId)

    // 生成 Markdown 内容
    const markdown = this.generateMarkdown(content)

    // 写入文件
    await fs.writeFile(filePath, markdown, 'utf-8')
  }

  async exportArticles(articleIds: string[], dirPath: string): Promise<void> {
    // 确保目录存在
    await fs.mkdir(dirPath, { recursive: true })

    // 批量导出
    const promises = articleIds.map(async (articleId) => {
      const content = await this.articleService.getArticleContent(articleId)
      const filename = this.sanitizeFilename(content.title) + '.md'
      const filePath = path.join(dirPath, filename)
      const markdown = this.generateMarkdown(content)
      await fs.writeFile(filePath, markdown, 'utf-8')
    })

    await Promise.all(promises)
  }

  /**
   * 生成 Markdown 内容
   */
  private generateMarkdown(content: ArticleContent): string {
    const lines: string[] = []

    // 标题
    lines.push(`# ${content.title}`)
    lines.push('')

    // 元信息
    if (content.author) {
   lines.push(`**作者**: ${content.author}`)
    }
    lines.push(`**发布时间**: ${content.publishedAt}`)
    lines.push(`**原文链接**: ${content.sourceUrl}`)

    // 标签
    if (content.tags && content.tags.length > 0) {
      lines.push(`**标签**: ${content.tags.join(', ')}`)
    }

    lines.push('')
    lines.push('---')
    lines.push('')

    // AI 摘要
    if (content.summary) {
      lines.push('## 📝 AI 摘要')
      lines.push('')
      lines.push(content.summary)
      lines.push('')
      lines.push('---')
      lines.push('')
    }

    // AI 翻译
    if (content.translation) {
      lines.push('## 🌐 AI 翻译')
      lines.push('')
      lines.push(content.translation)
      lines.push('')
      lines.push('---')
      lines.push('')
    }

    // 正文（优先使用 cleanedMarkdown，否则使用 cleanedHtml）
    lines.push('## 正文')
    lines.push('')

    if (content.cleanedMarkdown) {
   lines.push(content.cleanedMarkdown)
    } else if (content.cleanedHtml) {
      // 如果只有 HTML，添加提示
      lines.push('> 注意：以下内容为 HTML 格式，建议使用支持 HTML 的 Markdown 阅读器查看')
      lines.push('')
      lines.push(content.cleanedHtml)
    } else {
      lines.push('*（无正文内容）*')
    }

    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push(`*导出自 Lumina RSS 阅读器*`)

  return lines.join('\n')
  }

  /**
   * 清理文件名中的非法字符
   */
  private sanitizeFilename(filename: string): string {
    // 移除或替换非法字符
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Windows 非法字符
      .replace(/\s+/g, '_') // 空格替换为下划线
      .replace(/_{2,}/g, '_') // 多个下划线合并为一个
   .substring(0, 200) // 限制长度
      .trim()
  }
}
