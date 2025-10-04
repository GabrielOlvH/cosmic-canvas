import { ChatOpenAI } from '@langchain/openai'
import type { DocumentIndexer } from './document-indexer'
import { ExhaustiveSearch } from './exhaustive-search'
import { BibliographyGenerator, type BibliographyEntry } from './bibliography-generator'
import { CanvasGenerator, type CanvasResult } from './canvas-generator'
import type { DocumentNode } from './relationship-extractor'

export interface ResearchOptions {
  exhaustive?: boolean
  citationStyle?: 'APA'
  minSources?: number
  verbose?: boolean
  mode?: 'text' | 'canvas' // New: choose output format
}

export interface ResearchSynthesis {
  synthesis: string
  bibliography: string
  sources: BibliographyEntry[]
  metrics: {
    sourcesRetrieved: number
    citationsMade: number
    searchIterations: number
    coverage: number
  }
}

export class ResearchAssistant {
  private llm: ChatOpenAI | null = null
  private exhaustiveSearch: ExhaustiveSearch
  private canvasGenerator: CanvasGenerator

  constructor(private indexer: DocumentIndexer) {
    this.exhaustiveSearch = new ExhaustiveSearch(indexer)
    this.canvasGenerator = new CanvasGenerator()
  }

  async initialize(openaiKey: string, openrouterKey: string, model = 'moonshotai/kimi-k2-0905') {
    // Initialize LLM for synthesis (via OpenRouter) - using faster Kimi model
    this.llm = new ChatOpenAI({
      openAIApiKey: openrouterKey,
      modelName: model,
      temperature: 0.3,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'Authorization': `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'https://cosmic-canvas.app',
          'X-Title': 'Cosmic Canvas Research',
        },
      },
    })

    // Initialize exhaustive search with same model
    await this.exhaustiveSearch.initialize(openrouterKey, model)

    // Initialize canvas generator
    await this.canvasGenerator.initialize(openrouterKey, model)
  }

  async conductResearch(
    query: string,
    options: ResearchOptions = {}
  ): Promise<ResearchSynthesis> {
    if (!this.llm) {
      throw new Error('ResearchAssistant not initialized. Call initialize() first.')
    }

    const {
      exhaustive = true,
      verbose = false,
    } = options

    // PHASE 1: Exhaustive retrieval
    if (verbose) {
      console.log('🔍 Phase 1: Exhaustive Source Discovery')
    }

    const searchResult = await this.exhaustiveSearch.searchUntilExhaustive(query, {
      verbose,
      similarityThreshold: 0.6, // Higher threshold = fewer but better sources
      maxIterations: 5, // Reduced from 15 to 5 for speed
    })

    if (verbose) {
      console.log(`✓ Found ${searchResult.documentsFound} sources in ${searchResult.iterations} iterations`)
      console.log(`✓ Concept coverage: ${(searchResult.conceptCoverage * 100).toFixed(1)}%\n`)
    }

    // PHASE 1.5: Adversarial/Contradictory Source Discovery
    if (verbose) {
      console.log('🔬 Phase 1.5: Adversarial Source Discovery')
    }

    const adversarialQueries = await this.generateAdversarialQueries(query)
    let adversarialDocsFound = 0

    if (verbose) {
      adversarialQueries.forEach(q => console.log(`  🔍 Adversarial query: "${q}"`))
    }

    // Run all adversarial searches concurrently for speed
    const adversarialSearches = adversarialQueries.map(advQuery =>
      this.indexer.search(advQuery, 20)
    )
    const adversarialResults = await Promise.all(adversarialSearches)

    // Add new documents that weren't in initial search
    for (const advResults of adversarialResults) {
      for (const result of advResults) {
        const id = `${result.metadata.source}-${result.content.substring(0, 50)}`
        const alreadyHas = searchResult.documents.some(
          d => `${d.metadata.source}-${d.content.substring(0, 50)}` === id
        )

        if (!alreadyHas && result.similarity >= 0.5) { // Higher threshold
          searchResult.documents.push(result)
          adversarialDocsFound++
        }
      }
    }

    if (verbose) {
      console.log(`✓ Found ${adversarialDocsFound} additional sources from adversarial search`)
      console.log(`✓ Total sources: ${searchResult.documents.length}\n`)
    }

    // Sort by similarity (best first) for optimal context ordering
    searchResult.documents.sort((a, b) => b.similarity - a.similarity)

    // PHASE 2: Build bibliography
    if (verbose) {
      console.log('📚 Phase 2: Bibliography Generation')
    }

    const bibliography = new BibliographyGenerator()
    for (const doc of searchResult.documents) {
      const entry = bibliography.extractMetadata(doc.metadata, doc.content)
      bibliography.addEntry(entry)
    }

    if (verbose) {
      console.log(`✓ Generated ${bibliography.entries.size} bibliography entries\n`)
    }

    // PHASE 3: Build citation-aware context
    if (verbose) {
      console.log('📝 Phase 3: Context Preparation')
    }

    const context = searchResult.documents
      .map((doc, idx) => {
        const citation = bibliography.getInlineCitation(doc.metadata.source)
        return `[Source ${idx + 1} - Citation: ${citation}]
Title: ${doc.metadata.title}
Content: ${doc.content}
---`
      })
      .join('\n\n')

    if (verbose) {
      console.log(`✓ Prepared ${searchResult.documents.length} source contexts\n`)
    }

    // PHASE 4: Academic synthesis
    if (verbose) {
      console.log('🎓 Phase 4: Academic Synthesis')
    }

    const prompt = `<role>You are a rigorous academic researcher conducting a systematic literature review. Your task is to synthesize findings from the provided sources with complete accuracy and transparency.</role>

<research_question>${query}</research_question>

<critical_constraints>
These constraints are ABSOLUTE and violations will invalidate the entire review:

1. SOURCE FIDELITY: You MUST ONLY use information EXPLICITLY stated in the <sources> section below
   - DO NOT use ANY knowledge from your training data
   - DO NOT make inferences beyond what sources explicitly state
   - DO NOT add background information not present in sources
   - If uncertain whether something is from a source, DO NOT include it

2. VERIFICATION TEST: Before writing ANY sentence, ask yourself:
   - "Can I point to the exact source text that supports this claim?"
   - "Have I cited this claim?"
   - If NO to either question → DELETE the sentence

3. COVERAGE GAPS: If the sources don't address an aspect of the research question, you MUST state:
   "No sources in this review address [specific aspect]"

4. CONTRADICTIONS ARE REQUIRED: You must actively seek and report contradictory findings
   - Failing to identify contradictions when they exist is an error
   - Present ALL perspectives, even conflicting ones
</critical_constraints>

<citation_protocol>
MANDATORY RULES:
- EVERY factual claim requires an inline citation
- Use the EXACT citation format provided with each source in <sources>
- Format: (AuthorLastName, Year) or (Author1 & Author2, Year) or (Author1 et al., Year)
- Multiple sources: (Smith, 2023; Johnson, 2022)
- NO EXCEPTIONS: If you cannot cite it → do not write it

EXAMPLES:
✓ CORRECT: "Spaceflight induces oxidative stress in mammalian cells (Wilson, 2007)."
✗ WRONG: "Spaceflight induces oxidative stress." [missing citation]
✗ WRONG: "It is well known that spaceflight induces stress." [implies general knowledge, not sourced]
</citation_protocol>

<contradiction_detection>
ACTIVE SEARCH FOR DISAGREEMENTS:
1. Compare findings across sources for the same phenomenon
2. Look for:
   - Opposing conclusions
   - Different effect sizes or magnitudes
   - Methodological criticisms between studies
   - Conflicting theoretical frameworks
   - Studies that invalidate others' claims

3. When found, use explicit language:
   - "However, [Author1] contradicts this finding, reporting..."
   - "In direct contrast to [Author1], [Author2] observed..."
   - "[Author1] critiques [Author2]'s methodology, noting..."
   - "While [Author1] supports X, [Author2] provides evidence against X..."

4. Dedicated section required: ## Contradictions and Conflicts in the Literature
</contradiction_detection>

<output_structure>
Your response MUST follow this exact structure:

## Abstract
[One paragraph: Research question, key themes identified, major findings, and primary contradictions if any. Every claim cited.]

## Introduction
[Scope of review, research question context, number of sources analyzed. Only include information from sources.]

## Literature Review
[Organize by themes YOU identify from the sources. Each theme gets a subsection.]

### [Theme 1 Name - extracted from sources]
[Synthesis of what sources say about this theme. Every claim cited. Highlight disagreements.]

### [Theme 2 Name - extracted from sources]
[Synthesis continues. Every claim cited.]

[Continue with themes as identified in sources]

## Methodological Overview
[Research methods, sample sizes, study designs mentioned in sources. All cited.]

## Synthesis and Discussion
[CRITICAL SECTION requiring:]
- **Consensus Areas**: What do most/all sources agree on? (cited)
- **Contradictory Findings**: Where do sources directly disagree? (both sides cited)
- **Discrepancies**: Unexplained differences in results (cited)
- **Competing Frameworks**: Different theoretical approaches (cited)
- **Study Limitations**: What authors themselves acknowledge (cited)

## Contradictions and Conflicts in the Literature
[REQUIRED: List every major disagreement found. Format:]
- [Author1, Year] reports X, while [Author2, Year] reports opposite finding Y
- [Author3, Year] criticizes [Author4, Year]'s methodology because...
- No consensus exists on [topic]: [Author5] supports theory A, [Author6] supports theory B

[If truly none exist: "No major contradictions were identified across the ${searchResult.documentsFound} reviewed sources."]

## Research Gaps and Future Directions
[What's missing from the literature? What do authors recommend? All cited.]

## Key Findings Summary
[Bulleted list of 5-10 main takeaways. Each bullet cited.]
</output_structure>

<sources>
Total sources: ${searchResult.documentsFound} documents

${context}
</sources>

<final_reminders>
1. Every sentence with a factual claim = citation required
2. No training data knowledge allowed
3. Contradictions must be identified and reported
4. If not in <sources>, don't write it
5. Be thorough and scholarly
</final_reminders>`

    const response = await this.llm.invoke(prompt)
    const synthesisText = response.content as string

    if (verbose) {
      console.log(`✓ Generated synthesis (${synthesisText.length} characters)\n`)
    }

    // PHASE 5: Generate bibliography
    if (verbose) {
      console.log('📖 Phase 5: Bibliography Formatting')
    }

    const bibliographyText = bibliography.generateBibliography()
    const citationCount = this.countCitations(synthesisText)

    if (verbose) {
      console.log(`✓ Bibliography complete with ${bibliography.entries.size} references`)
      console.log(`✓ Found ${citationCount} citations in synthesis\n`)
    }

    return {
      synthesis: synthesisText,
      bibliography: bibliographyText,
      sources: Array.from(bibliography.entries.values()),
      metrics: {
        sourcesRetrieved: searchResult.documentsFound,
        citationsMade: citationCount,
        searchIterations: searchResult.iterations,
        coverage: searchResult.conceptCoverage,
      },
    }
  }

  /**
   * Conduct research and generate interactive canvas visualization
   */
  async conductResearchCanvas(
    query: string,
    options: ResearchOptions = {}
  ): Promise<CanvasResult> {
    const { verbose = false } = options

    // PHASE 1: Exhaustive retrieval (same as text mode)
    if (verbose) {
      console.log('🔍 Phase 1: Exhaustive Source Discovery')
    }

    const searchResult = await this.exhaustiveSearch.searchUntilExhaustive(query, {
      verbose,
      similarityThreshold: 0.6,
      maxIterations: 5,
    })

    if (verbose) {
      console.log(`✓ Found ${searchResult.documentsFound} sources in ${searchResult.iterations} iterations`)
      console.log(`✓ Concept coverage: ${(searchResult.conceptCoverage * 100).toFixed(1)}%\n`)
    }

    // PHASE 1.5: Adversarial/Contradictory Source Discovery
    if (verbose) {
      console.log('🔬 Phase 1.5: Adversarial Source Discovery')
    }

    const adversarialQueries = await this.generateAdversarialQueries(query)
    let adversarialDocsFound = 0
    const adversarialDocs: any[] = []

    if (verbose) {
      adversarialQueries.forEach(q => console.log(`  🔍 Adversarial query: "${q}"`))
    }

    // Run all adversarial searches concurrently
    const adversarialSearches = adversarialQueries.map(advQuery =>
      this.indexer.search(advQuery, 20)
    )
    const adversarialResults = await Promise.all(adversarialSearches)

    // Collect adversarial documents
    for (const advResults of adversarialResults) {
      for (const result of advResults) {
        const id = `${result.metadata.source}-${result.content.substring(0, 50)}`
        const alreadyHas = searchResult.documents.some(
          d => `${d.metadata.source}-${d.content.substring(0, 50)}` === id
        )

        if (!alreadyHas && result.similarity >= 0.5) {
          adversarialDocs.push(result)
          adversarialDocsFound++
        }
      }
    }

    if (verbose) {
      console.log(`✓ Found ${adversarialDocsFound} additional sources from adversarial search`)
      console.log(`✓ Total sources: ${searchResult.documents.length + adversarialDocsFound}\n`)
    }

    // Sort by similarity
    searchResult.documents.sort((a, b) => b.similarity - a.similarity)

    // Convert to DocumentNode format
    const mainDocuments: DocumentNode[] = searchResult.documents.map(doc => ({
      id: doc.metadata.source,
      content: doc.content,
      metadata: {
        source: doc.metadata.source,
        title: doc.metadata.title || doc.metadata.source,
        type: doc.metadata.type || 'document',
        timestamp: doc.metadata.timestamp || Date.now(),
      },
      similarity: doc.similarity,
    }))

    const adversarialDocuments: DocumentNode[] = adversarialDocs.map(doc => ({
      id: doc.metadata.source,
      content: doc.content,
      metadata: {
        source: doc.metadata.source,
        title: doc.metadata.title || doc.metadata.source,
        type: doc.metadata.type || 'document',
        timestamp: doc.metadata.timestamp || Date.now(),
      },
      similarity: doc.similarity,
    }))

    // PHASE 2-5: Generate Canvas
    const canvas = await this.canvasGenerator.generateCanvas(
      mainDocuments,
      adversarialDocuments,
      { verbose }
    )

    return canvas
  }

  private countCitations(text: string): number {
    // Count APA-style citations: (Author, Year) or (Author et al., Year)
    const citationPattern = /\([A-Z][a-z]+(?:\s+(?:et al\.|&\s+[A-Z][a-z]+))?,\s+\d{4}\)/g
    const matches = text.match(citationPattern)
    return matches ? matches.length : 0
  }

  /**
   * Generate adversarial/contradictory queries to find opposing viewpoints
   */
  private async generateAdversarialQueries(originalQuery: string): Promise<string[]> {
    if (!this.llm) return []

    const prompt = `You are tasked with finding ALL relevant perspectives on a research question, including contradictory and opposing viewpoints.

Original Research Question: "${originalQuery}"

Generate 3-5 adversarial search queries that would find:
1. Contradictory evidence or opposing findings
2. Limitations, criticisms, or negative results
3. Alternative theories or competing hypotheses
4. Methodological criticisms
5. Studies that invalidate or challenge the main findings

Return ONLY a JSON array of query strings, no explanation.

Example format: ["query 1", "query 2", "query 3"]

Adversarial queries:`

    const response = await this.llm.invoke(prompt)
    const content = response.content as string

    try {
      // Extract JSON array from response
      const jsonMatch = content.match(/\[.*\]/s)
      if (jsonMatch) {
        const queries = JSON.parse(jsonMatch[0])
        return queries.filter((q: string) => q && q.length > 0)
      }
    } catch (error) {
      console.error('Failed to parse adversarial queries:', error)
    }

    return []
  }
}
