/**
 * better-sqlite3 compatible synchronous wrapper around sql.js (WASM).
 * This allows us to avoid native C++ compilation issues with Electron.
 */
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import fs from 'fs'
import path from 'path'

// Global sync database instance
let _sqlJs: Awaited<ReturnType<typeof initSqlJs>> | null = null
let _db: SqlJsDatabase | null = null
let _dbPath: string = ''

/**
 * Initialize sql.js and open/create the database file.
 * Must be called once before any other database operation.
 */
export function openDatabase(dbPath: string): void {
  if (_db) return

  // sql.js init is async but we need sync — use a cached promise workaround
  // In practice, initSqlJs is very fast (just loads WASM)
  if (!_sqlJs) {
    throw new Error('sql.js not initialized. Call await initSqlJsWrapper() first.')
  }

  _dbPath = dbPath

  // Ensure directory exists
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    _db = new _sqlJs.Database(buffer)
  } else {
    _db = new _sqlJs.Database()
  }
}

/**
 * Async init function — must be called once at app startup.
 */
export async function initSqlJsWrapper(): Promise<void> {
  if (!_sqlJs) {
    _sqlJs = await initSqlJs()
  }
}

/**
 * Save the database to disk after mutations.
 */
function saveToDisk(): void {
  if (_db && _dbPath) {
    const data = _db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(_dbPath, buffer)
  }
}

/**
 * Get the database instance.
 */
export function getDatabase(): SqlJsDatabase {
  if (!_db) throw new Error('Database not opened. Call openDatabase() first.')
  return _db
}

/**
 * Close the database.
 */
export function closeDatabase(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}

/**
 * A prepared statement wrapper that mimics better-sqlite3's Statement API.
 */
class Statement {
  private db: SqlJsDatabase
  private sql: string

  constructor(db: SqlJsDatabase, sql: string) {
    this.db = db
    this.sql = sql
  }

  run(...params: any[]): { changes: number } {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params
    this.db.run(this.sql, flatParams)
    const changes = this.db.exec('SELECT changes() as c')[0]?.values[0][0] as number
    saveToDisk()
    return { changes }
  }

  all(...params: any[]): any[] {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params
    const stmt = this.db.prepare(this.sql)
    if (flatParams.length > 0) {
      stmt.bind(flatParams)
    }
    const results: any[] = []
    while (stmt.step()) {
      results.push(stmt.getAsObject())
    }
    stmt.free()
    return results
  }

  get(...params: any[]): any | undefined {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params
    const stmt = this.db.prepare(this.sql)
    if (flatParams.length > 0) {
      stmt.bind(flatParams)
    }
    let result: any = undefined
    if (stmt.step()) {
      result = stmt.getAsObject()
    }
    stmt.free()
    return result
  }
}

/**
 * A Database wrapper that mimics better-sqlite3's Database API.
 */
export class BetterSqlite3Compat {
  private db: SqlJsDatabase

  constructor(dbPath: string) {
    // This constructor is called from initDatabase() after sql.js is initialized
    openDatabase(dbPath)
    this.db = getDatabase()
  }

  exec(sql: string): void {
    this.db.run(sql)
    saveToDisk()
  }

  prepare(sql: string): Statement {
    return new Statement(this.db, sql)
  }

  close(): void {
    closeDatabase()
  }
}
