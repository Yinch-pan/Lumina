const assert = require('node:assert/strict')
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path')
const { initDatabaseAtPath } = require('../dist/main/database/init.js')
const { Repository } = require('../dist/main/database/repository.js')

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercury-scroll-'))
  const db = initDatabaseAtPath(path.join(tempDir, 'mercury.db'))
  const repo = new Repository(db); const now = Date.now()
  repo.createFeed({ id: 'f1', title: 'F', feedTitle: 'F', customTitle: null, url: 'https://e.com/f.xml', description: null, siteUrl: 'https://e.com', faviconUrl: null, refreshIntervalMinutes: 0, lastRefreshedAt: now, lastError: null, createdAt: now, updatedAt: now })
  repo.upsertEntry({ id: 'e1', feedId: 'f1', title: 'A1', url: 'https://e.com/1', author: 'A', publishedAt: now, guid: 'g1', excerpt: 'x', isRead: false, createdAt: now })
  // 默认 0
  let c = repo.getArticleContent('e1')
  assert.equal(c.scrollPercent, 0)
  // 保存后读回
  repo.saveScrollPercent('e1', 0.42)
  c = repo.getArticleContent('e1')
  assert.ok(Math.abs(c.scrollPercent - 0.42) < 1e-9)
  db.close(); fs.rmSync(tempDir, { recursive: true, force: true })
}
main(); console.log('Scroll feature tests passed'); process.exit(0)
