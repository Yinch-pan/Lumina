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
    'del',
    'ins',
    'kbd',
    'samp',
    'var',
    'blockquote',
    'pre',
    'code',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'picture',
    'source',
    'figure',
    'figcaption',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'hr',
    'time',
    'sup',
    'sub',
    'mark'
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    blockquote: ['cite'],
    img: ['src', 'srcset', 'sizes', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    source: ['src', 'srcset', 'sizes', 'type', 'media'],
    code: ['class'],
    pre: ['class'],
    time: ['datetime'],
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
  '#bottom',
  '.comicNav'
]

const LAZY_IMAGE_ATTRIBUTES = [
  'data-src',
  'data-original',
  'data-original-src',
  'data-lazy-src',
  'data-url',
  'data-orig-file',
  'data-image-src',
  'data-hi-res-src',
  'data-actualsrc'
]
const LAZY_SRCSET_ATTRIBUTES = ['data-srcset', 'data-lazy-srcset']
const ALLOWED_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const ALLOWED_IMAGE_PROTOCOLS = new Set(['http:', 'https:', 'data:'])
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

export const CLEANER_VERSION = 'module-b-cleaning-v3'

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
      normalizeMedia(dom)

      const readableDocument = dom.window.document.cloneNode(true) as typeof dom.window.document
      const readable = new Readability(readableDocument).parse()
      const readableHtml = selectReadableHtml(dom, readable?.content) || html
      const cleanedHtml = this.sanitize(readableHtml, url)
      const cleanedMarkdown = this.toMarkdown(cleanedHtml)

      return {
        cleanedHtml,
        cleanedMarkdown,
        title: readable?.title?.trim() || undefined,
        author: readable?.byline?.trim() || undefined,
        cleanerVersion: CLEANER_VERSION
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
      cleanedMarkdown: this.toMarkdown(fallbackHtml),
      cleanerVersion: CLEANER_VERSION
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

function normalizeMedia(dom: JSDOM): void {
  const document = dom.window.document

  for (const image of Array.from(document.querySelectorAll('img'))) {
    const lazySrc = getFirstAttribute(image, LAZY_IMAGE_ATTRIBUTES)
    const currentSrc = image.getAttribute('src')?.trim() ?? ''
    if (lazySrc && (!currentSrc || isLikelyPlaceholderImage(currentSrc))) {
      image.setAttribute('src', lazySrc)
    }

    const lazySrcset = getFirstAttribute(image, LAZY_SRCSET_ATTRIBUTES)
    if (lazySrcset && !image.getAttribute('srcset')) {
      image.setAttribute('srcset', lazySrcset)
    }

    if (isTrackingImage(image)) {
      image.remove()
    }
  }

  for (const source of Array.from(document.querySelectorAll('source'))) {
    const lazySrcset = getFirstAttribute(source, LAZY_SRCSET_ATTRIBUTES)
    if (lazySrcset && !source.getAttribute('srcset')) {
      source.setAttribute('srcset', lazySrcset)
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
    resolveUrlAttribute(link, 'href', baseUrl, ALLOWED_LINK_PROTOCOLS)
  }

  for (const image of Array.from(document.querySelectorAll('img[src]'))) {
    resolveUrlAttribute(image, 'src', baseUrl, ALLOWED_IMAGE_PROTOCOLS)
  }

  for (const image of Array.from(document.querySelectorAll('img[srcset]'))) {
    resolveSrcsetAttribute(image, 'srcset', baseUrl, ALLOWED_IMAGE_PROTOCOLS)
  }

  for (const source of Array.from(document.querySelectorAll('source[src]'))) {
    resolveUrlAttribute(source, 'src', baseUrl, ALLOWED_IMAGE_PROTOCOLS)
  }

  for (const source of Array.from(document.querySelectorAll('source[srcset]'))) {
    resolveSrcsetAttribute(source, 'srcset', baseUrl, ALLOWED_IMAGE_PROTOCOLS)
  }

  for (const quote of Array.from(document.querySelectorAll('blockquote[cite]'))) {
    resolveUrlAttribute(quote, 'cite', baseUrl, ALLOWED_LINK_PROTOCOLS)
  }

  return document.body.innerHTML
}

function resolveUrlAttribute(
  element: Element,
  attribute: string,
  baseUrl: string,
  allowedProtocols: Set<string>
): void {
  const value = element.getAttribute(attribute)
  const resolved = resolveUrl(value, baseUrl, allowedProtocols)
  if (resolved) {
    element.setAttribute(attribute, resolved)
  } else {
    element.removeAttribute(attribute)
  }
}

function resolveSrcsetAttribute(
  element: Element,
  attribute: string,
  baseUrl: string,
  allowedProtocols: Set<string>
): void {
  const value = element.getAttribute(attribute)
  if (!value) {
    return
  }

  const candidates = value
    .split(',')
    .map((candidate) => normalizeSrcsetCandidate(candidate, baseUrl, allowedProtocols))
    .filter((candidate): candidate is string => Boolean(candidate))

  if (candidates.length > 0) {
    element.setAttribute(attribute, candidates.join(', '))
  } else {
    element.removeAttribute(attribute)
  }
}

function normalizeSrcsetCandidate(
  candidate: string,
  baseUrl: string,
  allowedProtocols: Set<string>
): string | null {
  const parts = candidate.trim().split(/\s+/).filter(Boolean)
  const [rawUrl, ...descriptors] = parts
  const resolved = resolveUrl(rawUrl, baseUrl, allowedProtocols)

  if (!resolved) {
    return null
  }

  return [resolved, ...descriptors].join(' ')
}

function resolveUrl(
  value: string | null | undefined,
  baseUrl: string,
  allowedProtocols: Set<string>
): string | null {
  const trimmed = value?.trim()
  if (!trimmed) {
    return null
  }

  try {
    const resolved = new URL(trimmed, baseUrl)
    if (!allowedProtocols.has(resolved.protocol)) {
      return null
    }

    if (resolved.protocol === 'data:' && !isSafeDataImage(resolved.toString())) {
      return null
    }

    return resolved.toString()
  } catch {
    return null
  }
}

function getFirstAttribute(element: Element, attributes: string[]): string | null {
  for (const attribute of attributes) {
    const value = element.getAttribute(attribute)?.trim()
    if (value) {
      return value
    }
  }

  return null
}

function isLikelyPlaceholderImage(src: string): boolean {
  const normalized = src.toLowerCase()
  return (
    normalized.startsWith('data:image/gif') ||
    normalized.includes('blank.gif') ||
    normalized.includes('spacer.gif') ||
    normalized.includes('transparent.gif') ||
    normalized.includes('placeholder')
  )
}

function isTrackingImage(image: Element): boolean {
  const width = Number.parseInt(image.getAttribute('width') ?? '', 10)
  const height = Number.parseInt(image.getAttribute('height') ?? '', 10)
  return width > 0 && width <= 2 && height > 0 && height <= 2 && !image.getAttribute('alt')
}

function isSafeDataImage(value: string): boolean {
  return /^data:image\/(?:png|gif|jpe?g|webp|avif|bmp);/i.test(value)
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
