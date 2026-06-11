const { CleaningService } = require('../dist/main/services/CleaningService')

const mockHtml = `<!doctype html>
<html>
  <head>
    <title>Mock Article</title>
    <style>.hidden { display: none; }</style>
    <script>window.bad = true</script>
  </head>
  <body>
    <nav>
      <a href="/home">Home</a>
      <a href="/archive">Archive</a>
    </nav>
    <main>
      <article>
        <h1>Readable Module B Article</h1>
        <p>This article body is intentionally long enough for Readability and fallback scoring to treat it as real content.</p>
        <p>Mercury should keep useful paragraphs, images, code blocks, and links while removing navigation and scripts.</p>
        <figure>
          <img src="/images/demo.png" alt="Demo image" />
          <figcaption>Image caption</figcaption>
        </figure>
        <pre><code>const cleaned = true</code></pre>
        <p><a href="/article/more">Read more</a></p>
      </article>
    </main>
    <aside>Sidebar should not survive cleaning.</aside>
  </body>
</html>`

async function main() {
  const service = new CleaningService()
  const result = await service.clean(mockHtml, 'https://example.com/posts/demo')

  assert(result.cleanedHtml.includes('Readable Module B Article'), 'keeps article heading')
  assert(result.cleanedHtml.includes('Demo image'), 'keeps image alt text')
  assert(result.cleanedHtml.includes('https://example.com/images/demo.png'), 'resolves relative image URL')
  assert(result.cleanedHtml.includes('https://example.com/article/more'), 'resolves relative link URL')
  assert(result.cleanedHtml.includes('loading="lazy"'), 'adds lazy loading for images')
  assert(!result.cleanedHtml.includes('<script'), 'removes script tags')
  assert(!result.cleanedHtml.includes('Sidebar should not survive cleaning'), 'removes sidebar noise')
  assert(!result.cleanedHtml.includes('/archive'), 'removes navigation links')
  assert(result.cleanedMarkdown.includes('# Readable Module B Article'), 'creates markdown heading')
  assert(result.cleanedMarkdown.includes('const cleaned = true'), 'creates markdown code block')

  const fallback = await service.clean('', 'https://example.com/fallback')
  assert(fallback.cleanedHtml.includes('https://example.com/fallback'), 'fallback contains original URL')
  assert(fallback.cleanedMarkdown.length > 0, 'fallback markdown is not empty')

  console.log('Module B cleaning verification passed')
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
