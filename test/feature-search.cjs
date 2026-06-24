const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { initDatabaseAtPath } = require('../dist/main/database/init.js')
const { Repository } = require('../dist/main/database/repository.js')

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercury-search-'))
  const db = initDatabaseAtPath(path.join(tempDir, 'mercury.db'))
  const repo = new Repository(db)
  const now = Date.now()
  repo.createFeed({
    id: 'f1', title: 'Feed', feedTitle: 'Feed', customTitle: null,
    url: 'https://e.com/feed.xml', description: null, siteUrl: 'https://e.com',
    faviconUrl: null, refreshIntervalMinutes: 0, lastRefreshedAt: now,
    lastError: null, createdAt: now, updatedAt: now
  })
  repo.upsertEntry({ id: 'e1', feedId: 'f1', title: 'TypeScript Generics Deep Dive',
    url: 'https://e.com/a/1', author: 'A', publishedAt: now, guid: 'g1',
    excerpt: 'understanding generics', isRead: false, createdAt: now })
  repo.upsertEntry({ id: 'e2', feedId: 'f1', title: 'Rust Ownership',
    url: 'https://e.com/a/2', author: 'B', publishedAt: now, guid: 'g2',
    excerpt: 'borrow checker', isRead: false, createdAt: now })

  const hits = repo.searchArticles('generics')
  assert.equal(hits.length, 1)
  assert.equal(hits[0].id, 'e1')

  repo.upsertEntryContent({ entryId: 'e2', rawHtml: null, cleanedHtml: null,
    cleanedMarkdown: 'lifetime annotations explained', fetchedAt: now })
  const hits2 = repo.searchArticles('lifetime')
  assert.equal(hits2.length, 1)
  assert.equal(hits2[0].id, 'e2')

  assert.deepEqual(repo.searchArticles('  '), [])

  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
}

main()
console.log('Search feature tests passed')
process.exit(0)
