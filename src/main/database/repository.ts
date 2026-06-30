import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { Article, ArticleContent, Feed, Tag } from '../types'

export interface FeedRecord {
  id: string
  title: string
  feedTitle?: string | null
  customTitle?: string | null
  url: string
  description?: string | null
  siteUrl?: string | null
  faviconUrl?: string | null
  refreshIntervalMinutes?: number
  lastRefreshedAt?: number | null
  lastError?: string | null
  createdAt: number
  updatedAt: number
}

export interface EntryRecord {
  id: string
  feedId: string
  title: string
  url: string
  author?: string | null
  publishedAt?: number | null
  guid?: string | null
  excerpt?: string | null
  isRead?: boolean
  createdAt: number
}

export interface EntryContentRecord {
  entryId: string
  rawHtml?: string | null
  cleanedHtml?: string | null
  cleanedMarkdown?: string | null
  fetchedAt?: number | null
}

interface FeedRow {
  id: string
  title: string
  feed_title: string | null
  custom_title: string | null
  url: string
  description: string | null
  site_url: string | null
  favicon_url: string | null
  refresh_interval_minutes: number | null
  last_refreshed_at: number | null
  last_error: string | null
  created_at: number
  updated_at: number
  unread_count?: number
  article_count?: number
}

interface EntryRow {
  id: string
  feed_id: string
  title: string
  url: string
  author: string | null
  published_at: number | null
  guid: string | null
  excerpt: string | null
  is_read: number
  is_starred?: number
  created_at: number
}

interface EntryContentRow {
  entry_id: string
  raw_html: string | null
  cleaned_html: string | null
  cleaned_markdown: string | null
  fetched_at: number | null
  title: string
  author: string | null
  published_at: number | null
  url: string
  is_starred: number
  scroll_percent?: number
}

interface TagRow {
  id: string
  name: string
  count: number
}

interface AgentRunRow {
  output_text: string | null
}

export class Repository {
  constructor(private readonly db: Database.Database) {}

  createFeed(feed: FeedRecord): void {
    this.db
      .prepare(
        `INSERT INTO feeds (
          id, title, feed_title, custom_title, url, description, site_url, favicon_url,
          refresh_interval_minutes, last_refreshed_at, last_error, created_at, updated_at
        ) VALUES (
          @id, @title, @feedTitle, @customTitle, @url, @description, @siteUrl, @faviconUrl,
          @refreshIntervalMinutes, @lastRefreshedAt, @lastError, @createdAt, @updatedAt
        )`
      )
      .run({
        ...feed,
        feedTitle: feed.feedTitle ?? feed.title,
        customTitle: feed.customTitle ?? null,
        refreshIntervalMinutes: feed.refreshIntervalMinutes ?? 0,
        lastRefreshedAt: feed.lastRefreshedAt ?? feed.updatedAt,
        lastError: feed.lastError ?? null
      })
  }

  updateFeed(feedId: string, fields: Partial<Omit<FeedRecord, 'id' | 'createdAt'>>): void {
    const current = this.getFeedRowById(feedId)
    if (!current) {
      throw new Error(`Feed not found: ${feedId}`)
    }

    this.db
      .prepare(
        `UPDATE feeds
         SET title = @title,
             feed_title = @feedTitle,
             custom_title = @customTitle,
             url = @url,
             description = @description,
             site_url = @siteUrl,
             favicon_url = @faviconUrl,
             refresh_interval_minutes = @refreshIntervalMinutes,
             last_refreshed_at = @lastRefreshedAt,
             last_error = @lastError,
             updated_at = @updatedAt
         WHERE id = @id`
      )
      .run({
        id: feedId,
        title: this.resolveStoredTitle({
          title: fields.title ?? current.title,
          feedTitle: fields.feedTitle ?? current.feed_title,
          customTitle: fields.customTitle !== undefined ? fields.customTitle : current.custom_title
        }),
        feedTitle: fields.feedTitle ?? current.feed_title ?? current.title,
        customTitle: fields.customTitle !== undefined ? normalizeNullableTitle(fields.customTitle) : current.custom_title,
        url: fields.url ?? current.url,
        description: fields.description ?? current.description,
        siteUrl: fields.siteUrl ?? current.site_url,
        faviconUrl: fields.faviconUrl ?? current.favicon_url,
        refreshIntervalMinutes: fields.refreshIntervalMinutes ?? current.refresh_interval_minutes ?? 0,
        lastRefreshedAt: fields.lastRefreshedAt !== undefined ? fields.lastRefreshedAt : current.last_refreshed_at,
        lastError: fields.lastError !== undefined ? fields.lastError : current.last_error,
        updatedAt: fields.updatedAt ?? Date.now()
      })
  }

  deleteFeed(feedId: string): void {
    // 先清理该源下文章的 FTS 索引行（entries_fts 是独立虚表，不随外键级联删除），
    // 必须在 DELETE FROM feeds 触发级联删 entries 之前取到 rowid。
    const rows = this.db
      .prepare('SELECT rowid FROM entries WHERE feed_id = ?')
      .all(feedId) as Array<{ rowid: number }>
    const deleteFts = this.db.prepare('DELETE FROM entries_fts WHERE rowid = ?')
    const tx = this.db.transaction(() => {
      for (const row of rows) deleteFts.run(row.rowid)
      this.db.prepare('DELETE FROM feeds WHERE id = ?').run(feedId)
    })
    tx()
  }

  getFeedRowById(feedId: string): FeedRow | undefined {
    return this.db.prepare('SELECT * FROM feeds WHERE id = ?').get(feedId) as FeedRow | undefined
  }

  getFeedRowByUrl(url: string): FeedRow | undefined {
    return this.db.prepare('SELECT * FROM feeds WHERE url = ?').get(url) as FeedRow | undefined
  }

  getAllFeedRows(): FeedRow[] {
    return this.db
      .prepare(
        `SELECT *
         FROM feeds
         ORDER BY COALESCE(NULLIF(custom_title, ''), NULLIF(feed_title, ''), title) COLLATE NOCASE`
      )
      .all() as FeedRow[]
  }

  getAllFeeds(): Feed[] {
    const rows = this.db
      .prepare(
        `SELECT feeds.*,
                COALESCE(SUM(CASE WHEN entries.is_read = 0 THEN 1 ELSE 0 END), 0) AS unread_count,
                COUNT(entries.id) AS article_count
         FROM feeds
         LEFT JOIN entries ON entries.feed_id = feeds.id
         GROUP BY feeds.id
         ORDER BY COALESCE(NULLIF(feeds.custom_title, ''), NULLIF(feeds.feed_title, ''), feeds.title) COLLATE NOCASE`
      )
      .all() as FeedRow[]

    return rows.map((row) => ({
      id: String(row.id),
      title: this.getDisplayTitle(row),
      sourceTitle: this.getSourceTitle(row),
      customTitle: this.getCustomTitle(row),
      url: String(row.url),
      unreadCount: Number(row.unread_count ?? 0),
      articleCount: Number(row.article_count ?? 0),
      refreshIntervalMinutes: Number(row.refresh_interval_minutes ?? 0),
      lastRefreshedAt: this.formatDate(row.last_refreshed_at),
      lastError: row.last_error ?? null
    }))
  }

  getArticleCountByFeed(feedId: string): number {
    const row = this.db.prepare('SELECT COUNT(*) AS count FROM entries WHERE feed_id = ?').get(feedId) as
      | { count: number }
      | undefined

    return Number(row?.count ?? 0)
  }

  upsertEntry(entry: EntryRecord): { id: string; inserted: boolean } {
    const existing = this.findExistingEntry(entry)
    if (existing) {
      this.db
        .prepare(
          `UPDATE entries
           SET feed_id = @feedId,
               title = @title,
               url = @url,
               author = @author,
               published_at = @publishedAt,
               guid = @guid,
               excerpt = @excerpt
           WHERE id = @id`
        )
        .run({
          ...entry,
          id: existing.id
        })
      this.syncEntryFts(existing.id)
      return { id: existing.id, inserted: false }
    }

    this.db
      .prepare(
        `INSERT INTO entries (
          id, feed_id, title, url, author, published_at, guid, excerpt, is_read, created_at
        ) VALUES (
          @id, @feedId, @title, @url, @author, @publishedAt, @guid, @excerpt, @isRead, @createdAt
        )`
      )
      .run({
        ...entry,
        isRead: entry.isRead ? 1 : 0
      })

    this.syncEntryFts(entry.id)
    return { id: entry.id, inserted: true }
  }

  getArticlesByFeed(feedId: string): Article[] {
    const rows = this.db
      .prepare(
        `SELECT *
         FROM entries
         WHERE feed_id = ?
         ORDER BY COALESCE(published_at, created_at) DESC`
      )
      .all(feedId) as EntryRow[]

    return rows.map((row) => this.toArticle(row))
  }

  getAllArticles(): Article[] {
    const rows = this.db
      .prepare(
        `SELECT *
         FROM entries
         ORDER BY COALESCE(published_at, created_at) DESC`
      )
      .all() as EntryRow[]

    return rows.map((row) => this.toArticle(row))
  }

  getUnreadArticles(): Article[] {
    const rows = this.db
      .prepare(
        `SELECT *
         FROM entries
         WHERE is_read = 0
         ORDER BY COALESCE(published_at, created_at) DESC`
      )
      .all() as EntryRow[]

    return rows.map((row) => this.toArticle(row))
  }

  getEntryRowById(entryId: string): EntryRow | undefined {
    return this.db.prepare('SELECT * FROM entries WHERE id = ?').get(entryId) as EntryRow | undefined
  }

  private syncEntryFts(entryId: string): void {
    const row = this.db.prepare(`
      SELECT entries.rowid AS rowid, entries.title AS title,
             entries.excerpt AS excerpt,
             COALESCE(entry_contents.cleaned_markdown, '') AS content
      FROM entries
      LEFT JOIN entry_contents ON entry_contents.entry_id = entries.id
      WHERE entries.id = ?
    `).get(entryId) as { rowid: number; title: string; excerpt: string | null; content: string } | undefined
    if (!row) return
    this.db.prepare('DELETE FROM entries_fts WHERE rowid = ?').run(row.rowid)
    this.db.prepare('INSERT INTO entries_fts (rowid, title, excerpt, content) VALUES (?, ?, ?, ?)')
      .run(row.rowid, row.title ?? '', row.excerpt ?? '', row.content ?? '')
  }

  searchArticles(query: string): Article[] {
    const trimmed = query.trim()
    if (!trimmed) return []

    const likeQuery = `%${escapeLikePattern(trimmed)}%`

    const rows = this.db.prepare(`
      SELECT entries.*
      FROM entries
      LEFT JOIN entry_contents ON entry_contents.entry_id = entries.id
      WHERE entries.title LIKE ? ESCAPE '\\'
         OR COALESCE(entries.excerpt, '') LIKE ? ESCAPE '\\'
         OR COALESCE(entry_contents.cleaned_markdown, '') LIKE ? ESCAPE '\\'
      ORDER BY
        CASE
          WHEN entries.title LIKE ? ESCAPE '\\' THEN 0
          WHEN COALESCE(entries.excerpt, '') LIKE ? ESCAPE '\\' THEN 1
          ELSE 2
        END,
        COALESCE(entries.published_at, entries.created_at) DESC
    `).all(likeQuery, likeQuery, likeQuery, likeQuery, likeQuery) as EntryRow[]

    return rows.map((row) => this.toArticle(row))
  }

  getArticleContent(entryId: string): ArticleContent | undefined {
    const row = this.db
      .prepare(
        `SELECT entry_contents.entry_id,
                entry_contents.raw_html,
                entry_contents.cleaned_html,
                entry_contents.cleaned_markdown,
                entry_contents.fetched_at,
                entries.title,
                entries.author,
                entries.published_at,
                entries.url,
                entries.is_starred,
                entries.scroll_percent
         FROM entries
         LEFT JOIN entry_contents ON entry_contents.entry_id = entries.id
         WHERE entries.id = ?`
      )
      .get(entryId) as EntryContentRow | undefined

    if (!row) {
      return undefined
    }

    return {
      id: String(row.entry_id ?? entryId),
      title: String(row.title),
      author: row.author ?? undefined,
      publishedAt: this.formatDate(row.published_at),
      sourceUrl: String(row.url),
      rawHtml: row.raw_html ?? undefined,
      cleanedHtml: row.cleaned_html ?? undefined,
      cleanedMarkdown: row.cleaned_markdown ?? undefined,
      summary: this.getLatestAgentOutput(entryId, 'summary') ?? '',
      translation: this.getLatestAgentOutput(entryId, 'translation') ?? '',
      isStarred: row.is_starred === 1,
      scrollPercent: Number(row.scroll_percent ?? 0),
      tags: this.getArticleTags(entryId).map((tag) => tag.name)
    }
  }

  upsertEntryContent(content: EntryContentRecord): void {
    this.db
      .prepare(
        `INSERT INTO entry_contents (
          entry_id, raw_html, cleaned_html, cleaned_markdown, fetched_at
        ) VALUES (
          @entryId, @rawHtml, @cleanedHtml, @cleanedMarkdown, @fetchedAt
        )
        ON CONFLICT(entry_id) DO UPDATE SET
          raw_html = COALESCE(excluded.raw_html, entry_contents.raw_html),
          cleaned_html = COALESCE(excluded.cleaned_html, entry_contents.cleaned_html),
          cleaned_markdown = COALESCE(excluded.cleaned_markdown, entry_contents.cleaned_markdown),
          fetched_at = COALESCE(excluded.fetched_at, entry_contents.fetched_at)`
      )
      .run(content)
    this.syncEntryFts(content.entryId)
  }

  markAsRead(entryId: string): void {
    this.setReadState(entryId, true)
  }

  markAsUnread(entryId: string): void {
    this.setReadState(entryId, false)
  }

  setStarred(entryId: string, starred: boolean): void {
    this.db.prepare('UPDATE entries SET is_starred = ? WHERE id = ?').run(starred ? 1 : 0, entryId)
  }

  saveScrollPercent(entryId: string, percent: number): void {
    this.db.prepare('UPDATE entries SET scroll_percent = ? WHERE id = ?').run(percent, entryId)
  }

  getStarredArticles(): Article[] {
    const rows = this.db
      .prepare(
        `SELECT *
         FROM entries
         WHERE is_starred = 1
         ORDER BY COALESCE(published_at, created_at) DESC`
      )
      .all() as EntryRow[]

    return rows.map((row) => this.toArticle(row))
  }

  getArticleTags(entryId: string): Tag[] {
    const rows = this.db
      .prepare(
        `SELECT tags.id, tags.name, COUNT(entry_tags.entry_id) AS count
         FROM tags
         INNER JOIN entry_tags ON entry_tags.tag_id = tags.id
         WHERE entry_tags.entry_id = ?
         GROUP BY tags.id
         ORDER BY tags.name COLLATE NOCASE`
      )
      .all(entryId) as TagRow[]

    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      count: Number(row.count)
    }))
  }

  private findExistingEntry(entry: EntryRecord): EntryRow | undefined {
    const byUrl = this.db.prepare('SELECT * FROM entries WHERE url = ?').get(entry.url) as
      | EntryRow
      | undefined

    if (byUrl) {
      return byUrl
    }

    if (!entry.guid) {
      return this.findExistingEntryByWeakKey(entry)
    }

    const byGuid = this.db
      .prepare('SELECT * FROM entries WHERE feed_id = ? AND guid = ?')
      .get(entry.feedId, entry.guid) as EntryRow | undefined

    return byGuid ?? this.findExistingEntryByWeakKey(entry)
  }

  private findExistingEntryByWeakKey(entry: EntryRecord): EntryRow | undefined {
    if (!entry.title || !entry.publishedAt || !entry.url) {
      return undefined
    }

    return this.db
      .prepare(
        `SELECT *
         FROM entries
         WHERE feed_id = ?
           AND LOWER(TRIM(title)) = ?
           AND published_at = ?
           AND url = ?`
      )
      .get(entry.feedId, normalizeTitleKey(entry.title), entry.publishedAt, entry.url) as EntryRow | undefined
  }

  private setReadState(entryId: string, isRead: boolean): void {
    this.db.prepare('UPDATE entries SET is_read = ? WHERE id = ?').run(isRead ? 1 : 0, entryId)
  }

  private toArticle(row: EntryRow): Article {
    return {
      id: String(row.id),
      feedId: String(row.feed_id),
      title: String(row.title),
      author: row.author ?? undefined,
      publishedAt: this.formatDate(row.published_at),
      excerpt: row.excerpt ? String(row.excerpt) : '',
      isRead: row.is_read === 1,
      isStarred: row.is_starred === 1,
      tags: this.getArticleTags(row.id).map((tag) => tag.name)
    }
  }

  private resolveStoredTitle(fields: { title: string; feedTitle?: string | null; customTitle?: string | null }): string {
    return normalizeNullableTitle(fields.customTitle) || normalizeNullableTitle(fields.feedTitle) || fields.title
  }

  private getDisplayTitle(row: FeedRow): string {
    return this.getCustomTitle(row) || this.getSourceTitle(row)
  }

  private getSourceTitle(row: FeedRow): string {
    return row.feed_title?.trim() || row.title
  }

  private getCustomTitle(row: FeedRow): string | null {
    const customTitle = row.custom_title?.trim()
    if (!customTitle || customTitle === this.getSourceTitle(row)) {
      return null
    }

    return customTitle
  }

  private formatDate(timestamp?: number | null): string {
    if (!timestamp) {
      return ''
    }

    return new Date(timestamp).toISOString()
  }

  // ==================== 标签管理 =================

  getAllTags(): Tag[] {
    const rows = this.db
      .prepare(
        `SELECT tags.id, tags.name, COUNT(entry_tags.entry_id) AS count
      FROM tags
         LEFT JOIN entry_tags ON entry_tags.tag_id = tags.id
         GROUP BY tags.id
         ORDER BY tags.name COLLATE NOCASE`
      )
      .all() as TagRow[]

    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      count: Number(row.count)
    }))
  }

  createTag(name: string): string {
    const tagId = randomUUID()
    const now = Date.now()
    this.db.prepare('INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)').run(tagId, name, now)
    return tagId
  }

  deleteTag(tagId: string): void {
    this.db.prepare('DELETE FROM entry_tags WHERE tag_id = ?').run(tagId)
    this.db.prepare('DELETE FROM tags WHERE id = ?').run(tagId)
  }

  addTagToEntry(entryId: string, tagId: string): void {
    // 检查是否已存在
    const existing = this.db
      .prepare('SELECT 1 FROM entry_tags WHERE entry_id = ? AND tag_id = ?')
      .get(entryId, tagId)

    if (!existing) {
      const now = Date.now()
      this.db
        .prepare('INSERT INTO entry_tags (entry_id, tag_id, created_at) VALUES (?, ?, ?)')
        .run(entryId, tagId, now)
    }
  }

  removeTagFromEntry(entryId: string, tagId: string): void {
    this.db.prepare('DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?').run(entryId, tagId)
  }

  getArticlesByTag(tagId: string): Article[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT entries.*
         FROM entries
         INNER JOIN entry_tags ON entry_tags.entry_id = entries.id
       WHERE entry_tags.tag_id = ?
         ORDER BY entries.published_at DESC, entries.created_at DESC`
      )
      .all(tagId) as EntryRow[]

    return rows.map((row) => this.toArticle(row))
  }

  // ==================== 划词高亮 =================

  addHighlight(h: { id: string; entryId: string; selectedText: string; prefixText?: string | null; suffixText?: string | null; color: string; note?: string | null; createdAt: number }): void {
    this.db.prepare(`INSERT INTO highlights (id, entry_id, selected_text, prefix_text, suffix_text, color, note, created_at)
      VALUES (@id, @entryId, @selectedText, @prefixText, @suffixText, @color, @note, @createdAt)`)
      .run({ ...h, prefixText: h.prefixText ?? null, suffixText: h.suffixText ?? null, note: h.note ?? null })
  }

  getHighlights(entryId: string): Array<{ id: string; entryId: string; selectedText: string; prefixText: string | null; suffixText: string | null; color: string; note: string | null; createdAt: number }> {
    const rows = this.db.prepare('SELECT * FROM highlights WHERE entry_id = ? ORDER BY created_at').all(entryId) as Array<Record<string, unknown>>
    return rows.map((r) => ({
      id: String(r.id), entryId: String(r.entry_id), selectedText: String(r.selected_text),
      prefixText: (r.prefix_text as string) ?? null, suffixText: (r.suffix_text as string) ?? null,
      color: String(r.color), note: (r.note as string) ?? null, createdAt: Number(r.created_at)
    }))
  }

  updateHighlight(id: string, fields: { color?: string; note?: string }): void {
    const cur = this.db.prepare('SELECT color, note FROM highlights WHERE id = ?').get(id) as { color: string; note: string | null } | undefined
    if (!cur) return
    this.db.prepare('UPDATE highlights SET color = ?, note = ? WHERE id = ?')
      .run(fields.color ?? cur.color, fields.note !== undefined ? fields.note : cur.note, id)
  }

  deleteHighlight(id: string): void {
    this.db.prepare('DELETE FROM highlights WHERE id = ?').run(id)
  }

  // ============ 设置管理 ================

  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined

    return row?.value ?? null
  }

  setSetting(key: string, value: string): void {
    const now = Date.now()
    this.db
      .prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(key, value, now)
  }

  // ============ AI Agent Runs ================

  createAgentRun(run: {
    id: string
    entryId: string
    agentType: 'summary' | 'translation'
    inputText: string
    outputText: string
    status: string
    errorMessage?: string | null
    startedAt: number
    completedAt?: number | null
  }): void {
    this.db
      .prepare(
        `INSERT INTO agent_runs (
          id, entry_id, agent_type, input_text, output_text, status, error_message, started_at, completed_at
        ) VALUES (
          @id, @entryId, @agentType, @inputText, @outputText, @status, @errorMessage, @startedAt, @completedAt
        )`
      )
      .run({
        ...run,
        errorMessage: run.errorMessage ?? null,
        completedAt: run.completedAt ?? null
      })
  }

  createLLMUsage(usage: {
    id: string
    agentRunId: string
    model: string
    promptTokens?: number | null
    completionTokens?: number | null
    totalTokens?: number | null
    createdAt: number
  }): void {
    this.db
      .prepare(
        `INSERT INTO llm_usage (
          id, agent_run_id, model, prompt_tokens, completion_tokens, total_tokens, created_at
        ) VALUES (
          @id, @agentRunId, @model, @promptTokens, @completionTokens, @totalTokens, @createdAt
        )`
      )
      .run({
        ...usage,
        promptTokens: usage.promptTokens ?? null,
        completionTokens: usage.completionTokens ?? null,
        totalTokens: usage.totalTokens ?? null
      })
  }

  getUsageStats(): Array<{ model: string; agentType: string; day: string; requests: number; totalTokens: number }> {
    return this.db.prepare(`
      SELECT llm_usage.model AS model,
             agent_runs.agent_type AS agentType,
             date(llm_usage.created_at / 1000, 'unixepoch') AS day,
             COUNT(*) AS requests,
             COALESCE(SUM(llm_usage.total_tokens), 0) AS totalTokens
      FROM llm_usage
      JOIN agent_runs ON agent_runs.id = llm_usage.agent_run_id
      GROUP BY model, agentType, day
      ORDER BY day DESC, model
    `).all() as Array<{ model: string; agentType: string; day: string; requests: number; totalTokens: number }>
  }

  private getLatestAgentOutput(entryId: string, agentType: 'summary' | 'translation'): string | undefined {
    const row = this.db
      .prepare(
        `SELECT output_text
         FROM agent_runs
         WHERE entry_id = ? AND agent_type = ? AND status = 'completed'
         ORDER BY COALESCE(completed_at, started_at) DESC
         LIMIT 1`
      )
      .get(entryId, agentType) as AgentRunRow | undefined

    return row?.output_text ?? undefined
  }
}

function normalizeNullableTitle(value?: string | null): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

function normalizeTitleKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}
