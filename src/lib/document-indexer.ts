import { OpenAIEmbeddings } from '@langchain/openai'
import { Chroma } from '@langchain/community/vectorstores/chroma'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { Document } from '@langchain/core/documents'
import type { VectorStore } from '@langchain/core/vectorstores'
import { ChromaClient } from 'chromadb'

export interface DocumentMetadata {
  source: string
  title: string
  type: string
  timestamp: number
}

export interface IndexedDocument {
  id: string
  content: string
  metadata: DocumentMetadata
  embedding?: number[]
}

export class DocumentIndexer {
  private vectorStore: VectorStore | null = null
  private embeddings: OpenAIEmbeddings | null = null
  private documents: Map<string, IndexedDocument> = new Map()
  private chromaClient: ChromaClient | null = null
  private collectionName = 'cosmic-canvas-documents'

  async initialize(apiKey?: string, chromaUrl = 'http://localhost:8000') {
    if (!apiKey) {
      throw new Error('OpenAI API key is required')
    }

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: 'text-embedding-3-large', // Latest embeddings model with 3072 dimensions
    })

    // Parse chromaUrl to extract host and port
    const url = new URL(chromaUrl)
    const host = url.hostname
    const port = parseInt(url.port) || 8000

    // Initialize Chroma client - connects to Chroma server
    this.chromaClient = new ChromaClient({
      host,
      port,
    })

    // Create or get the collection
    this.vectorStore = await Chroma.fromExistingCollection(
      this.embeddings,
      {
        collectionName: this.collectionName,
        host,
        port,
      }
    ).catch(async () => {
      // Collection doesn't exist, create it
      return await Chroma.fromDocuments(
        [], // Start with empty collection
        this.embeddings,
        {
          collectionName: this.collectionName,
          host,
          port,
        }
      )
    })
  }

  async indexDocuments(docs: Array<{ content: string; metadata: DocumentMetadata }>) {
    if (!this.vectorStore || !this.embeddings) {
      throw new Error('Indexer not initialized. Call initialize() first.')
    }

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    })

    const allDocuments: Document[] = []

    for (const doc of docs) {
      const splits = await textSplitter.createDocuments(
        [doc.content],
        [doc.metadata]
      )

      allDocuments.push(...splits)

      // Store in our document map
      const docId = `${doc.metadata.source}-${Date.now()}`
      this.documents.set(docId, {
        id: docId,
        content: doc.content,
        metadata: doc.metadata,
      })
    }

    await this.vectorStore.addDocuments(allDocuments)

    return {
      indexed: docs.length,
      chunks: allDocuments.length,
    }
  }

  async search(query: string, k = 5) {
    if (!this.vectorStore) {
      throw new Error('Indexer not initialized. Call initialize() first.')
    }

    const results = await this.vectorStore.similaritySearchWithScore(query, k)

    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      score, // L2 squared distance (0-2 range for normalized vectors, lower = more similar)
      similarity: this.distanceToSimilarity(score), // Converted similarity score (0-1 range)
    }))
  }

  /**
   * Converts L2 squared distance to similarity score
   * Chroma uses L2 squared distance by default (range 0-2 for normalized OpenAI embeddings)
   * @param distance L2 squared distance (0 = identical, 2 = maximum distance)
   * @returns Similarity score (0 = dissimilar, 1 = identical)
   */
  private distanceToSimilarity(distance: number): number {
    // For normalized vectors, L2 squared distance ranges from 0 to 2
    // Convert to similarity: 0 distance = 1 similarity, 2 distance = 0 similarity
    return Math.max(0, 1 - distance / 2)
  }

  async searchRelated(query: string, k = 5) {
    const results = await this.search(query, k)

    // Build a graph of related documents
    const nodes = new Set<string>()
    const edges: Array<{ source: string; target: string; weight: number }> = []

    results.forEach((result, idx) => {
      const source = result.metadata.source as string
      nodes.add(source)

      // Create edges between top results based on similarity scores
      if (idx > 0) {
        const prevSource = results[idx - 1].metadata.source as string
        edges.push({
          source: prevSource,
          target: source,
          weight: result.similarity, // Use similarity for edge weight (higher = stronger connection)
        })
      }
    })

    return {
      nodes: Array.from(nodes).map(nodeId => {
        const result = results.find(r => r.metadata.source === nodeId)
        return {
          id: nodeId,
          content: result?.content || '',
          metadata: result?.metadata,
          score: result?.score || 0,
          similarity: result?.similarity || 0,
        }
      }),
      edges,
    }
  }

  getDocuments() {
    return Array.from(this.documents.values())
  }

  clear() {
    this.documents.clear()
    this.vectorStore = null
  }
}

// Singleton instance
export const documentIndexer = new DocumentIndexer()
