const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { initDatabaseAtPath } = require('../dist/main/database/init.js')
const { Repository } = require('../dist/main/database/repository.js')

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercury-star-'))
  const db = initDatabaseAtPath(path.join(tempDir, 'mercury.db'))
  const repo = new Repository(db)
  const now = Date.now()
  repo.createFeed({ id: 'f1', title: 'F', feedTitle: 'F', customTitle: null, url: 'https://e.com/f.xml', description: null, siteUrl: 'https://e.com', faviconUrl: null, refreshIntervalMinutes: 0, lastRefreshedAt: now, lastError: null, createdAt: now, updatedAt: now })
  repo.upsertEntry({ id: 'e1', feedId: 'f1', title: 'A1', url: 'https://e.com/1', author: 'A', publishedAt: now, guid: 'g1', excerpt: 'x', isRead: false, createdAt: now })
  repo.upsertEntry({ id: 'e2', feedId: 'f1', title: 'A2', url: 'https://e.com/2', author: 'B', publishedAt: now, guid: 'g2', excerpt: 'y', isRead: false, createdAt: now })

  assert.equal(repo.getStarredArticles().length, 0)
  repo.setStarred('e1', true)
  const starred = repo.getStarredArticles()
  assert.equal(starred.length, 1)
  assert.equal(starred[0].id, 'e1')
  assert.equal(starred[0].isStarred, true)
  repo.setStarred('e1', false)
  assert.equal(repo.getStarredArticles().length, 0)

  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
}

main()
console.log('Star feature tests passed')
process.exit(0)
