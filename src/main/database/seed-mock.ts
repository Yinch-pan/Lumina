import { getDatabase } from './repository'

/**
 * Seed mock articles and their tags into the database.
 * Only runs if the database is empty (first launch).
 */
export function seedMockData(): void {
  const db = getDatabase()

  // Check if entries already exist
  const existing = db.prepare('SELECT COUNT(*) as count FROM entries').get() as any
  if (existing && existing.count > 0) return

  // Mock feeds
  const feeds = [
    { id: '1', title: 'Hacker News', url: 'https://news.ycombinator.com' },
    { id: '2', title: '阮一峰的网络日志', url: 'https://ruanyifeng.com/blog' },
    { id: '3', title: '少数派', url: 'https://sspai.com' }
  ]
  const now = Date.now()
  for (const feed of feeds) {
    db.prepare('INSERT OR IGNORE INTO feeds (id, title, url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(feed.id, feed.title, feed.url, now, now)
  }

  // Mock articles
  const articles = [
    {
      id: '1', feedId: '1',
      title: 'Show HN: I built a RSS reader with AI features',
      author: 'johndoe',
      publishedAt: new Date('2024-05-27T10:30:00').getTime(),
      url: 'https://news.ycombinator.com/item?id=123456',
      excerpt: 'I spent the last few months building Mercury, a cross-platform RSS reader with AI-powered summarization and translation...',
      tags: ['技术', '产品'],
      cleanedHtml: `<h2>Introduction</h2><p>Mercury is a cross-platform, local-first RSS reader with AI-powered features. It helps you stay organized and get more value from your reading.</p><h2>Key Features</h2><ul><li>AI-powered article summarization</li><li>Automatic translation to multiple languages</li><li>Smart tagging system</li><li>Markdown export for note-taking</li></ul><h2>Technical Stack</h2><p>Built with Electron, Vue3, and TypeScript, Mercury runs on Windows, macOS, and Linux. All data is stored locally using SQLite.</p>`
    },
    {
      id: '2', feedId: '1',
      title: 'The Future of Web Development',
      author: 'janedoe',
      publishedAt: new Date('2024-05-27T09:15:00').getTime(),
      url: 'https://example.com/future-web',
      excerpt: 'Web development is evolving rapidly. In this article, we explore the latest trends and technologies shaping the future...',
      tags: ['技术'],
      cleanedHtml: '<p>Web development is evolving rapidly...</p>'
    },
    {
      id: '3', feedId: '1',
      title: 'Understanding TypeScript Generics',
      author: 'developer',
      publishedAt: new Date('2024-05-26T18:45:00').getTime(),
      url: 'https://example.com/ts-generics',
      excerpt: 'TypeScript generics can be confusing at first, but they are incredibly powerful. Let\'s break them down step by step...',
      tags: ['技术'],
      cleanedHtml: '<p>TypeScript generics can be confusing at first...</p>'
    },
    {
      id: '4', feedId: '2',
      title: '科技爱好者周刊：第 300 期',
      author: '阮一峰',
      publishedAt: new Date('2024-05-25T08:00:00').getTime(),
      url: 'https://ruanyifeng.com/blog/weekly-300',
      excerpt: '这里记录每周值得分享的科技内容，周五发布。本期介绍一些有趣的开源项目和科技新闻...',
      tags: ['技术', '周刊'],
      cleanedHtml: '<p>这里记录每周值得分享的科技内容...</p>'
    },
    {
      id: '5', feedId: '3',
      title: '如何打造高效的个人知识管理系统',
      author: '少数派编辑部',
      publishedAt: new Date('2024-05-24T14:30:00').getTime(),
      url: 'https://sspai.com/post/knowledge',
      excerpt: '信息爆炸的时代，如何从海量信息中筛选出有价值的内容？本文分享一套完整的知识管理工作流...',
      tags: ['产品', '效率'],
      cleanedHtml: '<p>信息爆炸的时代，如何从海量信息中筛选出有价值的内容...</p>'
    }
  ]

  // Insert entries and their contents
  for (const article of articles) {
    db.prepare('INSERT OR IGNORE INTO entries (id, feed_id, title, url, author, published_at, excerpt, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(article.id, article.feedId, article.title, article.url, article.author, article.publishedAt, article.excerpt, 0, now)

    db.prepare('INSERT OR IGNORE INTO entry_contents (entry_id, raw_html, cleaned_html, cleaned_markdown, fetched_at) VALUES (?, ?, ?, ?, ?)')
      .run(article.id, null, article.cleanedHtml, null, now)
  }

  // Collect all unique tags
  const allTagNames = new Set<string>()
  for (const article of articles) {
    for (const tag of article.tags) {
      allTagNames.add(tag)
    }
  }

  // Insert tags
  const tagIds: Record<string, string> = {}
  for (const tagName of allTagNames) {
    const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as any
    if (existing) {
      tagIds[tagName] = existing.id
    } else {
      const id = `tag-${tagName}`
      db.prepare('INSERT OR IGNORE INTO tags (id, name, created_at) VALUES (?, ?, ?)')
        .run(id, tagName, now)
      tagIds[tagName] = id
    }
  }

  // Insert entry_tags
  for (const article of articles) {
    for (const tagName of article.tags) {
      const tagId = tagIds[tagName]
      if (tagId) {
        db.prepare('INSERT OR IGNORE INTO entry_tags (entry_id, tag_id, created_at) VALUES (?, ?, ?)')
          .run(article.id, tagId, now)
      }
    }
  }
}
