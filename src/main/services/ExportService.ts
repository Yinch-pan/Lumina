import { IExportService } from './interfaces'
import * as repo from '../database/repository'
import fs from 'fs'
import path from 'path'

export class ExportService implements IExportService {
  async exportArticle(articleId: string, filePath: string): Promise<void> {
    const entry = repo.selectEntryById(articleId)
    if (!entry) throw new Error(`文章 ${articleId} 不存在`)

    const md = this.buildMarkdown(entry)
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, md, 'utf-8')
  }

  async exportArticles(articleIds: string[], dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    for (const id of articleIds) {
      const entry = repo.selectEntryById(id)
      if (!entry) continue

      const safeName = entry.title.replace(/[<>:"/\\|?*]/g, '_').slice(0, 80)
      const filePath = path.join(dirPath, `${safeName}.md`)
      const md = this.buildMarkdown(entry)
      fs.writeFileSync(filePath, md, 'utf-8')
    }
  }

  private buildMarkdown(entry: {
    title: string
    author?: string
    publishedAt: string
    url: string
    cleanedMarkdown?: string
    cleanedHtml?: string
    summary?: string
    translation?: string
    tags: string[]
  }): string {
    const lines: string[] = []

    // 标题
    lines.push(`# ${entry.title}`)
    lines.push('')

    // 元信息
    const meta: string[] = []
    if (entry.author) meta.push(`**作者**: ${entry.author}`)
    if (entry.publishedAt) meta.push(`**发布日期**: ${entry.publishedAt}`)
    if (entry.url) meta.push(`**原文链接**: [${entry.url}](${entry.url})`)
    if (entry.tags.length > 0) meta.push(`**标签**: ${entry.tags.join(', ')}`)
    if (meta.length > 0) {
      lines.push(...meta)
      lines.push('')
    }

    lines.push('---')
    lines.push('')

    // AI 摘要
    if (entry.summary) {
      lines.push('## 📝 AI 摘要')
      lines.push('')
      lines.push(entry.summary)
      lines.push('')
    }

    // AI 翻译
    if (entry.translation) {
      lines.push('## 🌐 AI 翻译')
      lines.push('')
      lines.push(entry.translation)
      lines.push('')
    }

    // 正文
    lines.push('## 正文')
    lines.push('')
    if (entry.cleanedMarkdown) {
      lines.push(entry.cleanedMarkdown)
    } else if (entry.cleanedHtml) {
      lines.push(entry.cleanedHtml)
    } else {
      lines.push('*（正文内容暂无）*')
    }
    lines.push('')

    // 页脚
    lines.push('---')
    lines.push(`*导出于 ${new Date().toLocaleString('zh-CN')} by Mercury*`)

    return lines.join('\n')
  }
}
