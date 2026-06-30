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
  repo.upsertEntry({ id: 'e3', feedId: 'f1', title: 'React Performance Guide',
    url: 'https://e.com/a/3', author: 'C', publishedAt: now - 1000, guid: 'g3',
    excerpt: 'render optimization', isRead: false, createdAt: now - 1000 })
  repo.upsertEntry({ id: 'e4', feedId: 'f1', title: '前端工程实践',
    url: 'https://e.com/a/4', author: 'D', publishedAt: now + 2000, guid: 'g4',
    excerpt: '中文摘要', isRead: false, createdAt: now + 2000 })
  repo.upsertEntry({ id: 'e5', feedId: 'f1', title: 'Weekly Notes',
    url: 'https://e.com/a/5', author: 'E', publishedAt: now + 5000, guid: 'g5',
    excerpt: 'misc notes', isRead: false, createdAt: now + 5000 })

  const hits = repo.searchArticles('generics')
  assert.equal(hits.length, 1)
  assert.equal(hits[0].id, 'e1')

  // 英文前缀模糊搜索（标题）
  const prefixTitleHits = repo.searchArticles('gener')
  assert.equal(prefixTitleHits.length, 1)
  assert.equal(prefixTitleHits[0].id, 'e1')

  repo.upsertEntryContent({ entryId: 'e2', rawHtml: null, cleanedHtml: null,
    cleanedMarkdown: 'lifetime annotations explained', fetchedAt: now })
  const hits2 = repo.searchArticles('lifetime')
  assert.equal(hits2.length, 1)
  assert.equal(hits2[0].id, 'e2')

  // 英文前缀模糊搜索（正文）
  const prefixBodyHits = repo.searchArticles('lifet')
  assert.equal(prefixBodyHits.length, 1)
  assert.equal(prefixBodyHits[0].id, 'e2')

  repo.upsertEntryContent({ entryId: 'e4', rawHtml: null, cleanedHtml: null,
    cleanedMarkdown: '这篇文章讲机器学习和中文搜索。', fetchedAt: now })
  repo.upsertEntryContent({ entryId: 'e5', rawHtml: null, cleanedHtml: null,
    cleanedMarkdown: 'A long note about react performance in the body only.', fetchedAt: now })

  // 中文标题搜索
  const chineseTitleHits = repo.searchArticles('前端')
  assert.equal(chineseTitleHits.length, 1)
  assert.equal(chineseTitleHits[0].id, 'e4')

  // 中文正文搜索
  const chineseBodyHits = repo.searchArticles('机器')
  assert.equal(chineseBodyHits.length, 1)
  assert.equal(chineseBodyHits[0].id, 'e4')

  // 标题优先于正文，即便正文命中的文章更新
  const rankingHits = repo.searchArticles('react')
  assert.equal(rankingHits.length, 2)
  assert.equal(rankingHits[0].id, 'e3')
  assert.equal(rankingHits[1].id, 'e5')

  assert.deepEqual(repo.searchArticles('  '), [])

  // 纯标点查询不应抛错，返回空结果
  assert.deepEqual(repo.searchArticles('!!!'), [])
  assert.deepEqual(repo.searchArticles('---'), [])

  // 删除订阅源后，其文章的 FTS 索引行应一并清理(不留孤儿)
  assert.equal(repo.searchArticles('generics').length, 1)
  repo.deleteFeed('f1')
  assert.deepEqual(repo.searchArticles('generics'), [])
  assert.deepEqual(repo.searchArticles('lifetime'), [])
  assert.deepEqual(repo.searchArticles('前端'), [])
  assert.deepEqual(repo.searchArticles('react'), [])

  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
}

main()
console.log('Search feature tests passed')
process.exit(0)
