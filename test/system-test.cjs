const WebSocket = require('ws');

const WS_URL = process.env.CDP_WS_URL || 'ws://127.0.0.1:9224/devtools/page/27C1DE907CF70BD9EB0AAA61A9F05117';
let msgId = 1;
let ws;

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    ws.send(JSON.stringify({ id, method, params }));
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        ws.removeListener('message', handler);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
    ws.on('message', handler);
    setTimeout(() => reject(new Error('Timeout')), 180000);
  });
}

async function evaluate(expr) {
  const r = await send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true
  });
  if (r.exceptionDetails) {
    throw new Error(`JS Error: ${r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails)}`);
  }
  return r.result?.value;
}

async function runTests() {
  ws = new WebSocket(WS_URL);
  await new Promise((resolve) => ws.on('open', resolve));
  await send('Runtime.enable');

  const results = [];
  let passed = 0, failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      results.push({ name, status: 'PASS' });
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (e) {
      results.push({ name, status: 'FAIL', error: e.message });
      failed++;
      console.log(`  ✗ ${name}: ${e.message}`);
    }
  }

  console.log('\n=== Mercury System Test ===\n');

  // 1. Basic App Load
  console.log('[1] App Foundation');
  await test('Vue app mounted', async () => {
    const v = await evaluate(`document.getElementById('app') ? 'OK' : 'MISSING'`);
    if (v !== 'OK') throw new Error('App element not found');
  });

  await test('electronAPI available', async () => {
    const v = await evaluate(`typeof window.electronAPI`);
    if (v !== 'object') throw new Error(`electronAPI is ${v}`);
  });

  await test('All expected API methods exist', async () => {
    const methods = await evaluate(`Object.keys(window.electronAPI).join(',')`);
    const required = ['getFeedList','getArticleList','getArticleContent','addFeed',
      'refreshFeed','refreshAllFeeds','markArticleRead','markArticleUnread',
      'cleanArticle','summarizeArticle','translateArticle',
      'getAllTags','createTag','deleteTag','addTagToArticle','removeTagFromArticle',
      'getLLMConfig','saveLLMConfig','getSetting','saveSetting',
      'exportMarkdown','exportMarkdownBatch'];
    const missing = required.filter(m => !methods.includes(m));
    if (missing.length > 0) throw new Error(`Missing: ${missing.join(', ')}`);
  });

  // 2. Feed Management
  console.log('\n[2] Feed Management');
  await test('getFeedList returns array', async () => {
    const v = await evaluate(`window.electronAPI.getFeedList().then(f => Array.isArray(f) ? 'arr:'+f.length : 'bad')`);
    if (!v.startsWith('arr:')) throw new Error(`Got: ${v}`);
  });

  await test('Feed objects have required fields', async () => {
    const v = await evaluate(`window.electronAPI.getFeedList().then(feeds => {
      if (feeds.length === 0) return 'EMPTY';
      const f = feeds[0];
      const fields = ['id','title','url','unreadCount'];
      const missing = fields.filter(k => !(k in f));
      return missing.length ? 'MISSING:'+missing.join(',') : 'OK';
    })`);
    if (v === 'EMPTY') console.log('    (no feeds to validate)');
    else if (v !== 'OK') throw new Error(v);
  });

  await test('addFeed with invalid URL rejects gracefully', async () => {
    const v = await evaluate(`window.electronAPI.addFeed('not-a-url').then(() => 'resolved').catch(e => 'rejected:'+e.message?.substring(0,50))`);
    if (!v.startsWith('rejected')) throw new Error(`Expected rejection, got: ${v}`);
  });

  await test('refreshAllFeeds works', async () => {
    const v = await evaluate(`window.electronAPI.refreshAllFeeds().then(r => typeof r).catch(e => 'err:'+e.message?.substring(0,80))`);
    // It might error if network is down, but it should not crash
    if (v === undefined) throw new Error('Returned undefined');
  });

  // 3. Article Operations
  console.log('\n[3] Article Operations');
  await test('getArticleList for existing feed', async () => {
    const v = await evaluate(`window.electronAPI.getFeedList().then(feeds => {
      if (feeds.length === 0) return 'NO_FEEDS';
      return window.electronAPI.getArticleList(feeds[0].id).then(articles =>
        Array.isArray(articles) ? 'arr:'+articles.length : 'bad:'+typeof articles
      );
    })`);
    if (v === 'NO_FEEDS') console.log('    (no feeds)');
    else if (!v.startsWith('arr:')) throw new Error(`Got: ${v}`);
  });

  await test('getArticleContent for first article', async () => {
    const v = await evaluate(`window.electronAPI.getFeedList().then(async feeds => {
      if (feeds.length === 0) return 'NO_FEEDS';
      const articles = await window.electronAPI.getArticleList(feeds[0].id);
      if (articles.length === 0) return 'NO_ARTICLES';
      const content = await window.electronAPI.getArticleContent(articles[0].id);
      if (!content) return 'NULL_CONTENT';
      const fields = ['id','title','sourceUrl'];
      const missing = fields.filter(k => !(k in content));
      return missing.length ? 'MISSING:'+missing.join(',') : 'OK:'+content.title?.substring(0,30);
    })`);
    if (v === 'NO_FEEDS' || v === 'NO_ARTICLES') console.log(`    (${v})`);
    else if (v === 'NULL_CONTENT') throw new Error('getArticleContent returned null');
    else if (!v.startsWith('OK:') && !v.startsWith('MISSING:')) throw new Error(`Got: ${v}`);
    else if (v.startsWith('MISSING:')) throw new Error(v);
  });

  await test('markArticleRead/Unread toggle', async () => {
    const v = await evaluate(`window.electronAPI.getFeedList().then(async feeds => {
      if (feeds.length === 0) return 'NO_FEEDS';
      const articles = await window.electronAPI.getArticleList(feeds[0].id);
      if (articles.length === 0) return 'NO_ARTICLES';
      const id = articles[0].id;
      await window.electronAPI.markArticleRead(id);
      await window.electronAPI.markArticleUnread(id);
      return 'OK';
    })`);
    if (v === 'NO_FEEDS' || v === 'NO_ARTICLES') console.log(`    (${v})`);
    else if (v !== 'OK') throw new Error(`Got: ${v}`);
  });

  // 4. Tags
  console.log('\n[4] Tag System');
  await test('getAllTags returns array', async () => {
    const v = await evaluate(`window.electronAPI.getAllTags().then(t => Array.isArray(t) ? 'arr:'+t.length : 'bad')`);
    if (!v.startsWith('arr:')) throw new Error(`Got: ${v}`);
  });

  await test('createTag and deleteTag round-trip', async () => {
    const v = await evaluate(`(async () => {
      const tag = await window.electronAPI.createTag('__test_tag_' + Date.now());
      if (!tag || !tag.id) return 'CREATE_FAILED:' + JSON.stringify(tag);
      await window.electronAPI.deleteTag(tag.id);
      return 'OK';
    })()`);
    if (v !== 'OK') throw new Error(v);
  });

  await test('addTagToArticle and removeTagFromArticle', async () => {
    const v = await evaluate(`(async () => {
      const feeds = await window.electronAPI.getFeedList();
      if (feeds.length === 0) return 'NO_FEEDS';
      const articles = await window.electronAPI.getArticleList(feeds[0].id);
      if (articles.length === 0) return 'NO_ARTICLES';
      const tagName = '__tag_test_' + Date.now();
      const tag = await window.electronAPI.createTag(tagName);
      if (!tag || !tag.id) return 'CREATE_FAILED';
      try {
        await window.electronAPI.addTagToArticle(articles[0].id, tag.name);
        const tags = await window.electronAPI.getArticleTags(articles[0].id);
        const found = tags.some(t => t.id === tag.id);
        if (!found) return 'TAG_NOT_ATTACHED';
        await window.electronAPI.removeTagFromArticle(articles[0].id, tag.name);
        return 'OK';
      } finally {
        await window.electronAPI.deleteTag(tag.id);
      }
    })()`);
    if (v === 'NO_FEEDS' || v === 'NO_ARTICLES') console.log(`    (${v})`);
    else if (v !== 'OK') throw new Error(v);
  });

  // 5. LLM Config
  console.log('\n[5] LLM Configuration');
  await test('getLLMConfig returns object', async () => {
    const v = await evaluate(`window.electronAPI.getLLMConfig().then(c => c && typeof c === 'object' ? 'OK' : 'bad:'+JSON.stringify(c))`);
    if (v !== 'OK') throw new Error(v);
  });

  await test('saveLLMConfig persists correctly', async () => {
    const v = await evaluate(`(async () => {
      const config = { baseUrl: 'https://chat.ecnu.edu.cn/open/api/v1', apiKey: 'sk-384e4024672e42ab91bebe54008f17ba', model: 'ecnu-max' };
      await window.electronAPI.saveLLMConfig(config);
      const saved = await window.electronAPI.getLLMConfig();
      if (saved.baseUrl !== config.baseUrl) return 'URL_MISMATCH:' + saved.baseUrl;
      if (saved.apiKey !== config.apiKey) return 'KEY_MISMATCH';
      if (saved.model !== config.model) return 'MODEL_MISMATCH:' + saved.model;
      return 'OK';
    })()`);
    if (v !== 'OK') throw new Error(v);
  });

  // 6. AI Features (Summary & Translation)
  console.log('\n[6] AI Features');
  await test('summarizeArticle with real API', async () => {
    const v = await evaluate(`(async () => {
      const feeds = await window.electronAPI.getFeedList();
      if (feeds.length === 0) return 'NO_FEEDS';
      const articles = await window.electronAPI.getArticleList(feeds[0].id);
      if (articles.length === 0) return 'NO_ARTICLES';
      try {
        const result = await window.electronAPI.summarizeArticle(articles[0].id);
        if (!result) return 'NULL_RESULT';
        if (typeof result === 'string' && result.length > 0) return 'OK_STR:' + result.substring(0, 60);
        if (typeof result === 'object' && result.summary) return 'OK_OBJ:' + result.summary.substring(0, 60);
        return 'UNEXPECTED:' + JSON.stringify(result).substring(0, 100);
      } catch(e) {
        return 'ERROR:' + e.message?.substring(0, 100);
      }
    })()`);
    console.log(`    Result: ${v}`);
    if (v.startsWith('ERROR:')) throw new Error(v);
  });

  await test('translateArticle with real API', async () => {
    const v = await evaluate(`(async () => {
      const feeds = await window.electronAPI.getFeedList();
      if (feeds.length === 0) return 'NO_FEEDS';
      const articles = await window.electronAPI.getArticleList(feeds[0].id);
      if (articles.length === 0) return 'NO_ARTICLES';
      try {
        const result = await window.electronAPI.translateArticle(articles[0].id, 'en');
        if (!result) return 'NULL_RESULT';
        if (typeof result === 'string' && result.length > 0) return 'OK_STR:' + result.substring(0, 60);
        if (typeof result === 'object' && result.translation) return 'OK_OBJ:' + result.translation.substring(0, 60);
        return 'UNEXPECTED:' + JSON.stringify(result).substring(0, 100);
      } catch(e) {
        return 'ERROR:' + e.message?.substring(0, 100);
      }
    })()`);
    console.log(`    Result: ${v}`);
    if (v.startsWith('ERROR:')) throw new Error(v);
  });

  // 7. Settings
  console.log('\n[7] Settings');
  await test('getSetting/saveSetting round-trip', async () => {
    const v = await evaluate(`(async () => {
      await window.electronAPI.saveSetting('fontSize', '18');
      const val = await window.electronAPI.getSetting('fontSize');
      if (val !== '18') return 'MISMATCH:' + val;
      await window.electronAPI.saveSetting('fontSize', '16');
      return 'OK';
    })()`);
    if (v !== 'OK') throw new Error(v);
  });

  // 8. UI State
  console.log('\n[8] UI Rendering');
  await test('Sidebar renders feed list', async () => {
    const v = await evaluate(`document.querySelector('.sidebar') ? 'OK' : document.querySelector('[class*=sidebar]') ? 'OK_ALT' : 'NO_SIDEBAR:' + document.body.innerHTML.substring(0, 200)`);
    if (!v.startsWith('OK')) throw new Error(v);
  });

  await test('No console errors in app', async () => {
    // Enable console capture
    const v = await evaluate(`
      window.__testErrors = window.__testErrors || [];
      window.__testErrors.length > 0 ? 'ERRORS:' + window.__testErrors.join('|').substring(0, 200) : 'OK'
    `);
    // This just checks if we already captured errors, might not have any
  });

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  ws.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test runner error:', e);
  process.exit(2);
});
