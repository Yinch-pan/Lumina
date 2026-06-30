const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { initDatabaseAtPath } = require('../dist/main/database/init.js')
const { Repository } = require('../dist/main/database/repository.js')
const { FeedService } = require('../dist/main/services/FeedService.js')
const { CleaningService } = require('../dist/main/services/CleaningService.js')

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercury-feed-import-'))
  const db = initDatabaseAtPath(path.join(tempDir, 'mercury.db'))
  const repository = new Repository(db)

  const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Antirez Style Feed</title>
      <link>https://antirez.com/</link>
      <description>Test feed</description>
      <item>
        <title>Post One</title>
        <link>https://antirez.com/news/1</link>
        <guid>post-1</guid>
        <description><![CDATA[<p>RSS body one</p>]]></description>
      </item>
      <item>
        <title>Post Two</title>
        <link>https://antirez.com/news/2</link>
        <guid>post-2</guid>
        <description><![CDATA[<p>RSS body two</p>]]></description>
      </item>
    </channel>
  </rss>`

  const articleHtmlByUrl = new Map([
    ['https://antirez.com/rss', feedXml],
    ['https://antirez.com/news/1', '<article><h1>Post One</h1><p>Fetched body one</p></article>'],
    ['https://antirez.com/news/2', '<article><h1>Post Two</h1><p>Fetched body two</p></article>']
  ])

  const fetchCalls = []
  const fetchText = async (url) => {
    fetchCalls.push(url)
    const value = articleHtmlByUrl.get(url)
    if (!value) throw new Error(`Unexpected URL: ${url}`)
    return value
  }

  const service = new FeedService(repository, fetchText, new CleaningService())
  const added = await service.addFeed('https://antirez.com/rss')
  assert.equal(added.title, 'Antirez Style Feed')

  const feeds = repository.getAllFeeds()
  assert.equal(feeds.length, 1)

  const articles = repository.getArticlesByFeed(added.id)
  assert.equal(articles.length, 2)

  const firstContent = repository.getArticleContent(articles[0].id)
  const secondContent = repository.getArticleContent(articles[1].id)
  assert.match(firstContent.cleanedHtml || '', /RSS body (one|two)/)
  assert.match(secondContent.cleanedHtml || '', /RSS body (one|two)/)

  await new Promise((resolve) => setImmediate(resolve))
  await new Promise((resolve) => setTimeout(resolve, 10))
  assert.equal(fetchCalls.filter((url) => url === 'https://antirez.com/rss').length, 1)
  assert.equal(fetchCalls.includes('https://antirez.com/news/1'), false)
  assert.equal(fetchCalls.includes('https://antirez.com/news/2'), false)

  const enrichedFirst = repository.getArticleContent(articles[0].id)
  const enrichedSecond = repository.getArticleContent(articles[1].id)
  const combined = `${enrichedFirst.cleanedHtml || ''} ${enrichedSecond.cleanedHtml || ''}`
  assert.match(combined, /RSS body (one|two)/)

  db.close()
  fs.rmSync(tempDir, { recursive: true, force: true })
}

main().then(() => {
  console.log('Feed import feature tests passed')
  process.exit(0)
}).catch((error) => {
  console.error(error)
  process.exit(1)
})
