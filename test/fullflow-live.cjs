const assert = require('node:assert/strict')
const fs = require('node:fs')
const http = require('node:http')
const os = require('node:os')
const path = require('node:path')

const { initDatabaseAtPath } = require('../dist/main/database/init.js')
const { Repository } = require('../dist/main/database/repository.js')
const { FeedService } = require('../dist/main/services/FeedService.js')
const { ArticleService } = require('../dist/main/services/ArticleService.js')
const { TagService } = require('../dist/main/services/TagService.js')
const { SettingsService } = require('../dist/main/services/SettingsService.js')
const { SummaryService } = require('../dist/main/services/SummaryService.js')
const { TranslationService } = require('../dist/main/services/TranslationService.js')
const { ExportService } = require('../dist/main/services/ExportService.js')

const rssBaseUrl = 'http://127.0.0.1:8787'

async function main() {
  await assertHttp(`${rssBaseUrl}/feed/basic.xml`)
  await fetch(`${rssBaseUrl}/control/growing/reset`)
  await fetch(`${rssBaseUrl}/control/flaky/ok`)
  const mockLlm = await startMockLlmServer()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercury-fullflow-'))
  const db = initDatabaseAtPath(path.join(tempDir, 'mercury.db'))

  try {
    const repository = new Repository(db)
    const feedService = new FeedService(repository)
    const articleService = new ArticleService(repository)
    const tagService = new TagService(repository)
    const settingsService = new SettingsService(repository)
    const summaryService = new SummaryService(repository, () => settingsService.getLLMConfig())
    const translationService = new TranslationService(repository, () => settingsService.getLLMConfig())
    const exportService = new ExportService(repository)

    await settingsService.saveLLMConfig({
      baseUrl: mockLlm.baseUrl,
      apiKey: 'test-key',
      model: 'mock-model'
    })

    const basicFeed = await feedService.addFeed(`${rssBaseUrl}/feed/basic.xml`)
    assert.equal(basicFeed.title, 'Mercury Basic Feed')
    assert.equal(basicFeed.unreadCount, 2)

    let basicArticles = await articleService.getArticlesByFeed(basicFeed.id)
    assert.equal(basicArticles.length, 2)
    assert.equal(basicArticles.filter((article) => !article.isRead).length, 2)

    const articleContent = await articleService.getArticleContent(basicArticles[0].id)
    assert.match(articleContent.rawHtml, /Module A test server/)
    assert.match(articleContent.cleanedHtml || '', /<article>/)
    assert.match(articleContent.cleanedMarkdown || '', /raw HTML served/)

    await articleService.markAsRead(basicArticles[0].id)
    assert.equal((await articleService.getUnreadArticles()).length, 1)
    await articleService.markAsUnread(basicArticles[0].id)
    assert.equal((await articleService.getUnreadArticles()).length, 2)

    await tagService.addTagToArticle(basicArticles[0].id, '验收')
    assert.deepEqual((await tagService.getArticleTags(basicArticles[0].id)).map((tag) => tag.name), ['验收'])
    assert.equal((await tagService.getArticlesByTag('验收')).length, 1)

    const summary = await summaryService.summarize(basicArticles[0].id)
    assert.match(summary, /Mock summary/)
    const translation = await translationService.translate(basicArticles[0].id, '中文')
    assert.match(translation, /Mock translation/)
    const usageRows = db.prepare('SELECT * FROM llm_usage ORDER BY created_at').all()
    assert.equal(usageRows.length, 2)
    assert.equal(usageRows[0].total_tokens, 18)

    const exportPath = path.join(tempDir, 'article.md')
    await exportService.exportArticle(basicArticles[0].id, exportPath)
    const exported = fs.readFileSync(exportPath, 'utf-8')
    assert.match(exported, /^# Basic Article Two|^# Basic Article One/m)
    assert.match(exported, /标签：验收/)
    assert.match(exported, /Mock summary/)
    assert.match(exported, /Mock translation/)

    const growingFeed = await feedService.addFeed(`${rssBaseUrl}/feed/growing.xml`)
    assert.equal((await articleService.getArticlesByFeed(growingFeed.id)).length, 2)
    await fetch(`${rssBaseUrl}/control/growing/add`)
    await feedService.refreshFeed(growingFeed.id)
    assert.equal((await articleService.getArticlesByFeed(growingFeed.id)).length, 3)

    const duplicateFeed = await feedService.addFeed(`${rssBaseUrl}/feed/duplicates.xml`)
    assert.equal((await articleService.getArticlesByFeed(duplicateFeed.id)).length, 3)
    await feedService.refreshFeed(duplicateFeed.id)
    assert.equal((await articleService.getArticlesByFeed(duplicateFeed.id)).length, 3)

    await fetch(`${rssBaseUrl}/control/flaky/ok`)
    const flakyFeed = await feedService.addFeed(`${rssBaseUrl}/feed/flaky.xml`)
    await fetch(`${rssBaseUrl}/control/flaky/fail`)
    await assert.rejects(() => feedService.refreshFeed(flakyFeed.id), /HTTP 503/)
    const flakyAfterFailure = (await feedService.getAllFeeds()).find((feed) => feed.id === flakyFeed.id)
    assert.match(flakyAfterFailure.lastError || '', /HTTP 503/)
    await fetch(`${rssBaseUrl}/control/flaky/ok`)

    const preview = await feedService.previewOpml(path.join(process.cwd(), 'test/opml/module-a-preview-status.opml'))
    assert(preview.some((feed) => feed.status === 'existing'))
    assert(preview.some((feed) => feed.status === 'duplicate'))
    assert(preview.some((feed) => feed.status === 'invalid'))
    assert(preview.some((feed) => feed.status === 'new'))

    const opmlExportPath = path.join(tempDir, 'feeds.opml')
    await feedService.exportOpml(opmlExportPath)
    assert.match(fs.readFileSync(opmlExportPath, 'utf-8'), /Mercury Basic Feed/)

    console.log('Full live flow verification passed')
  } finally {
    db.close()
    fs.rmSync(tempDir, { recursive: true, force: true })
    await mockLlm.close()
  }
}

async function assertHttp(url) {
  const response = await fetch(url)
  assert.equal(response.ok, true, `${url} should be reachable`)
}

function startMockLlmServer() {
  const server = http.createServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
      response.writeHead(404)
      response.end('not found')
      return
    }

    let body = ''
    request.on('data', (chunk) => {
      body += chunk
    })
    request.on('end', () => {
      const payload = JSON.parse(body)
      const prompt = String(payload.messages?.[0]?.content || '')
      const content = prompt.includes('翻译') ? 'Mock translation: 这是一段译文。' : 'Mock summary: 这是一段摘要。'
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({
        id: 'chatcmpl-mock',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: payload.model || 'mock-model',
        choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 12, completion_tokens: 6, total_tokens: 18 }
      }))
    })
  })

  return new Promise((resolve, reject) => {
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve({
        baseUrl: `http://127.0.0.1:${address.port}/v1`,
        close: () => new Promise((done) => server.close(done))
      })
    })
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
