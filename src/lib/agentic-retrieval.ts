import { ChatOpenAI } from '@langchain/openai'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { DocumentIndexer } from './document-indexer'

export interface AgenticRetrievalOptions {
  maxIterations?: number
  verbose?: boolean
}

export interface AgenticRetrievalResult {
  answer: string
  retrievalSteps: Array<{
    query: string
    results: number
    topSimilarity: number
  }>
  totalChunksRetrieved: number
}

export class AgenticRetrieval {
  private indexer: DocumentIndexer
  private llm: ChatOpenAI | null = null

  constructor(indexer: DocumentIndexer) {
    this.indexer = indexer
  }

  async initialize(
    openaiKey: string,
    openrouterKey: string,
    model = 'openai/gpt-5' // GPT-5 via OpenRouter
  ) {
    // Use OpenRouter for completions with tool calling support
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
          'X-Title': 'Cosmic Canvas Agentic RAG',
        },
      },
    })
  }

  /**
   * Agentic retrieval: LLM autonomously decides what to search for
   */
  async agenticRetrieve(
    userQuery: string,
    options: AgenticRetrievalOptions = {}
  ): Promise<AgenticRetrievalResult> {
    if (!this.llm) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }

    const { maxIterations = 5, verbose = false } = options

    const retrievalSteps: Array<{
      query: string
      results: number
      topSimilarity: number
    }> = []

    let allRetrievedChunks: any[] = []

    // Create vector search tool for the agent
    const searchTool = new DynamicStructuredTool({
      name: 'search_documents',
      description: 'Search the document collection using semantic similarity. Use this to find relevant information to answer the user\'s question. You can call this multiple times with different search queries to gather comprehensive information.',
      schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant documents',
          },
          k: {
            type: 'number',
            description: 'Number of results to retrieve (default: 10)',
            default: 10,
          },
        },
        required: ['query'],
      } as any,
      func: async ({ query, k = 10 }) => {
        if (verbose) {
          console.log(`🔍 [AGENT TOOL CALL] search_documents(query="${query}", k=${k})`)
        }

        const results = await this.indexer.search(query, k)

        // Track retrieval step
        retrievalSteps.push({
          query,
          results: results.length,
          topSimilarity: results[0]?.similarity || 0,
        })

        // Store retrieved chunks
        allRetrievedChunks.push(...results)

        // Return formatted results to agent
        const formattedResults = results
          .slice(0, 5) // Limit to top 5 for context window
          .map((r, idx) => {
            const similarity = (r.similarity * 100).toFixed(1)
            return `[${idx + 1}] ${r.metadata.title} (${similarity}% similarity)\n${r.content.substring(0, 300)}...`
          })
          .join('\n\n')

        if (verbose) {
          console.log(`✓ [AGENT] Retrieved ${results.length} chunks, top similarity: ${(results[0]?.similarity * 100).toFixed(1)}%\n`)
        }

        return formattedResults
      },
    })

    // Create agent prompt
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are a research assistant that can search through a document collection to answer questions.

You have access to a semantic search tool that finds relevant documents. You should:
1. Break down complex questions into multiple search queries
2. Search for different aspects of the question
3. Gather comprehensive information before answering
4. Cite specific documents when providing information

After you've gathered enough information, provide a comprehensive answer based on what you found.`],
      ['human', '{input}'],
      ['placeholder', '{agent_scratchpad}'],
    ])

    // Create tool-calling agent
    const agent = await createToolCallingAgent({
      llm: this.llm,
      tools: [searchTool],
      prompt,
    })

    const agentExecutor = new AgentExecutor({
      agent,
      tools: [searchTool],
      maxIterations,
      verbose,
    })

    if (verbose) {
      console.log(`🤖 [AGENTIC RETRIEVAL] Starting agent with max ${maxIterations} iterations...\n`)
    }

    // Execute agent
    const result = await agentExecutor.invoke({
      input: userQuery,
    })

    if (verbose) {
      console.log(`\n✅ [AGENTIC RETRIEVAL] Complete!`)
      console.log(`   Total retrieval steps: ${retrievalSteps.length}`)
      console.log(`   Total chunks retrieved: ${allRetrievedChunks.length}\n`)
    }

    return {
      answer: result.output,
      retrievalSteps,
      totalChunksRetrieved: allRetrievedChunks.length,
    }
  }
}
