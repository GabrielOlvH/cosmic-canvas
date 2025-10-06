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

  async initialize(openrouterKey: string, model = 'google/gemini-2.5-flash') {
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
    targetThemeCount = 7,
    researchQuestion?: string
  ): Promise<Theme[]> {
    if (!this.llm) {
      throw new Error('ThemeDetector not initialized. Call initialize() first.')
    }

    // Prepare document summaries for LLM
    const documentSummaries = documents.map((doc, idx) => ({
      id: doc.metadata.source,
      index: idx,
      title: doc.metadata.title,
      preview: doc.content.substring(0, 300),
    }))

    const rq = researchQuestion ? researchQuestion.trim() : 'the overarching research topic'
    const prompt = `You are a scientific literature analyst extracting BIOLOGICAL/PHYSIOLOGICAL themes from research papers.

RESEARCH CONTEXT: "${rq}"

CRITICAL RULES:
❌ ABSOLUTELY FORBIDDEN theme names (these will cause INSTANT REJECTION):
   - "Primary Research Focus" / "Core Research" / "Main Studies"
   - "Methodological Approaches" / "Methods" / "Techniques"
   - "General Findings" / "Supporting Studies" / "Background"
   - ANY name containing these words: "research", "study", "studies", "approach", "method", "finding", "focus", "primary", "secondary", "core", "supporting"

✅ REQUIRED: Extract ${targetThemeCount} themes describing ACTUAL BIOLOGICAL CONTENT:
   - Organ systems: bone, muscle, heart, brain, eye, gut, liver, kidney, immune
   - Biological processes: metabolism, transcription, inflammation, apoptosis, adaptation
   - Physiological effects: density loss, dysfunction, dysregulation, atrophy, damage
   - Cell/tissue types: mitochondrial, cardiovascular, neural, hepatic
   - Experimental models: microgravity, radiation, spaceflight, hindlimb unloading

GOOD EXAMPLES (use these patterns):
✓ "Bone Density and Musculoskeletal Changes"
✓ "Cardiovascular System Adaptation"  
✓ "Immune System Dysregulation"
✓ "Gut Microbiome Alterations"
✓ "Transcriptomic Responses"
✓ "Mitochondrial Dysfunction"
✓ "Retinal and Ocular Damage"
✓ "Muscle Atrophy and Function"

DOCUMENTS TO ANALYZE:
${documentSummaries
  .map(
    d => `[${d.index}] ${d.title}
${d.preview}...
`
  )
  .join('\n')}

TASK: Look at the titles above and extract the BIOLOGICAL/MEDICAL content (organs, systems, processes, effects).

OUTPUT FORMAT (JSON only, no markdown, no explanation):
[
  {
    "name": "Biological Theme Name (3-6 words)",
    "description": "One sentence describing the biological system or mechanism",
    "documentIndices": [0, 3, 5, 8, 12]
  }
]

REQUIREMENTS:
- Return EXACTLY ${targetThemeCount} themes
- Each theme should have 4-8 documents
- Theme names MUST describe biological content (not meta-categories)
- Return ONLY the JSON array, nothing else`

    const response = await this.llm.invoke(prompt)
    const content = response.content as string

    try {
      // Extract JSON from response with better cleaning
      let jsonText = content.trim()
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      // Find JSON array
      const jsonMatch = jsonText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.warn('⚠️  No JSON found in LLM response, using semantic clustering')
        return this.createSemanticThemes(documents, documentSummaries, targetThemeCount)
      }

      const rawThemes = JSON.parse(jsonMatch[0])

      let themes: Theme[] = rawThemes.map((rawTheme: any, idx: number) => ({
        id: `theme-${idx}`,
        name: rawTheme.name,
        description: rawTheme.description,
        color: THEME_COLORS[idx % THEME_COLORS.length],
        documentIds: rawTheme.documentIndices.map(
          (i: number) => documentSummaries[i].id
        ),
      }))

      // STRICT VALIDATION: Reject forbidden theme names
      const forbiddenPatterns = /primary|general|misc|method|approach|focus|mixed|various|background|core|research|study|studies|finding|secondary|supporting|relevant|main|central/i
      const invalidThemes = themes.filter(t => forbiddenPatterns.test(t.name))
      
      if (invalidThemes.length > 0) {
        console.warn('⚠️  LLM returned generic/forbidden theme names:', invalidThemes.map(t => t.name).join(', '))
        console.warn('   Using semantic clustering fallback instead')
        return this.createSemanticThemes(documents, documentSummaries, targetThemeCount)
      }

      // Check if too few themes
      if (themes.length < Math.max(4, targetThemeCount - 2)) {
        console.warn(`⚠️  LLM returned only ${themes.length} themes (target: ${targetThemeCount}), using semantic fallback`)
        return this.createSemanticThemes(documents, documentSummaries, targetThemeCount)
      }

      console.log(`✓ Theme detection successful: ${themes.length} valid biological themes`)
      return themes
    } catch (error) {
      console.error('Failed to parse theme detection response:', error)
      console.error('Response content:', content.substring(0, 500))
      return this.createSemanticThemes(documents, documentSummaries, targetThemeCount)
    }
  }

  /**
   * Semantic theme creation using biological term extraction
   * Clusters documents by extracting organ systems, processes, and biological terms from titles
   */
  private createSemanticThemes(
    documents: DocumentNode[],
    _summaries: { id: string; index: number; title: string; preview: string }[],
    targetCount: number
  ): Theme[] {
    console.log('🔬 Creating themes from biological term extraction...')
    
    // Biological keyword categories
    const bioTerms = {
      bone: /bone|skeletal|osteo|musculoskeletal|vertebra/i,
      cardiovascular: /heart|cardiac|cardiovascular|vascular|blood|vessel/i,
      immune: /immune|immunol|lymph|cytokine|inflammation|antibod/i,
      brain: /brain|neural|neuro|cognit|cerebral|nervous/i,
      gut: /gut|microbiom|intestin|gastrointestinal|colon/i,
      eye: /eye|ocular|retina|visual|vision|optic/i,
      muscle: /muscle|muscular|myofib|sarco|contractil/i,
      liver: /liver|hepatic/i,
      gene: /gene|transcript|rna|genom|express/i,
      mitochondrial: /mitochond|oxidative|atp|respiration/i,
      radiation: /radiation|cosmic|ray|particle/i,
      microgravity: /microgravity|weightless|spaceflight|space.*flight/i,
      metabol: /metabol|glyco|lipid|nutrient/i,
      kidney: /kidney|renal|nephro/i,
      cell: /cell|cellular|apoptosis|proliferation/i,
    }

    // Count which docs match which categories
    const docCategories = new Map<string, string[]>()
    for (const doc of documents) {
      const text = (doc.metadata.title + ' ' + doc.content.substring(0, 500)).toLowerCase()
      const matches: string[] = []
      for (const [category, pattern] of Object.entries(bioTerms)) {
        if (pattern.test(text)) matches.push(category)
      }
      if (matches.length > 0) {
        docCategories.set(doc.metadata.source, matches)
      }
    }

    // Build theme candidates
    const themeCandidates: Record<string, string[]> = {}
    for (const [docId, categories] of docCategories.entries()) {
      for (const cat of categories) {
        if (!themeCandidates[cat]) themeCandidates[cat] = []
        themeCandidates[cat].push(docId)
      }
    }

    // Filter to themes with reasonable document counts and sort by size
    const viableThemes = Object.entries(themeCandidates)
      .filter(([, docs]) => docs.length >= 3 && docs.length <= 25)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, targetCount)

    const themeNames: Record<string, string> = {
      bone: 'Bone Density and Musculoskeletal Changes',
      cardiovascular: 'Cardiovascular System Adaptation',
      immune: 'Immune System Dysregulation',
      brain: 'Neurological and Cognitive Effects',
      gut: 'Gut Microbiome Alterations',
      eye: 'Retinal and Ocular Damage',
      muscle: 'Muscle Atrophy and Function',
      liver: 'Hepatic Metabolism and Function',
      gene: 'Transcriptomic Responses',
      mitochondrial: 'Mitochondrial Dysfunction',
      radiation: 'Radiation Effects',
      microgravity: 'Microgravity-Induced Changes',
      metabol: 'Metabolic Alterations',
      kidney: 'Renal Function and Damage',
      cell: 'Cellular Stress Responses',
    }

    const themes: Theme[] = viableThemes.map(([cat, docIds], idx) => ({
      id: `theme-${idx}`,
      name: themeNames[cat] || this.titleCaseKeyword(cat),
      description: `Studies examining ${cat}-related effects and mechanisms`,
      color: THEME_COLORS[idx % THEME_COLORS.length],
      documentIds: docIds,
    }))

    // If we don't have enough themes, split large ones or use simple fallback
    if (themes.length < Math.max(3, targetCount - 3)) {
      console.warn('⚠️  Not enough viable semantic themes, using simple clustering')
      return this.createSimpleFallback(documents, targetCount)
    }

    console.log(`✓ Created ${themes.length} semantic themes from biological terms`)
    themes.forEach(t => console.log(`  - ${t.name} (${t.documentIds.length} docs)`))
    return themes
  }

  /**
   * Last-resort fallback: simple clustering by similarity
   */
  private createSimpleFallback(documents: DocumentNode[], targetCount: number): Theme[] {
    const sorted = [...documents].sort((a, b) => b.similarity - a.similarity)
    const perTheme = Math.ceil(documents.length / targetCount)
    const themes: Theme[] = []
    
    for (let i = 0; i < targetCount; i++) {
      const start = i * perTheme
      const docs = sorted.slice(start, start + perTheme)
      if (docs.length > 0) {
        themes.push({
          id: `theme-${i}`,
          name: `Research Cluster ${i + 1}`,
          description: `Document group ${i + 1} by relevance`,
          color: THEME_COLORS[i % THEME_COLORS.length],
          documentIds: docs.map(d => d.metadata.source),
        })
      }
    }

    return themes
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

  private titleCaseKeyword(k: string) { 
    return k.replace(/(^|\s)\w/g, m => m.toUpperCase()) 
  }
}
