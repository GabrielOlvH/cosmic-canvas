import { ChatOpenAI } from '@langchain/openai'
import { DocumentIndexer } from './document-indexer'
import type { DocumentMetadata } from './document-indexer'
import { ResearchAssistant, type ResearchSynthesis, type ResearchOptions } from './research-assistant'

export interface SynthesisOptions {
  maxRetrieval?: number
  temperature?: number
  iterative?: boolean
  verbose?: boolean // Log LLM thinking process
}

export interface SynthesisResult {
  description: string
  sources: Array<{
    title: string
    source: string
    relevance: number
  }>
  chunks: number
  tokensUsed?: number
}

export class DocumentAgent {
  private indexer: DocumentIndexer
  private llm: ChatOpenAI | null = null
  private researchAssistant: ResearchAssistant

  constructor(indexer: DocumentIndexer) {
    this.indexer = indexer
    this.researchAssistant = new ResearchAssistant(indexer)
  }

  async initialize(
    openaiKey: string,
    openrouterKey: string,
    model = 'openai/gpt-5' // GPT-5 via OpenRouter
  ) {
    // Use OpenRouter for completions (no quota issues)
    // GPT-5 only supports temperature=1
    const temperature = model.includes('gpt-5') ? 1 : 0.3

    this.llm = new ChatOpenAI({
      openAIApiKey: openrouterKey,
      modelName: model,
      temperature,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          'Authorization': `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'https://cosmic-canvas.app',
          'X-Title': 'Cosmic Canvas RAG',
        },
      },
    })

    // Initialize research assistant
    await this.researchAssistant.initialize(openaiKey, openrouterKey)
  }

  /**
   * Generate a comprehensive description by retrieving and synthesizing
   * all relevant information from indexed documents
   */
  async synthesizeInformation(
    query: string,
    options: SynthesisOptions = {}
  ): Promise<SynthesisResult> {
    if (!this.llm) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }

    const {
      maxRetrieval = 20,
      temperature = 0.3,
      iterative = true,
      verbose = false,
    } = options

    // Step 1: Retrieve all relevant documents
    const results = await this.indexer.search(query, maxRetrieval)

    if (results.length === 0) {
      return {
        description: 'No relevant information found in the indexed documents.',
        sources: [],
        chunks: 0,
      }
    }

    // Step 2: Prepare context from retrieved chunks
    const context = results
      .map((result, idx) => {
        return `[Document ${idx + 1}: ${result.metadata.title}]
${result.content}
---`
      })
      .join('\n\n')

    // Step 3: Create synthesis prompt
    const prompt = `You are an expert research assistant tasked with providing comprehensive, accurate information.

Query: "${query}"

I've retrieved the following information from multiple documents. Please analyze ALL of this information and provide a thorough, well-structured response that:

1. Synthesizes information from ALL relevant sources
2. Provides a comprehensive overview
3. Includes specific details and examples from the documents
4. Organizes information logically
5. Cites which documents information came from (e.g., "According to Document 2...")

Retrieved Information:
${context}

Please provide a detailed, comprehensive response that captures all relevant information from the sources above. Be thorough and accurate.`

    // Step 4: Generate synthesis with LLM
    // GPT-5 doesn't support custom temperature, use the LLM as-is for GPT-5
    const modelName = this.llm.modelName || ''
    const llmWithTemp = modelName.startsWith('gpt-5') ? this.llm : this.llm.bind({ temperature })
    const response = await Promise.race([
      llmWithTemp.invoke(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('LLM call timeout after 90s')), 90000))
    ]) as any

    // Step 5: If iterative mode, check for gaps and retrieve more if needed
    let finalDescription = response.content as string

    if (iterative && results.length >= maxRetrieval) {
      // Ask LLM if there are any gaps
      const gapCheckPrompt = `Based on this response about "${query}", are there any important aspects or questions that weren't fully addressed?

Response:
${finalDescription}

Reply with ONLY "COMPLETE" if the response is comprehensive, or list specific gaps/questions if more information is needed.`

      const gapCheck = await this.llm.invoke(gapCheckPrompt)
      const gapResponse = gapCheck.content as string

      if (!gapResponse.includes('COMPLETE')) {
        // Perform additional retrieval based on identified gaps
        const additionalResults = await this.indexer.search(gapResponse, 10)

        if (additionalResults.length > 0) {
          const additionalContext = additionalResults
            .map((result, idx) => {
              return `[Additional Document ${idx + 1}: ${result.metadata.title}]
${result.content}
---`
            })
            .join('\n\n')

          const refinementPrompt = `Previous response:
${finalDescription}

Identified gaps:
${gapResponse}

Additional information found:
${additionalContext}

Please provide an updated, more comprehensive response that addresses the gaps and incorporates this additional information.`

          const refinedResponse = await llmWithTemp.invoke(refinementPrompt)
          finalDescription = refinedResponse.content as string
        }
      }
    }

    // Step 6: Extract unique sources
    const uniqueSources = new Map<string, { title: string; source: string; relevance: number }>()

    results.forEach(result => {
      const source = result.metadata.source as string
      if (!uniqueSources.has(source)) {
        uniqueSources.set(source, {
          title: (result.metadata as DocumentMetadata).title,
          source,
          relevance: result.similarity, // Use similarity (0-1) instead of distance
        })
      }
    })

    return {
      description: finalDescription,
      sources: Array.from(uniqueSources.values()).sort((a, b) => b.relevance - a.relevance), // Higher similarity = more relevant
      chunks: results.length,
    }
  }

  /**
   * Answer a specific question using retrieved context
   */
  async answerQuestion(question: string, k = 10): Promise<string> {
    if (!this.llm) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }

    const results = await this.indexer.search(question, k)

    if (results.length === 0) {
      return 'I could not find relevant information to answer this question in the indexed documents.'
    }

    const context = results
      .map((result, idx) => {
        return `Source ${idx + 1} (${result.metadata.title}):
${result.content}`
      })
      .join('\n\n')

    const prompt = `Answer the following question based ONLY on the provided context. If the context doesn't contain enough information to answer the question, say so.

Question: ${question}

Context:
${context}

Answer:`

    const response = await this.llm.invoke(prompt)
    return response.content as string
  }

  /**
   * Compare and contrast multiple topics from the documents
   */
  async compareTopics(topics: string[], k = 15): Promise<string> {
    if (!this.llm) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }

    const allResults: Array<{ topic: string; results: any[] }> = []

    // Retrieve information for each topic
    for (const topic of topics) {
      const results = await this.indexer.search(topic, k)
      allResults.push({ topic, results })
    }

    // Build context
    const context = allResults
      .map(({ topic, results }) => {
        const topicContext = results
          .map(r => `${r.metadata.title}: ${r.content}`)
          .join('\n\n')
        return `Information about "${topic}":
${topicContext}
---`
      })
      .join('\n\n')

    const prompt = `Compare and contrast the following topics based on the provided information:

Topics: ${topics.join(', ')}

${context}

Provide a detailed comparison that:
1. Highlights similarities between the topics
2. Identifies key differences
3. Explains relationships and connections
4. Provides specific examples from the sources

Comparison:`

    const response = await this.llm.invoke(prompt)
    return response.content as string
  }

  /**
   * Conduct academic research with exhaustive retrieval and formal citations
   */
  async conductResearch(
    query: string,
    options: ResearchOptions = {}
  ): Promise<ResearchSynthesis> {
    return await this.researchAssistant.conductResearch(query, options)
  }

  /**
   * Generate a summary of all indexed documents on a topic
   */
  async summarizeTopic(topic: string, k = 25): Promise<SynthesisResult> {
    if (!this.llm) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }

    const results = await this.indexer.search(topic, k)

    if (results.length === 0) {
      return {
        description: `No information found about "${topic}" in the indexed documents.`,
        sources: [],
        chunks: 0,
      }
    }

    const context = results
      .map(r => `${r.metadata.title}: ${r.content}`)
      .join('\n\n---\n\n')

    const prompt = `Create a comprehensive, well-organized summary about "${topic}" based on the following information from multiple documents:

${context}

Your summary should:
- Cover all major aspects and subtopics
- Be organized with clear headings
- Include specific details and examples
- Be comprehensive yet readable
- Cite which documents contributed which information

Summary:`

    const response = await this.llm.invoke(prompt)

    const uniqueSources = new Map<string, { title: string; source: string; relevance: number }>()
    results.forEach(result => {
      const source = result.metadata.source as string
      if (!uniqueSources.has(source)) {
        uniqueSources.set(source, {
          title: (result.metadata as DocumentMetadata).title,
          source,
          relevance: result.similarity, // Use similarity (0-1) instead of distance
        })
      }
    })

    return {
      description: response.content as string,
      sources: Array.from(uniqueSources.values()).sort((a, b) => b.relevance - a.relevance), // Higher similarity = more relevant
      chunks: results.length,
    }
  }
}
