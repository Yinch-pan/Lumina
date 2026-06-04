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
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    code: ['class'],
    pre: ['class'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data']
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    img: sanitizeHtml.simpleTransform('img', { loading: 'lazy', decoding: 'async' })
  }
}

const NOISE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'nav',
  'aside',
  'form',
  '[role="navigation"]',
  '[role="complementary"]',
  '[aria-label*="navigation" i]',
  '[class~="nav"]',
  '[class*="navbar" i]',
  '[class*="menu" i]',
  '[class*="sidebar" i]',
  '[class*="footer" i]',
  '[class*="comment" i]',
  '[class*="share" i]',
  '[class*="social" i]',
  '[class*="advert" i]',
  '[id*="footer" i]',
  '[id*="comment" i]',
  '[id*="advert" i]',
  '#topContainer',
  '.comicNav'
]

const CONTENT_SELECTORS = [
  'article',
  'main',
  '[role="main"]',
  '#middleContainer',
  '#comic',
  '.entry-content',
  '.post-content',
  '.article-content',
  '.post',
  '.content'
]

const MIN_READABLE_TEXT_LENGTH = 120

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
      removeNoise(dom)

      const readableDocument = dom.window.document.cloneNode(true) as typeof dom.window.document
      const readable = new Readability(readableDocument).parse()
      const readableHtml = selectReadableHtml(dom, readable?.content) || html
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

function removeNoise(dom: JSDOM): void {
  const document = dom.window.document
  for (const selector of NOISE_SELECTORS) {
    for (const element of Array.from(document.querySelectorAll(selector))) {
      element.remove()
    }
  }
}

function selectReadableHtml(dom: JSDOM, readableContent?: string | null): string {
  const content = readableContent?.trim()
  if (content && isMeaningfulHtml(content)) {
    return content
  }

  const candidate = findBestContentElement(dom)
  if (candidate) {
    return candidate.innerHTML.trim()
  }

  return getBodyHtml(dom)
}

function findBestContentElement(dom: JSDOM): Element | null {
  const document = dom.window.document
  let bestElement: Element | null = null
  let bestScore = 0

  for (const selector of CONTENT_SELECTORS) {
    for (const element of Array.from(document.querySelectorAll(selector))) {
      const score = scoreContentElement(element)
      if (score > bestScore) {
        bestScore = score
        bestElement = element
      }
    }
  }

  return bestScore > 0 ? bestElement : null
}

function scoreContentElement(element: Element): number {
  const textLength = normalizeText(element.textContent ?? '').length
  const linkTextLength = Array.from(element.querySelectorAll('a')).reduce(
    (total, link) => total + normalizeText(link.textContent ?? '').length,
    0
  )
  const mediaScore = element.querySelectorAll('img, figure, picture, pre, table, blockquote').length * 120

  return textLength + mediaScore - Math.round(linkTextLength * 0.6)
}

function isMeaningfulHtml(html: string): boolean {
  const dom = new JSDOM(`<body>${html}</body>`)
  const body = dom.window.document.body
  const textLength = normalizeText(body.textContent ?? '').length
  const linkTextLength = Array.from(body.querySelectorAll('a')).reduce(
    (total, link) => total + normalizeText(link.textContent ?? '').length,
    0
  )
  const hasMostlyLinks = textLength > 0 && linkTextLength / textLength > 0.55
  const hasRichContent = Boolean(body.querySelector('img, figure, picture, pre, table, blockquote'))

  return (textLength >= MIN_READABLE_TEXT_LENGTH || hasRichContent) && (!hasMostlyLinks || hasRichContent)
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
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
    '<p>&#27491;&#25991;&#25552;&#21462;&#22833;&#36133;&#65292;&#35831;&#25171;&#24320;&#21407;&#25991;&#26597;&#30475;&#12290;</p>',
    `<p><a href="${escapeHtml(url)}">&#26597;&#30475;&#21407;&#25991;</a></p>`,
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
