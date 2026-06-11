const assert = require('node:assert/strict')

async function main() {
  const target = await waitForPageTarget()
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  const cdp = createCdp(socket)
  await cdp.open()

  try {
    await cdp.send('Runtime.enable')
    await cdp.send('Page.enable')
    await waitForExpression(cdp, 'Boolean(document.querySelector(".app-container"))')
    await waitForExpression(cdp, 'Boolean(window.electronAPI)')

    const methods = await evalValue(cdp, 'Object.keys(window.electronAPI).sort()')
    for (const method of ['addFeed', 'getFeedList', 'getArticleList', 'getArticleContent', 'summarizeArticle', 'translateArticle', 'addTag', 'exportMarkdown']) {
      assert(methods.includes(method), `electronAPI exposes ${method}`)
    }

    await evalValue(cdp, `window.electronAPI.saveLLMConfig({ baseUrl: 'http://127.0.0.1:1/v1', apiKey: 'test', model: 'mock' })`)
    const feed = await evalValue(cdp, `window.electronAPI.addFeed('http://127.0.0.1:8787/feed/basic.xml')`)
    assert.equal(feed.title, 'Mercury Basic Feed')

    const feeds = await evalValue(cdp, `window.electronAPI.getFeedList()`)
    assert(feeds.some((item) => item.title === 'Mercury Basic Feed'), 'feed appears through IPC')

    const articles = await evalValue(cdp, `window.electronAPI.getArticleList(${JSON.stringify(feed.id)})`)
    assert.equal(articles.length, 2)

    const content = await evalValue(cdp, `window.electronAPI.getArticleContent(${JSON.stringify(articles[0].id)})`)
    assert.match(content.cleanedHtml || '', /<article>/)
    assert.match(content.cleanedMarkdown || '', /raw HTML served/)

    await evalValue(cdp, `window.electronAPI.addTag(${JSON.stringify(articles[0].id)}, '窗口验收')`)
    const tags = await evalValue(cdp, `window.electronAPI.getTags()`)
    assert(tags.some((tag) => tag.name === '窗口验收'), 'tag appears through IPC')

    await evalValue(cdp, `document.querySelector('.settings-btn')?.click?.()`)
    await waitForExpression(cdp, 'Boolean(document.querySelector(".settings-view"))')
    const settingsTitle = await evalValue(cdp, 'document.querySelector(".settings-title")?.textContent')
    assert.equal(settingsTitle, '设置')

    const rendererState = await evalValue(cdp, `({
      title: document.title,
      hasReader: Boolean(document.querySelector('.reader-view')),
      hasSidebar: Boolean(document.querySelector('.feed-sidebar')),
      hasArticleList: Boolean(document.querySelector('.article-list')),
      bodyText: document.body.innerText.slice(0, 500)
    })`)
    assert.equal(rendererState.title, 'Mercury')
    assert.equal(rendererState.hasReader, true)
    assert.equal(rendererState.hasSidebar, true)
    assert.equal(rendererState.hasArticleList, true)

    console.log('Electron window smoke verification passed')
  } finally {
    socket.close()
  }
}

function createCdp(socket) {
  let id = 0
  const pending = new Map()

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result)
    }
  })

  return {
    open: () => new Promise((resolve) => socket.addEventListener('open', resolve, { once: true })),
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const messageId = ++id
      pending.set(messageId, { resolve, reject })
      socket.send(JSON.stringify({ id: messageId, method, params }))
    })
  }
}

async function waitForPageTarget() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch('http://127.0.0.1:9223/json/list')
      const targets = await response.json()
      const page = targets.find((target) => target.type === 'page' && /https?:\/\/(localhost|127\.0\.0\.1):\d+\/?$/.test(target.url) && target.title === 'Mercury')
      if (page) return page
    } catch {}
    await sleep(200)
  }
  throw new Error('Electron page target not found')
}

async function waitForExpression(cdp, expression) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (await evalValue(cdp, expression)) return
    await sleep(200)
  }
  throw new Error(`Timed out waiting for expression: ${expression}`)
}

async function evalValue(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime evaluation failed')
  }
  return result.result.value
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
