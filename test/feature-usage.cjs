const assert = require('node:assert/strict')
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path')
const { initDatabaseAtPath } = require('../dist/main/database/init.js')
const { Repository } = require('../dist/main/database/repository.js')

function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercury-usage-'))
  const db = initDatabaseAtPath(path.join(tempDir, 'mercury.db'))
  const repo = new Repository(db); const now = Date.now()
  repo.createFeed({ id: 'f1', title: 'F', feedTitle: 'F', customTitle: null, url: 'https://e.com/f.xml', description: null, siteUrl: 'https://e.com', faviconUrl: null, refreshIntervalMinutes: 0, lastRefreshedAt: now, lastError: null, createdAt: now, updatedAt: now })
  repo.upsertEntry({ id: 'e1', feedId: 'f1', title: 'A1', url: 'https://e.com/1', author: 'A', publishedAt: now, guid: 'g1', excerpt: 'x', isRead: false, createdAt: now })

  // 造两条 summary 调用(同模型同日) + 一条 translation
  repo.createAgentRun({ id: 'r1', entryId: 'e1', agentType: 'summary', inputText: 'i', outputText: 'o', status: 'completed', startedAt: now, completedAt: now })
  repo.createLLMUsage({ id: 'u1', agentRunId: 'r1', model: 'gpt-4', promptTokens: 10, completionTokens: 5, totalTokens: 15, createdAt: now })
  repo.createAgentRun({ id: 'r2', entryId: 'e1', agentType: 'summary', inputText: 'i', outputText: 'o', status: 'completed', startedAt: now, completedAt: now })
  repo.createLLMUsage({ id: 'u2', agentRunId: 'r2', model: 'gpt-4', promptTokens: 20, completionTokens: 10, totalTokens: 30, createdAt: now })
  repo.createAgentRun({ id: 'r3', entryId: 'e1', agentType: 'translation', inputText: 'i', outputText: 'o', status: 'completed', startedAt: now, completedAt: now })
  repo.createLLMUsage({ id: 'u3', agentRunId: 'r3', model: 'gpt-4', promptTokens: 100, completionTokens: 50, totalTokens: 150, createdAt: now })

  const stats = repo.getUsageStats()
  // summary 组：2 次，45 tokens；translation 组：1 次，150 tokens
  const summaryRow = stats.find((r) => r.agentType === 'summary')
  const translationRow = stats.find((r) => r.agentType === 'translation')
  assert.ok(summaryRow); assert.equal(summaryRow.requests, 2); assert.equal(summaryRow.totalTokens, 45)
  assert.ok(translationRow); assert.equal(translationRow.requests, 1); assert.equal(translationRow.totalTokens, 150)
  assert.equal(summaryRow.model, 'gpt-4')
  db.close(); fs.rmSync(tempDir, { recursive: true, force: true })
}
main(); console.log('Usage stats tests passed'); process.exit(0)
