import { Repository } from '../database/repository'
import { Article, Tag } from '../types'
import { ITagService } from './interfaces'

/**
 * 标签服务
 * 负责标签管理、文章打标签、按标签筛选
 */
export class TagService implements ITagService {
  constructor(private readonly repository: Repository) {}

  async getAllTags(): Promise<Tag[]> {
    return this.repository.getAllTags()
  }

  async createTag(name: string): Promise<Tag> {
    const normalized = name.trim()
    if (!normalized) {
      throw new Error('Tag name cannot be empty')
    }

    // 检查是否已存在
    const existing = this.repository.getAllTags().find((tag) => tag.name === normalized)
    if (existing) {
      return existing
    }

    const tagId = this.repository.createTag(normalized)
    const tag = this.repository.getAllTags().find((t) => t.id === tagId)
    if (!tag) {
      throw new Error(`Tag was created but cannot be loaded: ${tagId}`)
    }

    return tag
  }

  async deleteTag(tagId: string): Promise<void> {
    this.repository.deleteTag(tagId)
  }

  async addTagToArticle(articleId: string, tagName: string): Promise<void> {
    const normalized = tagName.trim()
    if (!normalized) {
      throw new Error('Tag name cannot be empty')
  }

    // 确保文章存在
    const article = this.repository.getEntryRowById(articleId)
    if (!article) {
      throw new Error(`Article not found: ${articleId}`)
    }

    // 创建或获取标签
    const tag = await this.createTag(normalized)

    // 添加关联
    this.repository.addTagToEntry(articleId, tag.id)
  }

  async removeTagFromArticle(articleId: string, tagName: string): Promise<void> {
    const normalized = tagName.trim()
    if (!normalized) {
      throw new Error('Tag name cannot be empty')
  }

    // 查找标签
    const tag = this.repository.getAllTags().find((t) => t.name === normalized)
    if (!tag) {
      return // 标签不存在，无需移除
    }

    // 移除关联
    this.repository.removeTagFromEntry(articleId, tag.id)
  }

  async getArticleTags(articleId: string): Promise<Tag[]> {
    return this.repository.getArticleTags(articleId)
  }
  async getArticlesByTag(tagName: string): Promise<Article[]> {
    const normalized = tagName.trim()
    if (!normalized) {
      return []
    }

    // 查找标签
    const tag = this.repository.getAllTags().find((t) => t.name === normalized)
    if (!tag) {
      return []
    }

    // 获取该标签下的所有文章
    return this.repository.getArticlesByTag(tag.id)
  }
}
