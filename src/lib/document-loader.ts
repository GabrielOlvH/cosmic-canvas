import { readdir, readFile } from 'node:fs/promises'
import { join, extname, basename } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pdf = require('pdf-parse')

export interface LoadedDocument {
  content: string
  metadata: {
    source: string
    title: string
    type: string
    timestamp: number
    filePath: string
  }
}

export class DocumentLoader {
  private supportedExtensions = ['.txt', '.md', '.json', '.pdf']

  async loadFromFolder(folderPath: string, recursive = true): Promise<LoadedDocument[]> {
    const documents: LoadedDocument[] = []

    try {
      await this.loadFromDirectory(folderPath, documents, recursive)
      return documents
    } catch (error) {
      throw new Error(`Failed to load documents from folder: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async loadFromDirectory(
    dirPath: string,
    documents: LoadedDocument[],
    recursive: boolean
  ): Promise<void> {
    const files = await readdir(dirPath, { withFileTypes: true })

    for (const file of files) {
      const fullPath = join(dirPath, file.name)

      if (file.isDirectory() && recursive) {
        // Recursively load from subdirectories
        await this.loadFromDirectory(fullPath, documents, recursive)
      } else if (file.isFile()) {
        const ext = extname(file.name).toLowerCase()

        // Skip metadata/log files
        if (file.name.includes('download_log') || file.name.includes('retry_log')) {
          continue
        }

        if (this.supportedExtensions.includes(ext)) {
          const content = await this.loadFile(fullPath, ext)

          if (content) {
            documents.push({
              content,
              metadata: {
                source: file.name,
                title: basename(file.name, ext),
                type: this.getFileType(ext),
                timestamp: Date.now(),
                filePath: fullPath,
              },
            })
          }
        }
      }
    }
  }

  private async loadFile(filePath: string, ext: string): Promise<string | null> {
    try {
      switch (ext) {
        case '.txt':
        case '.md': {
          const content = await readFile(filePath, 'utf-8')
          return content
        }

        case '.json': {
          const content = await readFile(filePath, 'utf-8')
          // Parse JSON and extract content
          try {
            const parsed = JSON.parse(content)

            // If it's an array of documents, combine them
            if (Array.isArray(parsed)) {
              return parsed
                .map(doc => {
                  if (typeof doc === 'string') return doc
                  if (doc.content) return doc.content
                  return JSON.stringify(doc)
                })
                .join('\n\n')
            }

            // If it's a single document with content field
            if (parsed.content) {
              return parsed.content
            }

            // Otherwise, stringify the whole thing
            return JSON.stringify(parsed, null, 2)
          } catch {
            return content
          }
        }

        case '.pdf': {
          const dataBuffer = await readFile(filePath)
          const data = await pdf(dataBuffer)
          return data.text
        }

        default:
          return null
      }
    } catch (error) {
      console.error(`Failed to load file ${filePath}:`, error)
      return null
    }
  }

  private getFileType(ext: string): string {
    switch (ext) {
      case '.txt':
        return 'text'
      case '.md':
        return 'markdown'
      case '.json':
        return 'json'
      case '.pdf':
        return 'pdf'
      default:
        return 'unknown'
    }
  }

  async loadFromFiles(filePaths: string[]): Promise<LoadedDocument[]> {
    const documents: LoadedDocument[] = []

    for (const filePath of filePaths) {
      const ext = extname(filePath).toLowerCase()

      if (this.supportedExtensions.includes(ext)) {
        const content = await this.loadFile(filePath, ext)

        if (content) {
          documents.push({
            content,
            metadata: {
              source: basename(filePath),
              title: basename(filePath, ext),
              type: this.getFileType(ext),
              timestamp: Date.now(),
              filePath,
            },
          })
        }
      }
    }

    return documents
  }
}

export const documentLoader = new DocumentLoader()
