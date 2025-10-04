export interface BibliographyEntry {
  id: string
  authors: string[] | null
  year: number | null
  title: string
  source: string
  citationKey: string
}

export class BibliographyGenerator {
  entries: Map<string, BibliographyEntry> = new Map()

  extractMetadata(metadata: { source: string; title: string }, content: string): BibliographyEntry {
    // Try to extract from PDF content
    const authors = this.extractAuthors(content)
    const year = this.extractYear(content, metadata.source)

    // Generate citation key
    const citationKey = authors && year
      ? `${authors[0].split(' ').pop()}_${year}`
      : metadata.title.substring(0, 20).replace(/\s+/g, '_')

    return {
      id: metadata.source,
      authors,
      year,
      title: metadata.title,
      source: metadata.source,
      citationKey,
    }
  }

  private extractAuthors(content: string): string[] | null {
    // Look for author patterns in first 500 characters
    const header = content.substring(0, 500)

    // Pattern: "Smith, J., Johnson, K., & Lee, M."
    const pattern1 = /([A-Z][a-z]+,\s+[A-Z]\.(?:,\s+)?)+/g
    const match1 = header.match(pattern1)

    if (match1) {
      return match1[0].split(',').map(a => a.trim()).filter(a => a)
    }

    // Pattern: "John Smith, Karen Johnson, Michael Lee"
    const pattern2 = /([A-Z][a-z]+\s+[A-Z][a-z]+(?:,\s+)?)+/g
    const match2 = header.match(pattern2)

    if (match2) {
      return match2[0].split(',').map(a => a.trim())
    }

    return null
  }

  private extractYear(content: string, filename: string): number | null {
    // Look for year in filename first
    const filenameYear = filename.match(/20\d{2}/)
    if (filenameYear) {
      return Number.parseInt(filenameYear[0])
    }

    // Look for year in first 1000 characters
    const header = content.substring(0, 1000)
    const yearPattern = /\(?(20\d{2})\)?/g
    const matches = header.match(yearPattern)

    if (matches) {
      // Take most recent year found
      const years = matches.map(m => Number.parseInt(m.replace(/[()]/g, '')))
      return Math.max(...years)
    }

    return null
  }

  getInlineCitation(documentSource: string): string {
    const entry = this.entries.get(documentSource)
    if (!entry) return `(${documentSource})`

    if (entry.authors && entry.year) {
      if (entry.authors.length === 1) {
        const lastName = entry.authors[0].split(' ').pop()
        return `(${lastName}, ${entry.year})`
      }
      if (entry.authors.length === 2) {
        const last1 = entry.authors[0].split(' ').pop()
        const last2 = entry.authors[1].split(' ').pop()
        return `(${last1} & ${last2}, ${entry.year})`
      }
      const lastName = entry.authors[0].split(' ').pop()
      return `(${lastName} et al., ${entry.year})`
    }

    return `(${entry.citationKey})`
  }

  formatAPA(entry: BibliographyEntry): string {
    let result = ''

    // Authors
    if (entry.authors && entry.authors.length > 0) {
      if (entry.authors.length === 1) {
        result += entry.authors[0]
      } else if (entry.authors.length === 2) {
        result += `${entry.authors[0]}, & ${entry.authors[1]}`
      } else {
        const allButLast = entry.authors.slice(0, -1).join(', ')
        result += `${allButLast}, & ${entry.authors[entry.authors.length - 1]}`
      }
    } else {
      result += '[Author Unknown]'
    }

    // Year
    result += ` (${entry.year || 'n.d.'}).`

    // Title
    result += ` ${entry.title}.`

    return result
  }

  generateBibliography(): string {
    const sorted = Array.from(this.entries.values()).sort((a, b) => {
      const aKey = a.authors?.[0]?.split(' ').pop() || a.title
      const bKey = b.authors?.[0]?.split(' ').pop() || b.title
      return aKey.localeCompare(bKey)
    })

    return '## References\n\n' + sorted.map(e => this.formatAPA(e)).join('\n\n')
  }

  addEntry(entry: BibliographyEntry): void {
    this.entries.set(entry.id, entry)
  }

  clear(): void {
    this.entries.clear()
  }
}
