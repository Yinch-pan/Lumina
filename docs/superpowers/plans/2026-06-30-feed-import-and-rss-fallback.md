# Feed Import and RSS Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make large feed imports return quickly while storing RSS-provided content for immediate reading and enriching article bodies asynchronously in the background.

**Architecture:** Split feed import into two phases inside `FeedService`: a synchronous phase that creates the feed, entries, and any RSS-derived article content, and a best-effort asynchronous phase that fetches and cleans fuller webpage content. Keep `ArticleService` conservative by returning already-stored readable content before attempting webpage fetches, so antirez-style feeds are readable immediately.

**Tech Stack:** Electron main process, TypeScript, `rss-parser`, SQLite via `better-sqlite3`, existing `CleaningService`, Node-style `.cjs` regression tests executed via Electron runtime.

---

## File Structure

- Modify: `src/main/services/FeedService.ts`
  - Add richer RSS item field support, persist RSS-derived article bodies during import, and launch asynchronous enrichment after initial import returns.
- Modify: `src/main/services/ArticleService.ts`
  - Return stored readable content first and fetch webpage HTML only when article content is still missing.
- Modify: `src/main/services/interfaces.ts`
  - Update service contract comments or signatures only if helper behavior needs to be described more clearly.
- Modify: `src/main/index.ts`
  - Only if service construction needs a small dependency wiring change for testability.
- Modify: `test/services-regression.cjs`
  - Add regression coverage for RSS-derived body fallback in article reads and exports.
- Create: `test/feature-feed-import.cjs`
  - Add focused regression coverage for “return early + background enrichment launch” and RSS-body persistence during feed import.

## Task 1: Add a Focused Feed Import Regression Test

**Files:**
- Create: `test/feature-feed-import.cjs`
- Modify: `src/main/services/FeedService.ts`
- Test: `test/feature-feed-import.cjs`

- [ ] **Step 1: Write the failing test**

Create `test/feature-feed-import.cjs` with this content:

```js
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { initDatabaseAtPath } = require('../dist/main/database/init.js')
const { Repository } = require('../dist/main/database/repository.js')
const { FeedService } = require('../dist/main/services/FeedService.js')

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

  const service = new FeedService(repository, fetchText)
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
  assert(fetchCalls.includes('https://antirez.com/news/1'))
  assert(fetchCalls.includes('https://antirez.com/news/2'))

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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run build:main && npx electron --no-sandbox test/feature-feed-import.cjs
```

Expected: FAIL because `FeedService.addFeed()` does not yet persist RSS-derived article bodies and may not launch the asynchronous enrichment path in a way the test can observe.

- [ ] **Step 3: Write minimal implementation in `FeedService` to persist RSS article bodies and trigger background enrichment**

In `src/main/services/FeedService.ts`, make these focused changes.

First, expand `ParsedFeedItem` so richer RSS body fields can be read:

```ts
interface ParsedFeedItem {
  title?: string
  link?: string
  guid?: string
  id?: string
  creator?: string
  author?: string
  pubDate?: string
  isoDate?: string
  contentSnippet?: string
  content?: string
  'content:encoded'?: string
  summary?: string
}
```

Then add a helper pair near `saveFeedItems()`:

```ts
function pickRssBody(item: ParsedFeedItem): { rawHtml: string | null; cleanedHtml: string | null; cleanedMarkdown: string | null } {
  const html = item['content:encoded']?.trim() || item.content?.trim() || item.summary?.trim() || ''
  if (html) {
    const cleanedHtml = sanitizeFeedHtml(html)
    return {
      rawHtml: html,
      cleanedHtml,
      cleanedMarkdown: normalizeExcerpt(cleanedHtml)
    }
  }

  const snippet = item.contentSnippet?.trim() || ''
  if (!snippet) {
    return { rawHtml: null, cleanedHtml: null, cleanedMarkdown: null }
  }

  const escaped = escapeHtml(snippet)
  return {
    rawHtml: null,
    cleanedHtml: `<article><p>${escaped}</p></article>`,
    cleanedMarkdown: snippet
  }
}

function sanitizeFeedHtml(value: string): string {
  return value.trim().startsWith('<article') ? value.trim() : `<article>${value.trim()}</article>`
}
```

Change `saveFeedItems()` to return the imported entry IDs and persist RSS-derived body content immediately:

```ts
private saveFeedItems(feedId: string, items: ParsedFeedItem[], feed: { url: string }): string[] {
  const now = Date.now()
  const entryIds: string[] = []

  for (const item of items) {
    const url = item.link?.trim() || item.guid?.trim() || item.id?.trim()
    if (!url) {
      continue
    }
    const normalizedUrl = normalizeEntryUrl(url, feed.url)
    const entryId = randomUUID()

    this.repository.upsertEntry({
      id: entryId,
      feedId,
      title: item.title?.trim() || normalizedUrl,
      url: normalizedUrl,
      author: item.creator ?? item.author ?? null,
      publishedAt: parseDate(item.isoDate ?? item.pubDate),
      guid: item.guid ?? item.id ?? null,
      excerpt: normalizeExcerpt(item.contentSnippet ?? item.summary ?? item.content ?? ''),
      isRead: false,
      createdAt: now
    })

    const initialContent = pickRssBody(item)
    if (initialContent.rawHtml || initialContent.cleanedHtml || initialContent.cleanedMarkdown) {
      this.repository.upsertEntryContent({
        entryId,
        rawHtml: initialContent.rawHtml,
        cleanedHtml: initialContent.cleanedHtml,
        cleanedMarkdown: initialContent.cleanedMarkdown,
        fetchedAt: now
      })
    }

    entryIds.push(entryId)
  }

  return entryIds
}
```

Add a background enrichment helper on the class:

```ts
private startAsyncEnrichment(entryIds: string[]): void {
  void Promise.resolve().then(async () => {
    for (const entryId of entryIds) {
      try {
        const entry = this.repository.getEntryRowById(entryId)
        const content = this.repository.getArticleContent(entryId)
        if (!entry || !content || content.rawHtml) {
          continue
        }

        const rawHtml = await this.fetchText(entry.url)
        this.repository.upsertEntryContent({
          entryId,
          rawHtml,
          cleanedHtml: null,
          cleanedMarkdown: null,
          fetchedAt: Date.now()
        })
      } catch (error) {
        console.error(`Async enrichment failed for ${entryId}:`, error)
      }
    }
  })
}
```

Finally, use the new return value in `addFeed()`:

```ts
const importedEntryIds = this.saveFeedItems(feedId, parsed.items, { url: normalizedUrl })
this.startAsyncEnrichment(importedEntryIds)
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run build:main && npx electron --no-sandbox test/feature-feed-import.cjs
```

Expected: PASS with `Feed import feature tests passed`.

- [ ] **Step 5: Commit**

```bash
git add test/feature-feed-import.cjs src/main/services/FeedService.ts
git commit -m "feat: store rss bodies during feed import"
```

## Task 2: Make Article Reads Prefer Stored Readable Content

**Files:**
- Modify: `src/main/services/ArticleService.ts`
- Modify: `test/services-regression.cjs`
- Test: `test/services-regression.cjs`

- [ ] **Step 1: Write the failing test**

In `test/services-regression.cjs`, add this block after the initial `repository.upsertEntry(...)` setup and before the existing export assertions:

```js
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

  repository.upsertEntryContent({
    entryId: 'entry-rss-only',
    rawHtml: '<article><p>RSS supplied body</p></article>',
    cleanedHtml: '<article><p>RSS supplied body</p></article>',
    cleanedMarkdown: 'RSS supplied body',
    fetchedAt: now
  })
```

Then replace the `ArticleService` instantiation and add these assertions:

```js
  const fetchCalls = []
  const articleService = new ArticleService(repository, async (url) => {
    fetchCalls.push(url)
    return '<article><p>Fetched fallback body</p></article>'
  })

  const rssOnlyContent = await articleService.getArticleContent('entry-rss-only')
  assert.match(rssOnlyContent.cleanedHtml || '', /RSS supplied body/)
  assert.equal(fetchCalls.length, 0)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run build:main && npx electron --no-sandbox test/services-regression.cjs
```

Expected: FAIL if `ArticleService.getArticleContent()` still fetches webpage content too eagerly or does not preserve the already-stored readable content path when only RSS-derived content is present.

- [ ] **Step 3: Write minimal implementation in `ArticleService`**

In `src/main/services/ArticleService.ts`, keep the logic small and explicit. Replace the current fetch/clean branch with this structure:

```ts
  async getArticleContent(articleId: string): Promise<ArticleContent> {
    const entry = this.repository.getEntryRowById(articleId)
    if (!entry) {
      throw new Error(`Article not found: ${articleId}`)
    }

    let content = this.repository.getArticleContent(articleId)
    if (!content) {
      throw new Error(`Article content cannot be loaded: ${articleId}`)
    }

    const hasReadableContent = Boolean(
      content.cleanedHtml?.trim() || content.cleanedMarkdown?.trim() || content.rawHtml?.trim()
    )

    if (!hasReadableContent) {
      const rawHtml = await this.fetchText(entry.url)
      this.repository.upsertEntryContent({
        entryId: articleId,
        rawHtml,
        cleanedHtml: null,
        cleanedMarkdown: null,
        fetchedAt: Date.now()
      })
      content = this.repository.getArticleContent(articleId)
    }

    if (content?.rawHtml && (!content.cleanedHtml || !content.cleanedMarkdown)) {
      const cleaned = await this.cleaningService.clean(content.rawHtml, entry.url)
      this.repository.upsertEntryContent({
        entryId: articleId,
        rawHtml: content.rawHtml,
        cleanedHtml: cleaned.cleanedHtml,
        cleanedMarkdown: cleaned.cleanedMarkdown,
        fetchedAt: Date.now()
      })
      content = this.repository.getArticleContent(articleId)
    }

    if (!content) {
      throw new Error(`Article content cannot be loaded after cleaning: ${articleId}`)
    }

    return content
  }
```

This preserves on-demand webpage fetch as a last resort instead of a first resort.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run build:main && npx electron --no-sandbox test/services-regression.cjs
```

Expected: PASS with `Services regression tests passed`.

- [ ] **Step 5: Commit**

```bash
git add src/main/services/ArticleService.ts test/services-regression.cjs
git commit -m "fix: prefer stored rss content for article reads"
```

## Task 3: Upgrade Background Enrichment to Store Cleaned Content

**Files:**
- Modify: `src/main/services/FeedService.ts`
- Modify: `src/main/index.ts` (only if dependency injection is needed)
- Test: `test/feature-feed-import.cjs`

- [ ] **Step 1: Strengthen the failing test**

In `test/feature-feed-import.cjs`, after the `setImmediate` wait and fetch assertions, add this second wait and verification block:

```js
  await new Promise((resolve) => setTimeout(resolve, 10))

  const enrichedFirst = repository.getArticleContent(articles[0].id)
  const enrichedSecond = repository.getArticleContent(articles[1].id)
  const combined = `${enrichedFirst.cleanedHtml || ''} ${enrichedSecond.cleanedHtml || ''}`
  assert.match(combined, /Fetched body (one|two)/)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm run build:main && npx electron --no-sandbox test/feature-feed-import.cjs
```

Expected: FAIL because the asynchronous enrichment path currently stores fetched `rawHtml` but does not run `CleaningService`, so the cleaned content remains RSS-only.

- [ ] **Step 3: Write minimal implementation to clean enriched content**

Update `FeedService` to accept an optional cleaning dependency.

In `src/main/services/FeedService.ts`, add the import and constructor shape:

```ts
import { CleaningService } from './CleaningService'
import { ICleaningService, IFeedService } from './interfaces'

export class FeedService implements IFeedService {
  private readonly parser = new Parser()
  private readonly cleaningService: ICleaningService

  constructor(
    private readonly repository: Repository,
    private readonly fetchText: FetchText = defaultFetchText,
    cleaningService: ICleaningService = new CleaningService()
  ) {
    this.cleaningService = cleaningService
  }
```

Then update `startAsyncEnrichment()` so it cleans the fetched HTML before storing it:

```ts
  private startAsyncEnrichment(entryIds: string[]): void {
    void Promise.resolve().then(async () => {
      for (const entryId of entryIds) {
        try {
          const entry = this.repository.getEntryRowById(entryId)
          const content = this.repository.getArticleContent(entryId)
          if (!entry || !content) {
            continue
          }

          const alreadyEnriched = Boolean(content.rawHtml?.trim() && content.cleanedHtml?.trim() && content.cleanedMarkdown?.trim())
          if (alreadyEnriched) {
            continue
          }

          const rawHtml = await this.fetchText(entry.url)
          const cleaned = await this.cleaningService.clean(rawHtml, entry.url)
          this.repository.upsertEntryContent({
            entryId,
            rawHtml,
            cleanedHtml: cleaned.cleanedHtml,
            cleanedMarkdown: cleaned.cleanedMarkdown,
            fetchedAt: Date.now()
          })
        } catch (error) {
          console.error(`Async enrichment failed for ${entryId}:`, error)
        }
      }
    })
  }
```

If service wiring needs to pass the existing singleton cleaner, change `initializeServices()` in `src/main/index.ts` to:

```ts
  const cleaningService = new CleaningService()
  feedService = new FeedService(repository, undefined, cleaningService)
  articleService = new ArticleService(repository, cleaningService)
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm run build:main && npx electron --no-sandbox test/feature-feed-import.cjs
```

Expected: PASS with the post-enrichment assertions succeeding.

- [ ] **Step 5: Commit**

```bash
git add src/main/services/FeedService.ts src/main/index.ts test/feature-feed-import.cjs
git commit -m "feat: enrich imported articles in background"
```

## Task 4: Verify End-to-End Behavior and Guard Against Regressions

**Files:**
- Modify: `test/services-regression.cjs`
- Modify: `test/feature-feed-import.cjs`
- Test: `test/services-regression.cjs`, `test/feature-feed-import.cjs`, `test/feature-search.cjs`, `test/module-b-cleaning-verification.cjs`

- [ ] **Step 1: Add an export assertion for RSS-only content**

In `test/services-regression.cjs`, after the existing export verification for `entry-1`, add:

```js
  const rssOnlyExportPath = path.join(tempDir, 'rss-only.md')
  await exporter.exportArticle('entry-rss-only', rssOnlyExportPath)
  const rssOnlyMarkdown = fs.readFileSync(rssOnlyExportPath, 'utf-8')
  assert.match(rssOnlyMarkdown, /RSS supplied body/)
```

- [ ] **Step 2: Run the focused test suite before any last tweaks**

Run:

```bash
npm run build:main && npx electron --no-sandbox test/feature-feed-import.cjs && npx electron --no-sandbox test/services-regression.cjs && npx electron --no-sandbox test/feature-search.cjs && npx electron --no-sandbox test/module-b-cleaning-verification.cjs
```

Expected: PASS on all four scripts.

- [ ] **Step 3: Make only the minimal fixes required by failures**

If a failure appears, constrain the final adjustment to one of these exact areas:

```ts
// src/main/services/FeedService.ts
// Limit changes to RSS body extraction, asynchronous enrichment gating, or content write shape.

// src/main/services/ArticleService.ts
// Limit changes to the readable-content guard or on-demand fetch fallback.
```

Do not add new UI state, database tables, or site-specific antirez branches in this pass.

- [ ] **Step 4: Re-run the focused test suite to verify it passes**

Run:

```bash
npm run build:main && npx electron --no-sandbox test/feature-feed-import.cjs && npx electron --no-sandbox test/services-regression.cjs && npx electron --no-sandbox test/feature-search.cjs && npx electron --no-sandbox test/module-b-cleaning-verification.cjs
```

Expected: PASS on all four scripts.

- [ ] **Step 5: Commit**

```bash
git add test/services-regression.cjs test/feature-feed-import.cjs src/main/services/FeedService.ts src/main/services/ArticleService.ts src/main/index.ts
git commit -m "feat: decouple feed import from article enrichment"
```

## Spec Coverage Check

- Fast-feeling large feed import: covered by Task 1 and Task 3 through early return plus background enrichment.
- RSS-provided content available immediately: covered by Task 1.
- Article reads prefer stored content: covered by Task 2.
- Background enrichment remains best-effort: covered by Task 1 and Task 3.
- No large job system / minimal scope: enforced in Task 4 Step 3.
- Search/export/summary/translation compatibility via stored content: covered by Task 2 and Task 4.

## Placeholder Scan

- No `TODO` / `TBD` markers.
- Every code-changing step includes concrete code blocks.
- Every test step includes an exact command and expected outcome.
- Final-pass containment rules are explicit to avoid scope drift.

## Type Consistency Check

- `FeedService` continues to expose `addFeed(url: string): Promise<Feed>`.
- `ArticleService.getArticleContent(articleId: string): Promise<ArticleContent>` remains unchanged externally.
- Background enrichment helper consumes `entryId: string[]`, matching the IDs returned from the revised `saveFeedItems()`.
- Test names and entry IDs are consistent across all tasks.
