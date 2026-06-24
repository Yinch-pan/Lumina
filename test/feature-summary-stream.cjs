const assert = require('node:assert/strict')
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path')
const { initDatabaseAtPath } = require('../dist/main/database/init.js')
const { Repository } = require('../dist/main/database/repository.js')
const { SummaryService } = require('../dist/main/services/SummaryService.js')

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercury-sumstream-'))
  const db = initDatabaseAtPath(path.join(tempDir, 'mercury.db'))
  const repo = new Repository(db); const now = Date.now()
  repo.createFeed({ id: 'f1', title: 'F', feedTitle: 'F', customTitle: null, url: 'https://e.com/f.xml', description: null, siteUrl: 'https://e.com', faviconUrl: null, refreshIntervalMinutes: 0, lastRefreshedAt: now, lastError: null, createdAt: now, updatedAt: now })
  repo.upsertEntry({ id: 'e1', feedId: 'f1', title: 'T', url: 'https://e.com/1', author: 'A', publishedAt: now, guid: 'g1', excerpt: 'x', isRead: false, createdAt: now })
  repo.upsertEntryContent({ entryId: 'e1', rawHtml: null, cleanedHtml: null, cleanedMarkdown: 'Some article body to summarize.', fetchedAt: now })

  const svc = new SummaryService(repo, () => ({ baseUrl: 'http://invalid-host-xyz/v1', apiKey: 'k', model: 'm' }))

  // 空 articleId 抛错
  await assert.rejects(() => svc.summarizeStream('', 'medium', () => {}))

  // 无效 host → 流式失败抛错，且写入 failed agent_run
  await assert.rejects(() => svc.summarizeStream('e1', 'short', () => {}))
  const run = db.prepare("SELECT * FROM agent_runs WHERE entry_id='e1' AND agent_type='summary'").get()
  assert.ok(run, 'a summary agent_run should be recorded')
  assert.equal(run.status, 'failed')

  db.close(); fs.rmSync(tempDir, { recursive: true, force: true })
}
main().then(() => { console.log('Summary stream tests passed'); process.exit(0) })
  .catch((e) => { console.error(e); process.exit(1) })
