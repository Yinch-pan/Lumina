const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { initDatabaseAtPath } = require('../dist/main/database/init.js')
const { Repository } = require('../dist/main/database/repository.js')
const { ContentCleaner } = require('../dist/main/cleaners/cleaner.js')
const { ArticleService } = require('../dist/main/services/ArticleService.js')
const { TagService } = require('../dist/main/services/TagService.js')
const { SettingsService } = require('../dist/main/services/SettingsService.js')
const { ExportService } = require('../dist/main/services/ExportService.js')

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercury-services-'))
  const db = initDatabaseAtPath(path.join(tempDir, 'mercury.db'))
  const repository = new Repository(db)
  const now = Date.now()

  repository.createFeed({
    id: 'feed-1',
    title: 'Test Feed',
    feedTitle: 'Test Feed',
    customTitle: null,
    url: 'https://example.com/feed.xml',
    description: null,
    siteUrl: 'https://example.com',
    faviconUrl: null,
    refreshIntervalMinutes: 0,
    lastRefreshedAt: now,
    lastError: null,
    createdAt: now,
    updatedAt: now
  })
  repository.upsertEntry({
    id: 'entry-1',
    feedId: 'feed-1',
    title: 'Readable Article',
    url: 'https://example.com/articles/1',
    author: 'Alice',
    publishedAt: now,
    guid: 'entry-guid-1',
    excerpt: 'Short excerpt',
    isRead: false,
    createdAt: now
  })
  repository.upsertEntry({
    id: 'entry-rss-only',
    feedId: 'feed-1',
    title: 'RSS Only Article',
    url: 'https://example.com/articles/rss-only',
    author: 'Bob',
    publishedAt: now,
    guid: 'entry-guid-rss-only',
    excerpt: 'RSS excerpt',
    isRead: false,
    createdAt: now
  })

  const cleaner = new ContentCleaner()
  const cleaned = cleaner.clean('<article><h1>Readable Article</h1><p>Hello <a href="/x">Mercury</a>.</p><script>alert(1)</script></article>', 'https://example.com/articles/1')
  assert.match(cleaned.cleanedHtml, /Readable Article/)
  assert.doesNotMatch(cleaned.cleanedHtml, /script|alert\(1\)/)
  assert.match(cleaned.cleanedMarkdown, /Hello \[Mercury\]/)

  repository.upsertEntryContent({
    entryId: 'entry-1',
    rawHtml: '<article><p>Hello Mercury.</p></article>',
    cleanedHtml: cleaned.cleanedHtml,
    cleanedMarkdown: cleaned.cleanedMarkdown,
    fetchedAt: now
  })
  repository.upsertEntryContent({
    entryId: 'entry-rss-only',
    rawHtml: '<article><p>RSS supplied body</p></article>',
    cleanedHtml: '<article><p>RSS supplied body</p></article>',
    cleanedMarkdown: 'RSS supplied body',
    fetchedAt: now
  })

  const tags = new TagService(repository)
  await tags.addTagToArticle('entry-1', '技术')
  await tags.addTagToArticle('entry-1', '技术')
  assert.deepEqual((await tags.getArticleTags('entry-1')).map((tag) => tag.name), ['技术'])
  assert.equal((await tags.getArticlesByTag('技术'))[0].id, 'entry-1')

  const settings = new SettingsService(repository)
  await settings.saveLLMConfig({ baseUrl: 'https://api.example.com/v1', apiKey: 'secret', model: 'demo-model' })
  assert.deepEqual(await settings.getLLMConfig(), {
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'secret',
    model: 'demo-model'
  })

  const exportPath = path.join(tempDir, 'article.md')
  const fetchCalls = []
  const articleService = new ArticleService(repository, async (url) => {
    fetchCalls.push(url)
    return '<article><p>Fetched fallback body</p></article>'
  })
  const rssOnlyContent = await articleService.getArticleContent('entry-rss-only')
  assert.match(rssOnlyContent.cleanedHtml || '', /RSS supplied body/)
  assert.equal(fetchCalls.length, 0)
  const exporter = new ExportService(repository, articleService)
  await exporter.exportArticle('entry-1', exportPath)
  const markdown = fs.readFileSync(exportPath, 'utf-8')
  assert.match(markdown, /^# Readable Article/m)
  assert.match(markdown, /example\.com\/articles\/1/)
  assert.match(markdown, /技术/)
  assert.match(markdown, /Hello \[Mercury\]/)

  const rssOnlyExportPath = path.join(tempDir, 'rss-only.md')
  await exporter.exportArticle('entry-rss-only', rssOnlyExportPath)
  const rssOnlyMarkdown = fs.readFileSync(rssOnlyExportPath, 'utf-8')
  assert.match(rssOnlyMarkdown, /RSS supplied body/)

  repository.createAgentRun({
    id: 'run-1',
    entryId: 'entry-1',
    agentType: 'summary',
    inputText: cleaned.cleanedMarkdown,
    outputText: '短摘要',
    status: 'completed',
    startedAt: now,
    completedAt: now
  })
  repository.createLLMUsage({
    id: 'usage-1',
    agentRunId: 'run-1',
    model: 'demo-model',
    promptTokens: 10,
    completionTokens: 5,
    totalTokens: 15,
    createdAt: now
  })
  const usage = db.prepare('SELECT * FROM llm_usage WHERE id = ?').get('usage-1')
  assert.equal(usage.total_tokens, 15)

  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
}

main()
  .then(() => {
    console.log('Services regression tests passed')
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
