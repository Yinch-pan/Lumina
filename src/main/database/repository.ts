import { initDatabase } from './init'
import { BetterSqlite3Compat } from './sqlite-wrapper'
import { Tag, Article, LLMConfig } from '../types'
import crypto from 'crypto'

function generateId(): string {
  return crypto.randomUUID()
}

let _db: BetterSqlite3Compat | null = null

export function getDatabase(): BetterSqlite3Compat {
  if (!_db) {
    _db = initDatabase()
  }
  return _db
}

// ───────────────────── Tag ─────────────────────

export function insertTag(name: string): Tag {
  const db = getDatabase()
  const id = generateId()
  const now = Date.now()
  db.prepare('INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)').run(id, name, now)
  return { id, name, count: 0 }
}

export function selectAllTags(): Tag[] {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT t.id, t.name, COUNT(et.entry_id) as count
    FROM tags t
    LEFT JOIN entry_tags et ON t.id = et.tag_id
    GROUP BY t.id
    ORDER BY t.name
  `).all() as Array<{ id: string; name: string; count: number }>
  return rows
}

export function deleteTagById(tagId: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM entry_tags WHERE tag_id = ?').run(tagId)
  db.prepare('DELETE FROM tags WHERE id = ?').run(tagId)
}

export function updateTagName(tagId: string, newName: string): void {
  const db = getDatabase()
  db.prepare('UPDATE tags SET name = ? WHERE id = ?').run(newName, tagId)
}

export function findTagByName(name: string): Tag | null {
  const db = getDatabase()
  const row = db.prepare('SELECT id, name FROM tags WHERE name = ?').get(name) as { id: string; name: string } | undefined
  if (!row) return null
  const countRow = db.prepare('SELECT COUNT(*) as count FROM entry_tags WHERE tag_id = ?').get(row.id) as { count: number }
  return { id: row.id, name: row.name, count: countRow.count }
}

// ───────────────────── Entry Tags ─────────────────────

export function insertEntryTag(entryId: string, tagId: string): void {
  const db = getDatabase()
  const now = Date.now()
  db.prepare('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id, created_at) VALUES (?, ?, ?)').run(entryId, tagId, now)
}

export function deleteEntryTag(entryId: string, tagId: string): void {
  const db = getDatabase()
  db.prepare('DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?').run(entryId, tagId)
}

export function selectTagsByEntryId(entryId: string): Tag[] {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT t.id, t.name, 1 as count
    FROM tags t
    INNER JOIN entry_tags et ON t.id = et.tag_id
    WHERE et.entry_id = ?
    ORDER BY t.name
  `).all(entryId) as Tag[]
  return rows
}

export function selectEntriesByTagId(tagId: string): string[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT entry_id FROM entry_tags WHERE tag_id = ?').all(tagId) as Array<{ entry_id: string }>
  return rows.map(r => r.entry_id)
}

// ───────────────────── Entries / Articles ─────────────────────

function formatTimestamp(ts: number | null | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function selectEntryById(entryId: string): (Article & { url: string; cleanedMarkdown?: string; cleanedHtml?: string; summary?: string; translation?: string }) | null {
  const db = getDatabase()
  const entry = db.prepare('SELECT * FROM entries WHERE id = ?').get(entryId) as any
  if (!entry) return null

  const content = db.prepare('SELECT * FROM entry_contents WHERE entry_id = ?').get(entryId) as any
  const tags = selectTagsByEntryId(entryId)

  // Try to get summary/translation from agent_runs
  const summaryRun = db.prepare(`
    SELECT output_text FROM agent_runs
    WHERE entry_id = ? AND agent_type = 'summary' AND status = 'completed'
    ORDER BY completed_at DESC LIMIT 1
  `).get(entryId) as { output_text: string } | undefined

  const translationRun = db.prepare(`
    SELECT output_text FROM agent_runs
    WHERE entry_id = ? AND agent_type = 'translation' AND status = 'completed'
    ORDER BY completed_at DESC LIMIT 1
  `).get(entryId) as { output_text: string } | undefined

  return {
    id: entry.id,
    feedId: entry.feed_id,
    title: entry.title,
    author: entry.author,
    publishedAt: formatTimestamp(entry.published_at),
    excerpt: entry.excerpt || '',
    isRead: entry.is_read === 1,
    tags: tags.map(t => t.name),
    url: entry.url,
    cleanedMarkdown: content?.cleaned_markdown,
    cleanedHtml: content?.cleaned_html,
    summary: summaryRun?.output_text,
    translation: translationRun?.output_text
  }
}

export function selectAllEntries(): Article[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM entries ORDER BY published_at DESC').all() as any[]
  return rows.map(entry => ({
    id: entry.id,
    feedId: entry.feed_id,
    title: entry.title,
    author: entry.author,
    publishedAt: formatTimestamp(entry.published_at),
    excerpt: entry.excerpt || '',
    isRead: entry.is_read === 1,
    tags: selectTagsByEntryId(entry.id).map(t => t.name)
  }))
}

export function selectEntriesByFeedId(feedId: string): Article[] {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM entries WHERE feed_id = ? ORDER BY published_at DESC').all(feedId) as any[]
  return rows.map(entry => ({
    id: entry.id,
    feedId: entry.feed_id,
    title: entry.title,
    author: entry.author,
    publishedAt: formatTimestamp(entry.published_at),
    excerpt: entry.excerpt || '',
    isRead: entry.is_read === 1,
    tags: selectTagsByEntryId(entry.id).map(t => t.name)
  }))
}

export function selectTagsByFeedId(feedId: string): Tag[] {
  const db = getDatabase()
  const rows = db.prepare(`
    SELECT DISTINCT t.id, t.name, COUNT(et.entry_id) as count
    FROM tags t
    INNER JOIN entry_tags et ON t.id = et.tag_id
    INNER JOIN entries e ON et.entry_id = e.id
    WHERE e.feed_id = ?
    GROUP BY t.id, t.name
    ORDER BY t.name
  `).all(feedId) as Array<{ id: string; name: string; count: number }>
  return rows
}

// ───────────────────── Settings ─────────────────────

export function selectSetting(key: string): string | null {
  const db = getDatabase()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function upsertSetting(key: string, value: string): void {
  const db = getDatabase()
  const now = Date.now()
  db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)').run(key, value, now)
}

export function selectLLMConfig(): LLMConfig {
  return {
    baseUrl: selectSetting('llm_base_url') || '',
    apiKey: selectSetting('llm_api_key') || '',
    model: selectSetting('llm_model') || ''
  }
}

export function saveLLMConfig(config: LLMConfig): void {
  upsertSetting('llm_base_url', config.baseUrl)
  upsertSetting('llm_api_key', config.apiKey)
  upsertSetting('llm_model', config.model)
}
