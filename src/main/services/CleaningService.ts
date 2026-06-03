import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import sanitizeHtml from 'sanitize-html'
import TurndownService from 'turndown'
import { CleanedContent } from '../types'
import { ICleaningService } from './interfaces'

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'article',
    'section',
    'header',
    'footer',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'blockquote',
    'pre',
    'code',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'figure',
    'figcaption',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'hr'
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    code: ['class'],
    pre: ['class'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan']
  },
  allowedSchemes: ['http', 'https', 'mailto', 'data'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' })
  }
}

export class CleaningService implements ICleaningService {
  private readonly turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-'
  })

  async clean(rawHtml: string, url: string): Promise<CleanedContent> {
    const html = rawHtml.trim()
    if (!html) {
      return this.buildFallback('', url)
    }

    try {
      const dom = new JSDOM(html, { url })
      const readable = new Readability(dom.window.document).parse()
      const readableHtml = readable?.content?.trim() || getBodyHtml(dom) || html
      const cleanedHtml = this.sanitize(readableHtml, url)
      const cleanedMarkdown = this.toMarkdown(cleanedHtml)

      return {
        cleanedHtml,
        cleanedMarkdown,
        title: readable?.title?.trim() || undefined,
        author: readable?.byline?.trim() || undefined
      }
    } catch {
      return this.buildFallback(html, url)
    }
  }

  private sanitize(html: string, url: string): string {
    const resolvedHtml = resolveRelativeUrls(html, url)
    const cleanedHtml = sanitizeHtml(resolvedHtml, SANITIZE_OPTIONS).trim()
    return cleanedHtml || this.buildFallback('', url).cleanedHtml
  }

  private toMarkdown(cleanedHtml: string): string {
    return this.turndown.turndown(cleanedHtml).trim()
  }

  private buildFallback(rawHtml: string, url: string): CleanedContent {
    const fallbackHtml = sanitizeHtml(getFallbackHtml(rawHtml, url), SANITIZE_OPTIONS).trim()
    return {
      cleanedHtml: fallbackHtml,
      cleanedMarkdown: this.toMarkdown(fallbackHtml)
    }
  }
}

function getBodyHtml(dom: JSDOM): string {
  return dom.window.document.body?.innerHTML?.trim() ?? ''
}

function resolveRelativeUrls(html: string, baseUrl: string): string {
  const dom = new JSDOM(`<body>${html}</body>`, { url: baseUrl })
  const document = dom.window.document

  for (const link of Array.from(document.querySelectorAll('a[href]'))) {
    link.setAttribute('href', new URL(link.getAttribute('href') ?? '', baseUrl).toString())
  }

  for (const image of Array.from(document.querySelectorAll('img[src]'))) {
    image.setAttribute('src', new URL(image.getAttribute('src') ?? '', baseUrl).toString())
  }

  return document.body.innerHTML
}

function getFallbackHtml(rawHtml: string, url: string): string {
  const text = rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const preview = escapeHtml(text).slice(0, 2000)
  return [
    '<article>',
    '<p>正文提取失败，请打开原文查看。</p>',
    `<p><a href="${escapeHtml(url)}">查看原文</a></p>`,
    preview ? `<p>${preview}</p>` : '',
    '</article>'
  ].join('')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
