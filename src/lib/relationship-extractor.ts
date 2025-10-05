export interface SimilarityEdge {
  source: string // document source ID
  target: string
  similarity: number // 0-1
  type: 'semantic'
}

export interface CitationEdge {
  source: string // citing document
  target: string // cited document
  type: 'citation'
}

export interface ContradictionEdge {
  source: string
  target: string
  type: 'contradiction'
  description: string
}

export type DocumentEdge = SimilarityEdge | CitationEdge | ContradictionEdge

export interface DocumentNode {
  id: string
  content: string
  metadata: {
    source: string
    title: string
    type: string
    timestamp: number
    authors?: string
    doi?: string
    year?: number
    journal?: string
    url?: string
  }
  similarity: number // similarity to original query
}

export class RelationshipExtractor {
  /**
   * Compute pairwise semantic similarity matrix
   * Uses cosine distance between embeddings (already available via search results)
   */
  computeSimilarityMatrix(
    documents: DocumentNode[],
    threshold = 0.6
  ): SimilarityEdge[] {
    const edges: SimilarityEdge[] = []

    // For each pair of documents
    for (let i = 0; i < documents.length; i++) {
      for (let j = i + 1; j < documents.length; j++) {
        const docA = documents[i]
        const docB = documents[j]

        // Simple heuristic: if both have high similarity to query,
        // they're likely related (co-relevant)
        const estimatedSimilarity = Math.min(docA.similarity, docB.similarity)

        // Also check content overlap as proxy for semantic similarity
        const contentSimilarity = this.estimateContentSimilarity(
          docA.content,
          docB.content
        )

        const finalSimilarity = (estimatedSimilarity + contentSimilarity) / 2

        if (finalSimilarity >= threshold) {
          edges.push({
            source: docA.metadata.source,
            target: docB.metadata.source,
            similarity: finalSimilarity,
            type: 'semantic',
          })
        }
      }
    }

    return edges
  }

  /**
   * Estimate content similarity using simple text overlap
   * (Better than nothing when we don't have embedding vectors directly)
   */
  private estimateContentSimilarity(contentA: string, contentB: string): number {
    // Extract key terms (simple word-based approach)
    const termsA = this.extractKeyTerms(contentA)
    const termsB = this.extractKeyTerms(contentB)

    // Calculate Jaccard similarity
    const intersection = termsA.filter(term => termsB.includes(term)).length
    const union = new Set([...termsA, ...termsB]).size

    return union > 0 ? intersection / union : 0
  }

  /**
   * Extract key terms from text (simple approach)
   */
  private extractKeyTerms(text: string): string[] {
    // Remove common words and keep significant terms
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'as',
      'by',
      'with',
    ])

    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 50) // Top 50 terms
  }

  /**
   * Detect direct citations by looking for author names and years
   * This is a heuristic approach - not perfect but helpful
   */
  extractCitations(documents: DocumentNode[]): CitationEdge[] {
    const edges: CitationEdge[] = []
    const documentsByAuthorYear = new Map<string, string>()

    // Build index of documents by author-year pattern
    for (const doc of documents) {
      const authors = this.extractAuthors(doc.content)
      const year = this.extractYear(doc.metadata.title || doc.content)

      if (authors.length > 0 && year) {
        const key = `${authors[0]}_${year}`
        documentsByAuthorYear.set(key.toLowerCase(), doc.metadata.source)
      }
    }

    // Look for citations in each document
    for (const doc of documents) {
      const citations = this.findCitationPatterns(doc.content)

      for (const citation of citations) {
        const targetDoc = documentsByAuthorYear.get(citation.toLowerCase())
        if (targetDoc && targetDoc !== doc.metadata.source) {
          edges.push({
            source: doc.metadata.source,
            target: targetDoc,
            type: 'citation',
          })
        }
      }
    }

    return edges
  }

  /**
   * Extract author names from text (simple pattern matching)
   */
  private extractAuthors(text: string): string[] {
    // Look for capitalized names (simple heuristic)
    const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+(?:et al\.|[A-Z][a-z]+)\b/g
    const matches = text.match(namePattern) || []
    return matches.slice(0, 3) // Take first 3
  }

  /**
   * Extract year from text
   */
  private extractYear(text: string): number | null {
    const yearPattern = /\b(19|20)\d{2}\b/
    const match = text.match(yearPattern)
    return match ? parseInt(match[0]) : null
  }

  /**
   * Find citation patterns like (Smith, 2023) or Smith et al. 2023
   */
  private findCitationPatterns(text: string): string[] {
    const patterns = [
      // (Author, Year) or (Author et al., Year)
      /\(([A-Z][a-z]+(?:\s+et al\.)?),?\s+(19|20)\d{2}\)/g,
      // Author Year format
      /\b([A-Z][a-z]+(?:\s+et al\.)?)\s+(19|20)\d{2}\b/g,
    ]

    const citations: string[] = []

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern)
      for (const match of matches) {
        const author = match[1].trim()
        const year = match[2] + match[3]
        citations.push(`${author}_${year}`)
      }
    }

    return citations
  }

  /**
   * Identify contradiction pairs
   * Documents from adversarial search likely contradict main findings
   */
  identifyContradictions(
    mainDocuments: DocumentNode[],
    adversarialDocuments: DocumentNode[]
  ): ContradictionEdge[] {
    const edges: ContradictionEdge[] = []

    // Each adversarial document potentially contradicts highly similar main documents
    for (const advDoc of adversarialDocuments) {
      // Find main documents with overlapping content
      for (const mainDoc of mainDocuments) {
        const contentSimilarity = this.estimateContentSimilarity(
          advDoc.content,
          mainDoc.content
        )

        // If they share content but came from adversarial search,
        // they likely present opposing views
        if (contentSimilarity > 0.3) {
          edges.push({
            source: mainDoc.metadata.source,
            target: advDoc.metadata.source,
            type: 'contradiction',
            description: 'Potential opposing viewpoint identified',
          })
        }
      }
    }

    return edges
  }

  /**
   * Main method to extract all relationships
   */
  extractAllRelationships(
    documents: DocumentNode[],
    adversarialDocuments: DocumentNode[] = []
  ): {
    semantic: SimilarityEdge[]
    citations: CitationEdge[]
    contradictions: ContradictionEdge[]
  } {
    const allDocs = [...documents, ...adversarialDocuments]

    return {
      semantic: this.computeSimilarityMatrix(documents, 0.6),
      citations: this.extractCitations(allDocs),
      contradictions: this.identifyContradictions(documents, adversarialDocuments),
    }
  }
}
