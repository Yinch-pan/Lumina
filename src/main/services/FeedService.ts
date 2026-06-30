import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import Parser from 'rss-parser'
import { XMLBuilder, XMLParser } from 'fast-xml-parser'
import { Repository } from '../database/repository'
import { Article, Feed, OpmlFeed, OpmlImportFailure, OpmlImportResult } from '../types'
import { IFeedService } from './interfaces'

interface ParsedFeedItem {
  title?: string
  link?: string
  guid?: string
  id?: string
  creator?: string
  author?: string
  pubDate?: string
  isoDate?: string
  contentSnippet?: string
  content?: string
  summary?: string
}

interface ParsedFeed {
  title?: string
  description?: string
  link?: string
  items: ParsedFeedItem[]
}

type FetchText = (url: string) => Promise<string>

const DEFAULT_USER_AGENT = 'Lumina/1.0 RSS Reader'
const MAX_REFRESH_INTERVAL_MINUTES = 60 * 24 * 30
const TRACKING_QUERY_PARAMS = new Set([
  'fbclid',
  'gclid',
  'dclid',
  'mc_cid',
  'mc_eid',
  'igshid',
  'ref',
  'spm'
])

export class FeedService implements IFeedService {
  private readonly parser = new Parser()

  constructor(
    private readonly repository: Repository,
    private readonly fetchText: FetchText = defaultFetchText
  ) {}

  async addFeed(url: string): Promise<Feed> {
    const normalizedUrl = normalizeUrl(url)
    const existing = this.repository.getFeedRowByUrl(normalizedUrl)
    if (existing) {
      await this.refreshFeed(existing.id)
      const feed = this.repository.getAllFeeds().find((item) => item.id === existing.id)
      if (!feed) {
        throw new Error(`Feed not found after refresh: ${existing.id}`)
      }
      return feed
    }

    const parsed = await this.parseFeedUrl(normalizedUrl)
    const now = Date.now()
    const feedId = randomUUID()

    this.repository.createFeed({
      id: feedId,
      title: parsed.title?.trim() || normalizedUrl,
      feedTitle: parsed.title?.trim() || normalizedUrl,
      customTitle: null,
      url: normalizedUrl,
      description: parsed.description ?? null,
      siteUrl: parsed.link ?? null,
      faviconUrl: null,
      refreshIntervalMinutes: 0,
      lastRefreshedAt: now,
      lastError: null,
      createdAt: now,
      updatedAt: now
    })

    this.saveFeedItems(feedId, parsed.items, { url: normalizedUrl })

    const feed = this.repository.getAllFeeds().find((item) => item.id === feedId)
    if (!feed) {
      throw new Error(`Feed was created but cannot be loaded: ${feedId}`)
    }

    return feed
  }

  async deleteFeed(feedId: string): Promise<void> {
    this.repository.deleteFeed(feedId)
  }

  async updateFeed(
    feedId: string,
    updates: { title?: string; url?: string; refreshIntervalMinutes?: number }
  ): Promise<Feed> {
    const current = this.repository.getFeedRowById(feedId)
    if (!current) {
      throw new Error(`Feed not found: ${feedId}`)
    }

    const fields: { customTitle?: string | null; url?: string; refreshIntervalMinutes?: number; updatedAt: number } = {
      updatedAt: Date.now()
    }

    if (updates.title !== undefined) {
      const title = updates.title.trim()
      const sourceTitle = (current.feed_title ?? current.title).trim()
      fields.customTitle = title && title !== sourceTitle ? title : null
    }
    if (updates.url !== undefined) {
      fields.url = normalizeUrl(updates.url)
    }
    if (updates.refreshIntervalMinutes !== undefined) {
      fields.refreshIntervalMinutes = normalizeRefreshIntervalMinutes(updates.refreshIntervalMinutes)
    }

    this.repository.updateFeed(feedId, fields)
    return this.loadFeed(feedId)
  }

  async resetFeedTitle(feedId: string): Promise<Feed> {
    const current = this.repository.getFeedRowById(feedId)
    if (!current) {
      throw new Error(`Feed not found: ${feedId}`)
    }

    this.repository.updateFeed(feedId, {
      customTitle: null,
      updatedAt: Date.now()
    })
    return this.loadFeed(feedId)
  }

  async getAllFeeds(): Promise<Feed[]> {
    return this.repository.getAllFeeds()
  }

  private loadFeed(feedId: string): Feed {
    const feed = this.repository.getAllFeeds().find((item) => item.id === feedId)
    if (!feed) {
      throw new Error(`Feed not found after loading: ${feedId}`)
    }
    return feed
  }

  async refreshFeed(feedId: string): Promise<Article[]> {
    const feed = this.repository.getFeedRowById(feedId)
    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`)
    }

    const now = Date.now()
    try {
      const parsed = await this.parseFeedUrl(feed.url)
      this.repository.updateFeed(feedId, {
        feedTitle: parsed.title?.trim() || feed.feed_title || feed.title,
        description: parsed.description ?? feed.description,
        siteUrl: parsed.link ?? feed.site_url,
        lastRefreshedAt: now,
        lastError: null,
        updatedAt: now
      })
      this.saveFeedItems(feedId, parsed.items, feed)
    } catch (error) {
      this.recordRefreshFailure(feed.id, now, error)
      throw error
    }

    return this.repository.getArticlesByFeed(feedId)
  }

  async refreshAllFeeds(): Promise<void> {
    const feeds = this.repository.getAllFeedRows()
    for (const feed of feeds) {
      try {
        await this.refreshFeed(feed.id)
      } catch (error) {
        console.error(`Refresh failed for feed ${feed.id}:`, error)
      }
    }
  }

  async refreshDueFeeds(now = Date.now()): Promise<void> {
    const feeds = this.repository.getAllFeedRows()
    for (const feed of feeds) {
      const refreshIntervalMinutes = Number(feed.refresh_interval_minutes ?? 0)
      if (refreshIntervalMinutes <= 0) {
        continue
      }

      const lastRefreshedAt = feed.last_refreshed_at ?? feed.updated_at ?? 0
      const refreshIntervalMs = refreshIntervalMinutes * 60 * 1000
      if (now - lastRefreshedAt < refreshIntervalMs) {
        continue
      }

      try {
        await this.refreshFeed(feed.id)
      } catch (error) {
        console.error(`Auto refresh failed for feed ${feed.id}:`, error)
      }
    }
  }

  async importOpml(filePath: string): Promise<OpmlImportResult> {
    const xml = await fs.readFile(filePath, 'utf-8')
    const importedFeeds = parseOpmlFeeds(xml)
    return this.importOpmlFeeds(importedFeeds)
  }

  async previewOpml(filePath: string): Promise<OpmlFeed[]> {
    const xml = await fs.readFile(filePath, 'utf-8')
    return this.decorateOpmlFeeds(parseOpmlFeeds(xml))
  }

  async importOpmlFeeds(importedFeeds: OpmlFeed[]): Promise<OpmlImportResult> {
    const result: Feed[] = []
    const failures: OpmlImportFailure[] = []
    const seen = new Set<string>()

    for (const feed of importedFeeds) {
      let normalizedUrl: string
      try {
        normalizedUrl = normalizeUrl(feed.url)
      } catch (error) {
        failures.push({
          title: feed.title,
          url: feed.url,
          error: toErrorMessage(error)
        })
        continue
      }

      if (seen.has(normalizedUrl)) {
        continue
      }
      seen.add(normalizedUrl)

      try {
        result.push(await this.addFeed(normalizedUrl))
      } catch (error) {
        const existing = this.repository.getFeedRowByUrl(normalizedUrl)
        if (existing) {
          const loaded = this.repository.getAllFeeds().find((item) => item.id === existing.id)
          if (loaded) {
            result.push(loaded)
            continue
          }
        }

        failures.push({
          title: feed.title,
          url: feed.url,
          error: toErrorMessage(error)
        })
      }
    }

    return { feeds: result, failures }
  }

  async exportOpml(filePath: string): Promise<void> {
    const feeds = this.repository.getAllFeedRows()
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      suppressEmptyNode: true
    })

    const xml = builder.build({
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'UTF-8'
      },
      opml: {
        '@_version': '2.0',
        head: {
          title: 'Lumina Subscriptions'
        },
        body: {
          outline: feeds.map((feed) => ({
            '@_text': feed.custom_title?.trim() || feed.feed_title?.trim() || feed.title,
            '@_title': feed.custom_title?.trim() || feed.feed_title?.trim() || feed.title,
            '@_type': 'rss',
            '@_xmlUrl': feed.url,
            '@_htmlUrl': feed.site_url ?? ''
          }))
        }
      }
    })

    await fs.writeFile(filePath, xml, 'utf-8')
  }

  private async parseFeedUrl(url: string): Promise<ParsedFeed> {
    const xml = await this.fetchText(url)
    const parsed = (await this.parser.parseString(xml)) as ParsedFeed
    return {
      ...parsed,
      items: Array.isArray(parsed.items) ? parsed.items : []
    }
  }

  private saveFeedItems(feedId: string, items: ParsedFeedItem[], feed: { url: string }): void {
    const now = Date.now()

    for (const item of items) {
      const url = item.link?.trim() || item.guid?.trim() || item.id?.trim()
      if (!url) {
        continue
      }
      const normalizedUrl = normalizeEntryUrl(url, feed.url)

      this.repository.upsertEntry({
        id: randomUUID(),
        feedId,
        title: item.title?.trim() || normalizedUrl,
        url: normalizedUrl,
        author: item.creator ?? item.author ?? null,
        publishedAt: parseDate(item.isoDate ?? item.pubDate),
        guid: item.guid ?? item.id ?? null,
        excerpt: normalizeExcerpt(item.contentSnippet ?? item.summary ?? item.content ?? ''),
        isRead: false,
        createdAt: now
      })
    }
  }

  private decorateOpmlFeeds(feeds: OpmlFeed[]): OpmlFeed[] {
    const seen = new Set<string>()

    return feeds.map((feed) => {
      let normalizedUrl = ''
      try {
        normalizedUrl = normalizeUrl(feed.url)
      } catch (error) {
        return {
          ...feed,
          status: 'invalid',
          message: toErrorMessage(error)
        }
      }

      if (seen.has(normalizedUrl)) {
        return {
          ...feed,
          normalizedUrl,
          status: 'duplicate',
          message: 'OPML 文件中重复'
        }
      }
      seen.add(normalizedUrl)

      if (this.repository.getFeedRowByUrl(normalizedUrl)) {
        return {
          ...feed,
          normalizedUrl,
          status: 'existing',
          message: '已存在'
        }
      }

      return {
        ...feed,
        normalizedUrl,
        status: 'new',
        message: '新增'
      }
    })
  }

  private recordRefreshFailure(feedId: string, timestamp: number, error: unknown): void {
    this.repository.updateFeed(feedId, {
      lastRefreshedAt: timestamp,
      lastError: toErrorMessage(error),
      updatedAt: timestamp
    })
  }
}

function parseOpmlFeeds(xml: string): OpmlFeed[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    trimValues: true
  })
  let parsed: unknown
  try {
    parsed = parser.parse(xml) as unknown
  } catch (error) {
    throw new Error(`OPML 文件解析失败：${toErrorMessage(error)}`)
  }
  const outlines = getOpmlOutlines(parsed)
  const feeds: OpmlFeed[] = []

  walkOutlines(outlines, feeds)
  if (feeds.length === 0) {
    throw new Error('该文件不是有效的 OPML，或其中没有可导入的订阅源')
  }

  return feeds
}

function getOpmlOutlines(parsed: unknown): unknown {
  if (!isRecord(parsed)) {
    return []
  }
  const opml = parsed.opml
  if (!isRecord(opml)) {
    return []
  }
  const body = opml.body
  if (!isRecord(body)) {
    return []
  }
  return body.outline ?? []
}

function walkOutlines(outline: unknown, result: OpmlFeed[]): void {
  if (Array.isArray(outline)) {
    for (const child of outline) {
      walkOutlines(child, result)
    }
    return
  }

  if (!isRecord(outline)) {
    return
  }

  const xmlUrl = stringValue(outline.xmlUrl)
  if (xmlUrl) {
    result.push({
      title: stringValue(outline.title) || stringValue(outline.text) || xmlUrl,
      url: xmlUrl
    })
  }

  if (outline.outline) {
    walkOutlines(outline.outline, result)
  }
}

async function defaultFetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }

  return response.text()
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) {
    throw new Error('Feed URL is required')
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return new URL(withProtocol).toString()
}

function normalizeEntryUrl(url: string, baseUrl?: string): string {
  const trimmed = url.trim()
  if (!trimmed) {
    return trimmed
  }

  try {
    const parsed = baseUrl ? new URL(trimmed, baseUrl) : new URL(trimmed)
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (key.toLowerCase().startsWith('utm_') || TRACKING_QUERY_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key)
      }
    }

    if (parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/'
    }

    return parsed.toString()
  } catch {
    return trimmed.replace(/\/+$/, '')
  }
}

function normalizeRefreshIntervalMinutes(value: number): number {
  const interval = Number(value)
  if (!Number.isInteger(interval) || interval < 0 || interval > MAX_REFRESH_INTERVAL_MINUTES) {
    throw new Error('刷新频率必须是 0 到 43200 分钟之间的整数')
  }

  return interval
}

function parseDate(value?: string): number | null {
  if (!value) {
    return null
  }

  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

function normalizeExcerpt(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
