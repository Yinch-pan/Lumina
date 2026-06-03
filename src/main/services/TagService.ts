import { ITagService } from './interfaces'
import { Tag, Article } from '../types'
import * as repo from '../database/repository'

export class TagService implements ITagService {
  async getAllTags(): Promise<Tag[]> {
    return repo.selectAllTags()
  }

  async createTag(name: string): Promise<Tag> {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('标签名不能为空')

    // 检查是否已存在
    const existing = repo.findTagByName(trimmed)
    if (existing) throw new Error(`标签 "${trimmed}" 已存在`)

    return repo.insertTag(trimmed)
  }

  async deleteTag(tagId: string): Promise<void> {
    repo.deleteTagById(tagId)
  }

  async updateTag(tagId: string, newName: string): Promise<void> {
    const trimmed = newName.trim()
    if (!trimmed) throw new Error('标签名不能为空')
    repo.updateTagName(tagId, trimmed)
  }

  async addTagToArticle(articleId: string, tagName: string): Promise<void> {
    const trimmed = tagName.trim()
    if (!trimmed) throw new Error('标签名不能为空')

    // 如果标签不存在则自动创建
    let tag = repo.findTagByName(trimmed)
    if (!tag) {
      tag = repo.insertTag(trimmed)
    }

    repo.insertEntryTag(articleId, tag.id)
  }

  async removeTagFromArticle(articleId: string, tagName: string): Promise<void> {
    const tag = repo.findTagByName(tagName)
    if (!tag) return
    repo.deleteEntryTag(articleId, tag.id)
  }

  async getArticleTags(articleId: string): Promise<Tag[]> {
    return repo.selectTagsByEntryId(articleId)
  }

  async getArticlesByTag(tagName: string): Promise<Article[]> {
    const tag = repo.findTagByName(tagName)
    if (!tag) return []

    const entryIds = repo.selectEntriesByTagId(tag.id)
    const articles: Article[] = []
    for (const entryId of entryIds) {
      const entry = repo.selectEntryById(entryId)
      if (entry) {
        articles.push({
          id: entry.id,
          feedId: entry.feedId,
          title: entry.title,
          author: entry.author,
          publishedAt: entry.publishedAt,
          excerpt: entry.excerpt,
          isRead: entry.isRead,
          tags: entry.tags
        })
      }
    }
    return articles
  }
}
