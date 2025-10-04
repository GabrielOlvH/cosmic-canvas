import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

export interface DocumentRecord {
  filePath: string
  hash: string
  title: string
  indexedAt: number
  chunks: number
}

export class DocumentTracker {
  private trackerPath: string
  private records: Map<string, DocumentRecord> = new Map()

  constructor(trackerPath = './chroma_db/document_tracker.json') {
    this.trackerPath = trackerPath
  }

  /**
   * Load existing tracking records
   */
  async load() {
    if (existsSync(this.trackerPath)) {
      try {
        const data = await readFile(this.trackerPath, 'utf-8')
        const records: DocumentRecord[] = JSON.parse(data)
        this.records = new Map(records.map(r => [r.filePath, r]))
      } catch (error) {
        console.warn(`Failed to load document tracker: ${error}`)
        this.records = new Map()
      }
    }
  }

  /**
   * Save tracking records
   */
  async save() {
    try {
      // Ensure directory exists
      const dir = dirname(this.trackerPath)
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true })
      }

      const records = Array.from(this.records.values())
      await writeFile(this.trackerPath, JSON.stringify(records, null, 2), 'utf-8')
    } catch (error) {
      console.error(`Failed to save document tracker: ${error}`)
    }
  }

  /**
   * Calculate hash of file content
   */
  calculateHash(content: string): string {
    return createHash('sha256').update(content).digest('hex')
  }

  /**
   * Check if document needs indexing (new or modified)
   */
  needsIndexing(filePath: string, contentHash: string): boolean {
    const existing = this.records.get(filePath)
    if (!existing) return true // New document
    return existing.hash !== contentHash // Modified document
  }

  /**
   * Mark document as indexed
   */
  markIndexed(filePath: string, contentHash: string, title: string, chunks: number) {
    this.records.set(filePath, {
      filePath,
      hash: contentHash,
      title,
      indexedAt: Date.now(),
      chunks,
    })
  }

  /**
   * Get all indexed documents
   */
  getIndexedDocuments(): DocumentRecord[] {
    return Array.from(this.records.values())
  }

  /**
   * Get statistics
   */
  getStats() {
    const records = Array.from(this.records.values())
    return {
      total: records.length,
      totalChunks: records.reduce((sum, r) => sum + r.chunks, 0),
      oldestIndexed: records.length > 0
        ? Math.min(...records.map(r => r.indexedAt))
        : null,
      newestIndexed: records.length > 0
        ? Math.max(...records.map(r => r.indexedAt))
        : null,
    }
  }

  /**
   * Clear all records
   */
  clear() {
    this.records.clear()
  }

  /**
   * Remove record for a file
   */
  remove(filePath: string) {
    this.records.delete(filePath)
  }
}

export const documentTracker = new DocumentTracker()
