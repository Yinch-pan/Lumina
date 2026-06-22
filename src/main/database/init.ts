import Database from 'better-sqlite3'
import * as path from 'path'
import { app } from 'electron'

/**
 * 数据库初始化脚本
 * 定义所有表结构
 */

export function initDatabase(): Database.Database {
  const dbPath = path.join(app.getPath('userData'), 'mercury.db')
  return initDatabaseAtPath(dbPath)
}

export function initDatabaseAtPath(dbPath: string): Database.Database {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('busy_timeout = 5000')
  db.pragma('foreign_keys = ON')

  // 创建 feeds 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      feed_title TEXT,
      custom_title TEXT,
      url TEXT NOT NULL UNIQUE,
      description TEXT,
      site_url TEXT,
      favicon_url TEXT,
      refresh_interval_minutes INTEGER NOT NULL DEFAULT 0,
      last_refreshed_at INTEGER,
      last_error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  migrateFeedsTable(db)

  // 创建 entries 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      feed_id TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      author TEXT,
      published_at INTEGER,
      guid TEXT,
      excerpt TEXT,
      is_read INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
    )
  `)

  // 创建 entry_contents 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS entry_contents (
      entry_id TEXT PRIMARY KEY,
      raw_html TEXT,
      cleaned_html TEXT,
      cleaned_markdown TEXT,
      fetched_at INTEGER,
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
    )
  `)

  // 创建 tags 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )
  `)

  // 创建 entry_tags 表（文章与标签关系）
  db.exec(`
    CREATE TABLE IF NOT EXISTS entry_tags (
      entry_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (entry_id, tag_id),
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `)

  // 创建 agent_runs 表（AI 任务运行记录）
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL,
      agent_type TEXT NOT NULL,
      input_text TEXT,
      output_text TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
    )
  `)

  // 创建 llm_usage 表（LLM 用量统计）
  db.exec(`
    CREATE TABLE IF NOT EXISTS llm_usage (
      id TEXT PRIMARY KEY,
      agent_run_id TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_tokens INTEGER,
      completion_tokens INTEGER,
      total_tokens INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (agent_run_id) REFERENCES agent_runs(id) ON DELETE CASCADE
    )
  `)

  // 创建 settings 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_entries_feed_id ON entries(feed_id);
    CREATE INDEX IF NOT EXISTS idx_entries_is_read ON entries(is_read);
    CREATE INDEX IF NOT EXISTS idx_entries_published_at ON entries(published_at);
    CREATE INDEX IF NOT EXISTS idx_entry_tags_entry_id ON entry_tags(entry_id);
    CREATE INDEX IF NOT EXISTS idx_entry_tags_tag_id ON entry_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_agent_runs_entry_id ON agent_runs(entry_id);
  `)

  runMigrations(db)
  return db
}

function migrateFeedsTable(db: Database.Database): void {
  const addedFeedTitle = ensureColumn(db, 'feed_title', 'TEXT')
  const addedCustomTitle = ensureColumn(db, 'custom_title', 'TEXT')
  ensureColumn(db, 'refresh_interval_minutes', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumn(db, 'last_refreshed_at', 'INTEGER')
  ensureColumn(db, 'last_error', 'TEXT')

  db.exec(`
    UPDATE feeds
    SET feed_title = title
    WHERE feed_title IS NULL OR TRIM(feed_title) = '';

    UPDATE feeds
    SET refresh_interval_minutes = 0
    WHERE refresh_interval_minutes IS NULL OR refresh_interval_minutes < 0;

    UPDATE feeds
    SET last_refreshed_at = updated_at
    WHERE last_refreshed_at IS NULL;
  `)

  if (addedFeedTitle && addedCustomTitle) {
    db.exec(`
      UPDATE feeds
      SET custom_title = title
      WHERE custom_title IS NULL OR TRIM(custom_title) = '';
    `)
  }
}

function ensureColumn(db: Database.Database, columnName: string, definition: string): boolean {
  const columns = db.prepare('PRAGMA table_info(feeds)').all() as Array<{ name: string }>
  const exists = columns.some((column) => column.name === columnName)
  if (!exists) {
    db.exec(`ALTER TABLE feeds ADD COLUMN ${columnName} ${definition}`)
    return true
  }
  return false
}

type Migration = (db: Database.Database) => void

// 有序迁移列表。索引 0 对应 user_version 1。只追加，永不修改已有项。
const MIGRATIONS: Migration[] = [
  // v1: 文章星标 + 滚动进度
  (db) => {
    ensureEntryColumn(db, 'is_starred', 'INTEGER NOT NULL DEFAULT 0')
    ensureEntryColumn(db, 'scroll_percent', 'REAL NOT NULL DEFAULT 0')
  },
  // v2: 高亮/笔记表
  (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS highlights (
        id TEXT PRIMARY KEY,
        entry_id TEXT NOT NULL,
        selected_text TEXT NOT NULL,
        prefix_text TEXT,
        suffix_text TEXT,
        color TEXT NOT NULL DEFAULT 'yellow',
        note TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
      )
    `)
    db.exec('CREATE INDEX IF NOT EXISTS idx_highlights_entry_id ON highlights(entry_id)')
  },
  // v3: FTS5 全文索引(contentless，rowid 对齐 entries.rowid)
  (db) => {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
        title, excerpt, content,
        content='', tokenize='unicode61'
      )
    `)
    const rows = db.prepare(`
      SELECT entries.rowid AS rowid, entries.title AS title,
             entries.excerpt AS excerpt,
             COALESCE(entry_contents.cleaned_markdown, '') AS content
      FROM entries
      LEFT JOIN entry_contents ON entry_contents.entry_id = entries.id
    `).all() as Array<{ rowid: number; title: string | null; excerpt: string | null; content: string | null }>
    const insert = db.prepare('INSERT OR IGNORE INTO entries_fts (rowid, title, excerpt, content) VALUES (?, ?, ?, ?)')
    const tx = db.transaction(() => {
      for (const row of rows) insert.run(row.rowid, row.title ?? '', row.excerpt ?? '', row.content ?? '')
    })
    tx()
  },
]

function runMigrations(db: Database.Database): void {
  const current = Number((db.pragma('user_version', { simple: true })) ?? 0)
  for (let version = current; version < MIGRATIONS.length; version++) {
    const migrate = MIGRATIONS[version]
    const tx = db.transaction(() => {
      migrate(db)
      db.pragma(`user_version = ${version + 1}`)
    })
    tx()
  }
}

function ensureEntryColumn(db: Database.Database, columnName: string, definition: string): void {
  const columns = db.prepare('PRAGMA table_info(entries)').all() as Array<{ name: string }>
  if (!columns.some((c) => c.name === columnName)) {
    db.exec(`ALTER TABLE entries ADD COLUMN ${columnName} ${definition}`)
  }
}
