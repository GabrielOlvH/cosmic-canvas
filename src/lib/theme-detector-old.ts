import { ChatOpenAI } from '@langchain/openai'
import type { DocumentNode } from './relationship-extractor'

export interface Theme {
  id: string
  name: string
  description: string
  color: string
  documentIds: string[]
}

export interface DocumentThemeMap {
  [documentId: string]: string[] // Document can belong to multiple themes
}

const THEME_COLORS = [
  'blue',
  'green',
  'orange',
  'red',
  'violet',
  'yellow',
  'light-blue',
  'light-green',
]

export class ThemeDetector {
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
          'X-Title': 'Cosmic Canvas Theme Detection',
        },
      },
    })
  }

  /**
   * Use LLM to identify themes from document titles and abstracts
   */
  async detectThemes(
    documents: DocumentNode[],
    targetThemeCount = 5
  ): Promise<Theme[]> {
    if (!this.llm) {
      throw new Error('ThemeDetector not initialized. Call initialize() first.')
    }

    // Prepare document summaries for LLM
    const documentSummaries = documents.map((doc, idx) => ({
      id: doc.metadata.source,
      index: idx,
      title: doc.metadata.title,
      preview: doc.content.substring(0, 200),
    }))

    const prompt = `<task>
Analyze these academic documents and identify ${targetThemeCount}-${targetThemeCount + 2} distinct RESEARCH SUB-TOPICS.

These should be SPECIFIC ASPECTS or ANGLES of the research area - NOT generic quality categories like "relevant studies" or "highly cited papers".

Think: What different scientific questions, methodologies, phenomena, or domains do these papers explore?

<documents>
${documentSummaries
  .map(
    d => `
[${d.index}] ID: ${d.id}
Title: ${d.title}
Preview: ${d.preview}...
`
  )
  .join('\n')}
</documents>

<output_format>
Return ONLY a JSON array of sub-topics with this structure:
[
  {
    "name": "Specific Sub-Topic Name (2-6 words, can be multi-line in the visualization)",
    "description": "Clear 1-2 sentence description of what specific aspect this covers",
    "documentIndices": [0, 1, 5, 7]
  }
]

Guidelines:
1. Sub-topics should represent SPECIFIC research areas, methods, or phenomena
2. Examples of GOOD sub-topics: "Mitochondrial DNA Damage", "Bone Density Loss Mechanisms", "Radiation-Induced Cellular Stress"
3. Examples of BAD sub-topics: "Highly Relevant Studies", "Core Research", "Supporting Documents"
4. Each sub-topic should have 3-8 documents
5. Most documents should belong to 1-2 sub-topics
6. Names can be longer (up to 6 words) - they will wrap in the visualization
7. Return ONLY the JSON array, no other text
</output_format>
</task>`

    const response = await this.llm.invoke(prompt)
    const content = response.content as string

    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON array found in LLM response')
      }

      const rawThemes = JSON.parse(jsonMatch[0])

      // Convert to Theme objects
      const themes: Theme[] = rawThemes.map((rawTheme: any, idx: number) => ({
        id: `theme-${idx}`,
        name: rawTheme.name,
        description: rawTheme.description,
        color: THEME_COLORS[idx % THEME_COLORS.length],
        documentIds: rawTheme.documentIndices.map(
          (i: number) => documentSummaries[i].id
        ),
      }))

      return themes
    } catch (error) {
      console.error('Failed to parse theme detection response:', error)
      console.error('Response content:', content)

      // Fallback: create simple themes based on similarity
      return this.createFallbackThemes(documents)
    }
  }

  /**
   * Fallback theme creation if LLM fails
   * Groups documents by content similarity and creates meaningful clusters
   */
  private createFallbackThemes(documents: DocumentNode[]): Theme[] {
    // Sort by similarity
    const sorted = [...documents].sort((a, b) => b.similarity - a.similarity)
    
    const themes: Theme[] = [
      {
        id: 'theme-0',
        name: 'Primary Research Focus',
        description: 'Core studies directly addressing the main research question',
        color: 'blue',
        documentIds: sorted
          .slice(0, Math.ceil(sorted.length * 0.4))
          .map(d => d.metadata.source),
      },
      {
        id: 'theme-1',
        name: 'Methodological Approaches',
        description: 'Studies exploring different experimental methods and techniques',
        color: 'green',
        documentIds: sorted
          .slice(Math.ceil(sorted.length * 0.4), Math.ceil(sorted.length * 0.7))
          .map(d => d.metadata.source),
      },
      {
        id: 'theme-2',
        name: 'Contextual Background',
        description: 'Supporting literature and theoretical foundations',
        color: 'orange',
        documentIds: documents
          .filter(d => d.similarity < 0.5)
          .map(d => d.metadata.source),
      },
    ]

    return themes.filter(t => t.documentIds.length > 0)
  }

  /**
   * Assign documents to themes
   */
  assignDocumentsToThemes(
    documents: DocumentNode[],
    themes: Theme[]
  ): DocumentThemeMap {
    const map: DocumentThemeMap = {}

    // Initialize all documents
    for (const doc of documents) {
      map[doc.metadata.source] = []
    }

    // Assign based on theme membership
    for (const theme of themes) {
      for (const docId of theme.documentIds) {
        if (map[docId]) {
          map[docId].push(theme.id)
        }
      }
    }

    return map
  }

  /**
   * Get theme by document ID
   */
  getThemesForDocument(docId: string, themeMap: DocumentThemeMap): string[] {
    return themeMap[docId] || []
  }

  /**
   * Get documents in theme
   */
  getDocumentsInTheme(themeId: string, themes: Theme[]): string[] {
    const theme = themes.find(t => t.id === themeId)
    return theme ? theme.documentIds : []
  }
}
