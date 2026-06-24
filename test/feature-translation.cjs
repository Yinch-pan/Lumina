const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { initDatabaseAtPath } = require('../dist/main/database/init.js')
const { Repository } = require('../dist/main/database/repository.js')
const { TranslationService } = require('../dist/main/services/TranslationService.js')

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercury-trans-'))
  const db = initDatabaseAtPath(path.join(tempDir, 'mercury.db'))
  const repo = new Repository(db)
  const now = Date.now()
  repo.createFeed({
    id: 'f1', title: 'F', feedTitle: 'F', customTitle: null, url: 'https://e.com/f.xml',
    description: null, siteUrl: 'https://e.com', faviconUrl: null, refreshIntervalMinutes: 0,
    lastRefreshedAt: now, lastError: null, createdAt: now, updatedAt: now
  })
  repo.upsertEntry({
    id: 'e1', feedId: 'f1', title: 'T', url: 'https://e.com/1', author: 'A',
    publishedAt: now, guid: 'g1', excerpt: 'x', isRead: false, createdAt: now
  })
  repo.upsertEntryContent({
    entryId: 'e1', rawHtml: null, cleanedHtml: null,
    cleanedMarkdown: 'First para.\n\nSecond para.', fetchedAt: now
  })

  const svc = new TranslationService(repo, () => ({
    baseUrl: 'http://invalid-host-xyz/v1', apiKey: 'k', model: 'm'
  }))
  // 无效 host 导致网络不可达，每段重试 3 次后 status=failed，但 onProgress 回调次数 = 段数 = 2
  const progress = []
  const result = await svc.translate('e1', '中文', (seg, total) => progress.push({ seg, total }))
  // 验证回调次数 = 段数，结果包含原文(失败保留)
  assert.equal(progress.length, 2)
  assert.equal(progress[0].total, 2)
  assert.equal(progress[0].seg.status, 'failed')
  assert.ok(result.includes('First para.'))
  assert.ok(result.includes('Second para.'))
  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
}

main()
  .then(() => {
    console.log('Translation feature tests passed')
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
