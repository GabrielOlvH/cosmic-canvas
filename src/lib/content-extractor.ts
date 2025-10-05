import { ChatOpenAI } from '@langchain/openai'
import type { DocumentNode } from './relationship-extractor'

export interface KeyFinding {
  documentId: string
  finding: string // 3-7 word key finding/concept
  detail: string // 1 sentence supporting detail
  importance: number // 0-1, how central this finding is
}

export interface ThemeFindings {
  themeId: string
  themeName: string
  findings: KeyFinding[]
}

export class ContentExtractor {
  private llm: ChatOpenAI | null = null

  async initialize(openrouterKey: string, model = 'moonshotai/kimi-k2-0905') {
    this.llm = new ChatOpenAI({
      openAIApiKey: openrouterKey,
      modelName: model,
      temperature: 0.3,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          Authorization: `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'https://cosmic-canvas.app',
          'X-Title': 'Cosmic Canvas Content Extraction',
        },
      },
    })
  }

  /**
   * Extract key findings from documents within a theme
   */
  async extractKeyFindings(
    documents: DocumentNode[],
    themeName: string,
    researchQuestion: string
  ): Promise<KeyFinding[]> {
    if (!this.llm) {
      throw new Error('ContentExtractor not initialized. Call initialize() first.')
    }

    // PERFORMANCE: Limit to top 15 documents by similarity to avoid JSON errors and speed up generation
    const MAX_DOCS_PER_THEME = 15
    const limitedDocuments = documents
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, MAX_DOCS_PER_THEME)

    console.log(`  → Processing ${limitedDocuments.length} documents (limited from ${documents.length})`)

    // Prepare document data for LLM
    const documentData = limitedDocuments.map((doc, idx) => ({
      id: doc.metadata.source,
      index: idx,
      title: doc.metadata.title,
      content: doc.content.substring(0, 500), // First 500 chars
      similarity: doc.similarity,
    }))

    const prompt = `<task>
Extract the KEY FINDINGS or MAIN RESULTS from these research documents related to "${themeName}" in the context of: "${researchQuestion}"

<documents>
${documentData
  .map(
    d => `
[${d.index}] ${d.title}
Content: ${d.content}...
Relevance: ${(d.similarity * 100).toFixed(0)}%
`
  )
  .join('\n')}
</documents>

<instructions>
For each document, extract:
1. ONE key finding or main result (can be 1-3 lines if needed - be descriptive!)
2. ONE sentence of supporting context/detail
3. Importance score (0-1) based on how central this is to ${themeName}

Guidelines:
- Focus on ACTUAL RESEARCH FINDINGS and RESULTS, not just topic descriptions
- Be SPECIFIC and DETAILED - don't just say "DNA damage" say "Increased mitochondrial DNA deletions observed after 30 days exposure"
- Use complete sentences or detailed phrases that capture the scientific result
- The finding will be displayed in a rectangle shape - it can wrap across 2-3 lines
- Example GOOD finding: "Microgravity exposure induces a 2.5-fold increase in reactive oxygen species in cardiomyocytes"
- Example BAD finding: "Cellular changes observed"
</instructions>

<output_format>
Return ONLY a JSON array:
[
  {
    "documentIndex": 0,
    "finding": "Detailed finding text (1-3 lines, be specific about the result)",
    "detail": "Additional context or methodology note.",
    "importance": 0.85
  }
]

Return ONLY the JSON array, no other text.
</output_format>
</task>`

    const response = await this.llm.invoke(prompt)
    const content = response.content as string

    try {
      // Extract JSON from response with better cleaning
      let jsonText = content.match(/\[[\s\S]*\]/)?.[0]
      if (!jsonText) {
        console.warn('No JSON found in content extraction response, using fallback')
        return this.createFallbackFindings(documents)
      }

      // Clean up common JSON issues more carefully
      jsonText = jsonText
        .replace(/[\u201C\u201D]/g, '"') // Smart quotes to regular quotes
        .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas

      // Try to parse, if it fails use fallback
      let rawFindings
      try {
        rawFindings = JSON.parse(jsonText)
      } catch (parseError) {
        console.warn('JSON parse failed, attempting to fix and retry...', parseError)
        try {
          // Try removing newlines more carefully - only within quoted strings
          jsonText = jsonText.replace(/"([^"]*)\n([^"]*)"/g, '"$1 $2"')
          rawFindings = JSON.parse(jsonText)
        } catch (secondError) {
          console.warn('Second parse attempt failed, using fallback', secondError)
          return this.createFallbackFindings(documents)
        }
      }

      // Convert to KeyFinding objects
      const findings: KeyFinding[] = rawFindings.map((raw: any) => {
        const doc = documentData[raw.documentIndex]
        if (!doc) {
          console.warn(`Document index ${raw.documentIndex} not found in documentData`)
          return null
        }
        return {
          documentId: doc.id,
          finding: raw.finding || this.extractFallbackFinding(doc.title, doc.content),
          detail: raw.detail || doc.title,
          importance: raw.importance || doc.similarity,
        }
      }).filter(Boolean) as KeyFinding[]

      console.log(`  ✓ Extracted ${findings.length} findings from LLM`)
      return findings
    } catch (error) {
      console.error('Failed to parse content extraction response:', error)
      return this.createFallbackFindings(documents)
    }
  }

  /**
   * Extract a research question/central concept from the query
   */
  async extractResearchQuestion(query: string): Promise<string> {
    if (!this.llm) {
      throw new Error('ContentExtractor not initialized. Call initialize() first.')
    }

    const prompt = `<task>
Convert this research query into a concise CENTRAL RESEARCH QUESTION for a mind map (5-10 words max):

Query: "${query}"

<instructions>
- Make it a clear, focused question or statement
- Use keywords that capture the essence
- Keep it SHORT (5-10 words)
- Example input: "What are the effects of mitochondrial dysfunction on aging?"
- Example output: "Mitochondrial Dysfunction & Aging Effects"
</instructions>

Return ONLY the research question text, no other text.
</task>`

    const response = await this.llm.invoke(prompt)
    const content = (response.content as string).trim()

    // Clean up any quotes or extra text
    const cleaned = content.replace(/^["']|["']$/g, '').trim()

    return cleaned || this.createFallbackQuestion(query)
  }

  /**
   * Fallback: create simple findings from document titles
   */
  private createFallbackFindings(documents: DocumentNode[]): KeyFinding[] {
    return documents.map(doc => ({
      documentId: doc.metadata.source,
      finding: this.extractFallbackFinding(doc.metadata.title, doc.content),
      detail: doc.metadata.title,
      importance: doc.similarity,
    }))
  }

  /**
   * Extract a fallback finding from title/content
   */
  private extractFallbackFinding(title: string, content: string): string {
    // Try to extract from title first
    const titleWords = title
      .split(/[\s\-_]+/)
      .filter(w => w.length > 3)
      .slice(0, 5)
      .join(' ')

    if (titleWords.length > 10) {
      return titleWords.substring(0, 50) + '...'
    }

    // Fallback to first meaningful words from content
    const contentWords = content
      .split(/[\s\n]+/)
      .filter(w => w.length > 4)
      .slice(0, 5)
      .join(' ')

    return contentWords.substring(0, 50) + '...'
  }

  /**
   * Create fallback research question from query
   */
  private createFallbackQuestion(query: string): string {
    // Take first 10 words or 60 chars
    const words = query.split(/\s+/).slice(0, 10).join(' ')
    return words.length > 60 ? words.substring(0, 57) + '...' : words
  }

  /**
   * Batch extract findings for all themes
   */
  async extractAllThemeFindings(
    documents: DocumentNode[],
    themes: Array<{ id: string; name: string; documentIds: string[] }>,
    researchQuestion: string,
    verbose = false
  ): Promise<Map<string, KeyFinding[]>> {
    const findingsMap = new Map<string, KeyFinding[]>()

    for (const theme of themes) {
      if (verbose) {
        console.log(`  📝 Extracting findings for theme: ${theme.name}`)
      }

      // Get documents for this theme
      const themeDocs = documents.filter(d => theme.documentIds.includes(d.metadata.source))

      if (themeDocs.length === 0) {
        continue
      }

      try {
        const findings = await this.extractKeyFindings(themeDocs, theme.name, researchQuestion)
        findingsMap.set(theme.id, findings)

        if (verbose) {
          console.log(`  ✓ Extracted ${findings.length} findings`)
        }
      } catch (error) {
        console.error(`Failed to extract findings for theme ${theme.name}:`, error)
        // Use fallback
        const fallbackFindings = this.createFallbackFindings(themeDocs)
        findingsMap.set(theme.id, fallbackFindings)
      }
    }

    return findingsMap
  }
}
