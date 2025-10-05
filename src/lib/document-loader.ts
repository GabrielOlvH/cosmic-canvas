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
    authors?: string
    doi?: string
    year?: number
    journal?: string
    url?: string // PMC link or DOI URL
  }
}

export class DocumentLoader {
  private supportedExtensions = ['.txt', '.md', '.json', '.pdf']
  private pmcLinksCache: Map<string, string> | null = null

  /**
   * Load PMC links from CSV file
   */
  private async loadPMCLinks(): Promise<Map<string, string>> {
    if (this.pmcLinksCache) {
      return this.pmcLinksCache
    }

    const pmcMap = new Map<string, string>()
    
    try {
      // Try to load from Downloads folder
      const csvPath = '/Users/lucascc/Downloads/SB_publication_PMC.csv'
      const csvContent = await readFile(csvPath, 'utf-8')
      const lines = csvContent.split('\n').slice(1) // Skip header
      
      for (const line of lines) {
        if (!line.trim()) continue
        
        // Parse CSV line (handle titles with commas)
        const lastCommaIndex = line.lastIndexOf(',')
        if (lastCommaIndex === -1) continue
        
        const title = line.substring(0, lastCommaIndex).trim()
        const url = line.substring(lastCommaIndex + 1).trim()
        
        if (title && url) {
          pmcMap.set(title.toLowerCase(), url)
        }
      }
      
      console.log(`✓ Loaded ${pmcMap.size} PMC links from CSV`)
    } catch (error) {
      console.warn('Could not load PMC links CSV:', error instanceof Error ? error.message : 'Unknown error')
    }
    
    this.pmcLinksCache = pmcMap
    return pmcMap
  }

  async loadFromFolder(folderPath: string, recursive = true): Promise<LoadedDocument[]> {
    const documents: LoadedDocument[] = []
    
    // Load PMC links
    const pmcLinks = await this.loadPMCLinks()

    try {
      await this.loadFromDirectory(folderPath, documents, recursive, pmcLinks)
      return documents
    } catch (error) {
      throw new Error(`Failed to load documents from folder: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async loadFromDirectory(
    dirPath: string,
    documents: LoadedDocument[],
    recursive: boolean,
    pmcLinks: Map<string, string>
  ): Promise<void> {
    const files = await readdir(dirPath, { withFileTypes: true })

    for (const file of files) {
      const fullPath = join(dirPath, file.name)

      if (file.isDirectory() && recursive) {
        // Recursively load from subdirectories
        await this.loadFromDirectory(fullPath, documents, recursive, pmcLinks)
      } else if (file.isFile()) {
        const ext = extname(file.name).toLowerCase()

        // Skip metadata/log files
        if (file.name.includes('download_log') || file.name.includes('retry_log')) {
          continue
        }

        if (this.supportedExtensions.includes(ext)) {
          const result = await this.loadFile(fullPath, ext)

          if (result) {
            const title = result.metadata?.title || basename(file.name, ext)
            
            // Try to find PMC link by title
            let url = result.metadata?.doi ? `https://doi.org/${result.metadata.doi}` : undefined
            const pmcUrl = pmcLinks.get(title.toLowerCase())
            if (pmcUrl) {
              url = pmcUrl // PMC link takes precedence
            }
            
            documents.push({
              content: result.content,
              metadata: {
                source: file.name,
                title,
                type: this.getFileType(ext),
                timestamp: Date.now(),
                filePath: fullPath,
                authors: result.metadata?.authors,
                doi: result.metadata?.doi,
                year: result.metadata?.year,
                journal: result.metadata?.journal,
                url,
              },
            })
          }
        }
      }
    }
  }

  private async loadFile(filePath: string, ext: string): Promise<{ content: string; metadata?: { title?: string; authors?: string; doi?: string; year?: number; journal?: string } } | null> {
    try {
      switch (ext) {
        case '.txt':
        case '.md': {
          const content = await readFile(filePath, 'utf-8')
          return { content }
        }

        case '.json': {
          const content = await readFile(filePath, 'utf-8')
          // Parse JSON and extract content
          try {
            const parsed = JSON.parse(content)

            // If it's an array of documents, combine them
            if (Array.isArray(parsed)) {
              return {
                content: parsed
                  .map(doc => {
                    if (typeof doc === 'string') return doc
                    if (doc.content) return doc.content
                    return JSON.stringify(doc)
                  })
                  .join('\n\n')
              }
            }

            // If it's a single document with content field
            if (parsed.content) {
              return { content: parsed.content }
            }

            // Otherwise, stringify the whole thing
            return { content: JSON.stringify(parsed, null, 2) }
          } catch {
            return { content }
          }
        }

        case '.pdf': {
          const dataBuffer = await readFile(filePath)
          const data = await pdf(dataBuffer)
          
          // Extract metadata from PDF
          const pdfMetadata = this.extractPDFMetadata(data)
          
          return {
            content: data.text,
            metadata: pdfMetadata
          }
        }

        default:
          return null
      }
    } catch (error) {
      console.error(`Failed to load file ${filePath}:`, error)
      return null
    }
  }

  private extractPDFMetadata(pdfData: any): { title?: string; authors?: string; doi?: string; year?: number; journal?: string } {
    const metadata: { title?: string; authors?: string; doi?: string; year?: number; journal?: string } = {}
    
    // Try to get title from PDF info
    if (pdfData.info?.Title) {
      metadata.title = pdfData.info.Title.trim()
    }
    
    // Try to get author from PDF info
    if (pdfData.info?.Author) {
      metadata.authors = pdfData.info.Author.trim()
    }
    
    // Extract from first 2000 characters of text (usually contains title, authors, DOI)
    const firstPage = pdfData.text.substring(0, 2000)
    
    // Try to extract DOI
    const doiMatch = firstPage.match(/(?:doi:|DOI:|https?:\/\/doi\.org\/)([\d\w.\/-]+)/i)
    if (doiMatch && doiMatch[1]) {
      metadata.doi = doiMatch[1].trim()
    }
    
    // Try to extract year (4-digit number that looks like a year)
    const yearMatch = firstPage.match(/\b(19|20)\d{2}\b/)
    if (yearMatch) {
      const year = parseInt(yearMatch[0])
      if (year >= 1900 && year <= new Date().getFullYear()) {
        metadata.year = year
      }
    }
    
    // If no title from info, try to extract from first few lines
    if (!metadata.title) {
      // Get first non-empty line that's substantial (not just numbers/dates)
      const lines = firstPage.split('\n').filter((l: string) => l.trim().length > 20)
      if (lines.length > 0) {
        // Often the title is the first substantial line
        metadata.title = lines[0].trim()
          .replace(/^(Title:|TITLE:)/i, '')
          .trim()
          .substring(0, 200) // Limit length
      }
    }
    
    return metadata
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
    
    // Load PMC links
    const pmcLinks = await this.loadPMCLinks()

    for (const filePath of filePaths) {
      const ext = extname(filePath).toLowerCase()

      if (this.supportedExtensions.includes(ext)) {
        const result = await this.loadFile(filePath, ext)

        if (result) {
          const title = result.metadata?.title || basename(filePath, ext)
          
          // Try to find PMC link by title or construct DOI URL
          let url = result.metadata?.doi ? `https://doi.org/${result.metadata.doi}` : undefined
          const pmcUrl = pmcLinks.get(title.toLowerCase())
          if (pmcUrl) {
            url = pmcUrl // PMC link takes precedence
          }
          
          documents.push({
            content: result.content,
            metadata: {
              source: basename(filePath),
              title,
              type: this.getFileType(ext),
              timestamp: Date.now(),
              filePath,
              authors: result.metadata?.authors,
              doi: result.metadata?.doi,
              year: result.metadata?.year,
              journal: result.metadata?.journal,
              url,
            },
          })
        }
      }
    }

    return documents
  }
}

export const documentLoader = new DocumentLoader()
