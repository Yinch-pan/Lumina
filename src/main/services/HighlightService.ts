import { randomUUID } from 'crypto'
import { Repository } from '../database/repository'

export interface HighlightRecord {
  id: string
  entryId: string
  selectedText: string
  prefixText: string | null
  suffixText: string | null
  color: string
  note: string | null
  createdAt: number
}

export class HighlightService {
  constructor(private readonly repository: Repository) {}

  add(input: { entryId: string; selectedText: string; prefixText?: string; suffixText?: string; color: string; note?: string }): HighlightRecord {
    const id = randomUUID()
    const createdAt = Date.now()
    this.repository.addHighlight({
      id, entryId: input.entryId, selectedText: input.selectedText,
      prefixText: input.prefixText ?? null, suffixText: input.suffixText ?? null,
      color: input.color, note: input.note ?? null, createdAt
    })
    return {
      id, entryId: input.entryId, selectedText: input.selectedText,
      prefixText: input.prefixText ?? null, suffixText: input.suffixText ?? null,
      color: input.color, note: input.note ?? null, createdAt
    }
  }

  list(entryId: string): HighlightRecord[] {
    return this.repository.getHighlights(entryId)
  }

  update(id: string, fields: { color?: string; note?: string }): void {
    this.repository.updateHighlight(id, fields)
  }

  remove(id: string): void {
    this.repository.deleteHighlight(id)
  }
}
