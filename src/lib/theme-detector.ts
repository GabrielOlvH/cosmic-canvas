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
Analyze these academic documents and identify ${targetThemeCount}-${targetThemeCount + 2} distinct research themes or clusters.

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
Return ONLY a JSON array of themes with this structure:
[
  {
    "name": "Theme Name (3-5 words)",
    "description": "One sentence description",
    "documentIndices": [0, 1, 5, 7]
  }
]

Guidelines:
1. Each theme should be distinct and meaningful
2. Most documents should belong to 1-2 themes
3. Theme names should be concise and descriptive
4. Cover all major research areas represented
5. Return ONLY the JSON array, no other text
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
   * Groups documents by similarity score ranges
   */
  private createFallbackThemes(documents: DocumentNode[]): Theme[] {
    const themes: Theme[] = [
      {
        id: 'theme-0',
        name: 'Highly Relevant Studies',
        description: 'Documents with highest similarity to the research question',
        color: 'blue',
        documentIds: documents
          .filter(d => d.similarity > 0.7)
          .map(d => d.metadata.source),
      },
      {
        id: 'theme-1',
        name: 'Moderately Relevant Studies',
        description: 'Documents with moderate similarity to the research question',
        color: 'green',
        documentIds: documents
          .filter(d => d.similarity >= 0.5 && d.similarity <= 0.7)
          .map(d => d.metadata.source),
      },
      {
        id: 'theme-2',
        name: 'Supporting Context',
        description: 'Background and contextual documents',
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
