const { ArticleService } = require('../dist/main/services/ArticleService')
const { CLEANER_VERSION } = require('../dist/main/services/CleaningService')

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

const OLD_CLEANED_HTML = `
  <article>
    <p>Archive</p>
    <p>What If?</p>
    <p>stale cleaned cache</p>
  </article>
`

async function main() {
  await verifiesStoredRawHtmlIsCleanedAndPersisted()
  await verifiesMissingRawHtmlIsFetchedBeforeCleaning()
  await verifiesAlreadyCleanedContentIsReturnedWithoutWork()
  await verifiesMissingArticleRaisesClearError()
  await verifiesFetchFailureDoesNotAttemptCleaning()
  await verifiesStaleCleanerVersionIsRecleanedAndPersisted()
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
  assert(repository.upserts[0].cleanerVersion === CLEANER_VERSION, 'persists cleaner version')
  assert(content.cleanerVersion === CLEANER_VERSION, 'returns current cleaner version')
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

async function verifiesAlreadyCleanedContentIsReturnedWithoutWork() {
  const repository = createRepository({
    rawHtml: RAW_HTML,
    cleanedHtml: '<article><p>already cleaned</p></article>',
    cleanedMarkdown: 'already cleaned',
    cleanerVersion: CLEANER_VERSION
  })

  const cleaningService = createCleaningService()
  const fetchText = async () => {
    throw new Error('fetch should not be called')
  }

  const service = new ArticleService(repository, cleaningService, fetchText)
  const content = await service.getArticleContent('article-1')

  assert(cleaningService.calls.length === 0, 'does not clean when cleaned fields already exist')
  assert(repository.upserts.length === 0, 'does not persist when no cleaning is needed')
  assert(content.cleanedHtml.includes('already cleaned'), 'returns existing cleaned HTML')
  assert(content.cleanedMarkdown.includes('already cleaned'), 'returns existing cleaned Markdown')
}

async function verifiesMissingArticleRaisesClearError() {
  const repository = createRepository({
    rawHtml: RAW_HTML,
    cleanedHtml: null,
    cleanedMarkdown: null
  })

  const service = new ArticleService(repository, createCleaningService())

  await assertRejects(
    () => service.getArticleContent('missing-article'),
    'Article not found: missing-article',
    'throws a clear error when the article row is missing'
  )
}

async function verifiesFetchFailureDoesNotAttemptCleaning() {
  const repository = createRepository({
    rawHtml: null,
    cleanedHtml: null,
    cleanedMarkdown: null
  })

  const cleaningService = createCleaningService()
  const fetchText = async () => {
    throw new Error('network unavailable')
  }

  const service = new ArticleService(repository, cleaningService, fetchText)

  await assertRejects(
    () => service.getArticleContent('article-1'),
    'network unavailable',
    'propagates fetch failures for ReaderView error handling'
  )
  assert(cleaningService.calls.length === 0, 'does not clean when fetching raw HTML fails')
  assert(repository.upserts.length === 0, 'does not persist partial content when fetching raw HTML fails')
}

async function verifiesStaleCleanerVersionIsRecleanedAndPersisted() {
  const repository = createRepository({
    rawHtml: RAW_HTML,
    cleanedHtml: OLD_CLEANED_HTML,
    cleanedMarkdown: 'Archive What If? stale markdown',
    cleanerVersion: undefined
  })

  const cleaningService = createCleaningService()
  const service = new ArticleService(repository, cleaningService)
  const content = await service.getArticleContent('article-1')

  assert(cleaningService.calls.length === 1, 'recleans cached content without cleaner version')
  assert(repository.upserts.length === 1, 'persists refreshed cleaned content once')
  assert(repository.upserts[0].cleanerVersion === CLEANER_VERSION, 'writes current cleaner version')
  assert(content.cleanerVersion === CLEANER_VERSION, 'returns refreshed cleaner version')
  assert(!content.cleanedHtml.includes('Archive'), 'does not return stale navigation noise')
  assert(!content.cleanedHtml.includes('What If?'), 'does not return stale xkcd navigation noise')
  assert(content.cleanedHtml.includes('cleaned article-1'), 'returns refreshed cleaned HTML')
}

function createRepository(initialContent) {
  const initialCleanerVersion =
    Object.prototype.hasOwnProperty.call(initialContent, 'cleanerVersion') ? initialContent.cleanerVersion : undefined
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
    cleanerVersion: initialCleanerVersion,
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
      if (content.cleanerVersion !== undefined && content.cleanerVersion !== null) {
        state.cleanerVersion = content.cleanerVersion
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
        cleanedMarkdown: 'cleaned markdown',
        cleanerVersion: CLEANER_VERSION
      }
    }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function assertRejects(action, expectedMessage, message) {
  try {
    await action()
  } catch (error) {
    assert(String(error.message || error).includes(expectedMessage), message)
    return
  }

  throw new Error(`Assertion failed: ${message}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
