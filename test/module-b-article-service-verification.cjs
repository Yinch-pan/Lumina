const { ArticleService } = require('../dist/main/services/ArticleService')

const RAW_HTML = `
  <html>
    <body>
      <article>
        <h1>Stored Raw Article</h1>
        <p>Mercury stores raw HTML first, then Module B cleans it when the reader opens the article.</p>
      </article>
    </body>
  </html>
`

async function main() {
  await verifiesStoredRawHtmlIsCleanedAndPersisted()
  await verifiesMissingRawHtmlIsFetchedBeforeCleaning()
  console.log('Module B article service verification passed')
}

async function verifiesStoredRawHtmlIsCleanedAndPersisted() {
  const repository = createRepository({
    rawHtml: RAW_HTML,
    cleanedHtml: null,
    cleanedMarkdown: null
  })

  const cleaningService = createCleaningService()
  const service = new ArticleService(repository, cleaningService)
  const content = await service.getArticleContent('article-1')

  assert(cleaningService.calls.length === 1, 'cleans content when cleaned fields are missing')
  assert(cleaningService.calls[0].rawHtml === RAW_HTML, 'passes stored raw HTML into CleaningService')
  assert(content.cleanedHtml.includes('cleaned article-1'), 'returns persisted cleaned HTML')
  assert(content.cleanedMarkdown.includes('cleaned markdown'), 'returns persisted cleaned Markdown')
  assert(repository.upserts.length === 1, 'persists cleaned content once')
  assert(repository.upserts[0].rawHtml === RAW_HTML, 'keeps existing raw HTML when saving cleaned output')
}

async function verifiesMissingRawHtmlIsFetchedBeforeCleaning() {
  const repository = createRepository({
    rawHtml: null,
    cleanedHtml: null,
    cleanedMarkdown: null
  })

  const cleaningService = createCleaningService()
  const fetchedHtml = '<article><h1>Fetched Article</h1><p>Fetched from source URL.</p></article>'
  const fetchedUrls = []
  const fetchText = async (url) => {
    fetchedUrls.push(url)
    return fetchedHtml
  }

  const service = new ArticleService(repository, cleaningService, fetchText)
  const content = await service.getArticleContent('article-1')

  assert(fetchedUrls.length === 1, 'fetches source HTML when raw HTML is missing')
  assert(fetchedUrls[0] === 'https://example.com/article-1', 'fetches article source URL')
  assert(cleaningService.calls.length === 1, 'cleans fetched raw HTML')
  assert(cleaningService.calls[0].rawHtml === fetchedHtml, 'passes fetched HTML into CleaningService')
  assert(content.rawHtml === fetchedHtml, 'returns fetched raw HTML from repository')
  assert(content.cleanedHtml.includes('cleaned article-1'), 'returns cleaned HTML after fetch')
  assert(repository.upserts.length === 2, 'persists fetched raw HTML and cleaned output')
}

function createRepository(initialContent) {
  const entry = {
    id: 'article-1',
    url: 'https://example.com/article-1'
  }

  const state = {
    id: 'article-1',
    title: 'Module B Article',
    author: 'Mercury',
    publishedAt: '2026-06-04',
    sourceUrl: entry.url,
    rawHtml: initialContent.rawHtml ?? undefined,
    cleanedHtml: initialContent.cleanedHtml ?? undefined,
    cleanedMarkdown: initialContent.cleanedMarkdown ?? undefined,
    tags: []
  }

  const upserts = []

  return {
    upserts,
    getEntryRowById(id) {
      return id === entry.id ? entry : undefined
    },
    getArticleContent(id) {
      return id === entry.id ? { ...state } : undefined
    },
    upsertEntryContent(content) {
      upserts.push({ ...content })
      if (content.rawHtml !== undefined && content.rawHtml !== null) {
        state.rawHtml = content.rawHtml
      }
      if (content.cleanedHtml !== undefined && content.cleanedHtml !== null) {
        state.cleanedHtml = content.cleanedHtml
      }
      if (content.cleanedMarkdown !== undefined && content.cleanedMarkdown !== null) {
        state.cleanedMarkdown = content.cleanedMarkdown
      }
    }
  }
}

function createCleaningService() {
  const calls = []

  return {
    calls,
    async clean(rawHtml, url) {
      calls.push({ rawHtml, url })
      return {
        cleanedHtml: `<article><p>cleaned article-1 from ${url}</p></article>`,
        cleanedMarkdown: 'cleaned markdown'
      }
    }
  }
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
