import { ChatOpenAI } from '@langchain/openai'
import type { DocumentIndexer, DocumentMetadata } from './document-indexer'

export interface ExhaustiveSearchOptions {
  similarityThreshold?: number
  maxIterations?: number
  verbose?: boolean
}

export interface ExhaustiveSearchResult {
  documents: Array<{
    content: string
    metadata: DocumentMetadata
    similarity: number
  }>
  iterations: number
  documentsFound: number
  queriesExecuted: string[]
  conceptCoverage: number
}

interface SearchState {
  originalQuery: string
  queriesExecuted: string[]
  documentsRetrieved: Map<string, any>
  iterations: number
  recentResults: Array<{
    query: string
    newDocuments: number
    maxSimilarity: number
  }>
}

export class ExhaustiveSearch {
  private llm: ChatOpenAI | null = null

  constructor(private indexer: DocumentIndexer) {}

  async initialize(openrouterKey: string, model = 'google/gemini-2.5-flash') {
    this.llm = new ChatOpenAI({
      openAIApiKey: openrouterKey,
      modelName: model,
      temperature: 0.3,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'Authorization': `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'https://cosmic-canvas.app',
          'X-Title': 'Cosmic Canvas Exhaustive Search',
        },
      },
    })
  }

  async searchUntilExhaustive(
    query: string,
    options: ExhaustiveSearchOptions = {}
  ): Promise<ExhaustiveSearchResult> {
    if (!this.llm) {
      throw new Error('ExhaustiveSearch not initialized. Call initialize() first.')
    }

    const {
      similarityThreshold = 0.5,
      maxIterations = 15,
      verbose = false,
    } = options

    const state: SearchState = {
      originalQuery: query,
      queriesExecuted: [],
      documentsRetrieved: new Map(),
      iterations: 0,
      recentResults: [],
    }

    // FIRST: Enrich the query with domain context
    const enrichedQuery = await this.enrichQuery(query)
    if (verbose) {
      console.log(`  🔬 Original query: "${query}"`)
      console.log(`  🔬 Enriched query: "${enrichedQuery}"`)
    }

    // Extract key concepts from enriched query
    const concepts = await this.extractConcepts(enrichedQuery)

    // Initial broad search with ENRICHED query
    await this.executeSearch(enrichedQuery, state, { similarityThreshold, verbose })

    // Iterative focused searches until exhaustive
    while (!this.isExhaustive(state, concepts, similarityThreshold) && state.iterations < maxIterations) {
      // Generate next search query targeting gaps
      const nextQuery = await this.generateNextQuery(state, concepts)

      if (!nextQuery || state.queriesExecuted.includes(nextQuery)) {
        break // Can't generate new queries
      }

      await this.executeSearch(nextQuery, state, { similarityThreshold, verbose })
    }

    const coverage = this.calculateCoverage(state, concepts)

    return {
      documents: Array.from(state.documentsRetrieved.values()),
      iterations: state.iterations,
      documentsFound: state.documentsRetrieved.size,
      queriesExecuted: state.queriesExecuted,
      conceptCoverage: coverage,
    }
  }

  private async extractConcepts(query: string): Promise<string[]> {
    if (!this.llm) return []

    const prompt = `Extract 5-8 key concepts or search terms from this research question. Return ONLY a comma-separated list of concepts.

Research Question: "${query}"

Concepts:`

    const response = await this.llm.invoke(prompt)
    const concepts = (response.content as string)
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0)

    return concepts
  }

  private async enrichQuery(query: string): Promise<string> {
    if (!this.llm) return query

    const prompt = `You are helping search a scientific document database about space biology, microgravity effects, plants in space, astronaut health, and cellular changes in spaceflight.

User's query: "${query}"

Expand this query with relevant scientific context and terminology that would help find relevant documents in the database. Include:
- Related scientific terms
- Biological/physiological aspects
- Space/microgravity context if relevant
- Alternative phrasings

Return ONLY the enriched query text (1-2 sentences), no explanation.

Enriched query:`

    const response = await this.llm.invoke(prompt)
    return (response.content as string).trim()
  }

  private async executeSearch(
    query: string,
    state: SearchState,
    options: { similarityThreshold: number; verbose?: boolean }
  ): Promise<void> {
    const results = await this.indexer.search(query, 50) // Large k for exhaustiveness

    // Filter by similarity threshold
    const relevant = results.filter(r => r.similarity >= options.similarityThreshold)

    // Add to collection (dedup by unique ID)
    let newCount = 0
    for (const result of relevant) {
      const id = `${result.metadata.source}-${result.content.substring(0, 50)}`
      if (!state.documentsRetrieved.has(id)) {
        state.documentsRetrieved.set(id, result)
        newCount++
      }
    }

    state.queriesExecuted.push(query)
    state.iterations++
    state.recentResults.push({
      query,
      newDocuments: newCount,
      maxSimilarity: relevant[0]?.similarity || 0,
    })

    if (options.verbose) {
      console.log(`  📊 Iteration ${state.iterations}: "${query}" → ${newCount} new docs (total: ${state.documentsRetrieved.size})`)
    }
  }

  private isExhaustive(state: SearchState, concepts: string[], threshold: number): boolean {
    // If we have no documents after first iteration, stop immediately
    if (state.iterations > 0 && state.documentsRetrieved.size === 0) {
      return true
    }

    // No new documents in last 2 iterations
    const recentResults = state.recentResults.slice(-2)
    const noNewDocs = recentResults.every(r => r.newDocuments === 0)

    // Similarity plateau
    const lowSimilarity = recentResults.every(r => r.maxSimilarity < threshold)

    // Concept coverage high
    const coverage = this.calculateCoverage(state, concepts)
    const highCoverage = coverage > 0.85

    return (noNewDocs || lowSimilarity) && highCoverage
  }

  private calculateCoverage(state: SearchState, concepts: string[]): number {
    const allContent = Array.from(state.documentsRetrieved.values())
      .map(d => d.content)
      .join(' ')
      .toLowerCase()

    const coveredConcepts = concepts.filter(concept =>
      allContent.includes(concept.toLowerCase())
    )

    return concepts.length > 0 ? coveredConcepts.length / concepts.length : 0
  }

  private async generateNextQuery(state: SearchState, concepts: string[]): Promise<string | null> {
    if (!this.llm) return null

    const coverage = this.calculateCoverage(state, concepts)
    const coveredConcepts = concepts.filter(concept => {
      const allContent = Array.from(state.documentsRetrieved.values())
        .map(d => d.content)
        .join(' ')
        .toLowerCase()
      return allContent.includes(concept.toLowerCase())
    })

    const uncoveredConcepts = concepts.filter(c => !coveredConcepts.includes(c))

    const prompt = `You are conducting a systematic literature search. Generate the next search query to find missing information.

Original Question: "${state.originalQuery}"
Concepts: ${concepts.join(', ')}
Covered Concepts: ${coveredConcepts.join(', ')}
Uncovered Concepts: ${uncoveredConcepts.join(', ')}
Coverage: ${(coverage * 100).toFixed(0)}%

Previous ${state.queriesExecuted.length} searches:
${state.queriesExecuted.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

Generate ONE new search query that targets uncovered concepts or explores a different angle. Return ONLY the query text, no explanation.

Next search query:`

    const response = await this.llm.invoke(prompt)
    const nextQuery = (response.content as string).trim().replace(/^["']|["']$/g, '')

    return nextQuery
  }
}
