import * as path from 'path'
import { app } from 'electron'
import { BetterSqlite3Compat } from './sqlite-wrapper'

/**
 * 数据库初始化脚本
 * 定义所有表结构
 */

export function initDatabase(): BetterSqlite3Compat {
  const dbPath = path.join(app.getPath('userData'), 'mercury.db')
  const db = new BetterSqlite3Compat(dbPath)

  // 创建 feeds 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      description TEXT,
      site_url TEXT,
      favicon_url TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

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

  return db
}
