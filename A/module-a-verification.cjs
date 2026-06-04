const fs = require('fs')
const os = require('os')
const path = require('path')

const { initDatabaseAtPath } = require('../dist/main/database/init')
const { Repository } = require('../dist/main/database/repository')
const { FeedService } = require('../dist/main/services/FeedService')
const { ArticleService } = require('../dist/main/services/ArticleService')

const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Mercury Test Feed</title>
    <link>https://example.com</link>
    <description>Test feed</description>
    <item>
      <title>First Article</title>
      <link>https://example.com/articles/first</link>
      <guid>first-guid</guid>
      <author>tester</author>
      <pubDate>Mon, 01 Jun 2026 01:00:00 GMT</pubDate>
      <description>First excerpt</description>
    </item>
    <item>
      <title>Second Article</title>
      <link>https://example.com/articles/second</link>
      <guid>second-guid</guid>
      <pubDate>Mon, 01 Jun 2026 02:00:00 GMT</pubDate>
      <description>Second excerpt</description>
    </item>
  </channel>
</rss>`

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercury-module-a-'))
  const dbPath = path.join(tempDir, 'test.db')
  const opmlPath = path.join(tempDir, 'feeds.opml')
  const exportPath = path.join(tempDir, 'export.opml')

  fs.writeFileSync(
    opmlPath,
    `<?xml version="1.0"?><opml version="2.0"><body><outline text="Test" title="Test" type="rss" xmlUrl="https://example.com/feed.xml"/></body></opml>`,
    'utf-8'
  )

  const db = initDatabaseAtPath(dbPath)
  const repository = new Repository(db)
  const fetchText = async (url) => {
    if (url === 'https://example.com/feed.xml') {
      return feedXml
    }
    if (url.startsWith('https://example.com/articles/')) {
      return `<html><body><article>${url}</article></body></html>`
    }
    throw new Error(`Unexpected fetch URL: ${url}`)
  }
  const feedService = new FeedService(repository, fetchText)
  const articleService = new ArticleService(repository, fetchText)

  const feed = await feedService.addFeed('https://example.com/feed.xml')
  const feeds = await feedService.getAllFeeds()
  assert(feeds.length === 1, 'one feed after add')
  assert(feed.title === 'Mercury Test Feed', 'feed title parsed')
  assert(feeds[0].unreadCount === 2, 'unread count from inserted entries')

  const articles = await articleService.getArticlesByFeed(feed.id)
  assert(articles.length === 2, 'two articles inserted')

  await feedService.refreshFeed(feed.id)
  const articlesAfterRefresh = await articleService.getArticlesByFeed(feed.id)
  assert(articlesAfterRefresh.length === 2, 'refresh de-duplicates articles')

  const content = await articleService.getArticleContent(articlesAfterRefresh[0].id)
  assert(Boolean(content.rawHtml), 'raw HTML fetched and stored')

  await articleService.markAsRead(articlesAfterRefresh[0].id)
  const unread = await articleService.getUnreadArticles()
  assert(unread.length === 1, 'mark read updates unread list')

  const imported = await feedService.importOpml(opmlPath)
  assert(imported.feeds.length === 1, 'OPML import returns existing feed')

  await feedService.exportOpml(exportPath)
  assert(fs.existsSync(exportPath), 'OPML export file exists')
  assert(fs.readFileSync(exportPath, 'utf-8').includes('https://example.com/feed.xml'), 'OPML export contains feed URL')

  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })

  console.log('Module A verification passed')
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
