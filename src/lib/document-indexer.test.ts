import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DocumentIndexer } from './document-indexer'
import { config } from 'dotenv'

// Load environment variables
config()

// These are integration tests that use real OpenAI API calls
// Set OPENAI_API_KEY in .env to run these tests
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

describe('DocumentIndexer Integration Tests', () => {
  let indexer: DocumentIndexer

  beforeEach(() => {
    indexer = new DocumentIndexer()
  })

  afterEach(() => {
    indexer.clear()
  })

  describe('Real API Integration', () => {
    it.skipIf(!OPENAI_API_KEY)('should initialize with real API key', async () => {
      await expect(indexer.initialize(OPENAI_API_KEY)).resolves.not.toThrow()
    })

    it.skipIf(!OPENAI_API_KEY)('should index and search documents with real embeddings', async () => {
      await indexer.initialize(OPENAI_API_KEY)

      const docs = [
        {
          content: 'Machine learning is a subset of artificial intelligence that focuses on training algorithms to learn from data.',
          metadata: {
            source: 'ml-intro',
            title: 'Machine Learning Introduction',
            type: 'article',
            timestamp: Date.now(),
          },
        },
        {
          content: 'Deep learning uses neural networks with multiple layers to process data and make predictions.',
          metadata: {
            source: 'dl-basics',
            title: 'Deep Learning Basics',
            type: 'guide',
            timestamp: Date.now(),
          },
        },
        {
          content: 'React is a JavaScript library for building user interfaces, particularly single-page applications.',
          metadata: {
            source: 'react-intro',
            title: 'React Introduction',
            type: 'documentation',
            timestamp: Date.now(),
          },
        },
      ]

      const indexResult = await indexer.indexDocuments(docs)
      expect(indexResult.indexed).toBe(3)
      expect(indexResult.chunks).toBeGreaterThan(0)

      // Search for AI-related content
      const aiResults = await indexer.search('artificial intelligence and neural networks', 5)
      expect(aiResults.length).toBeGreaterThan(0)

      // The first results should be about ML/DL, not React
      const topResult = aiResults[0]
      expect(topResult.content.toLowerCase()).toMatch(/(machine learning|deep learning|neural)/i)
      expect(topResult.score).toBeGreaterThan(0)

      // Search for React-related content
      const reactResults = await indexer.search('JavaScript user interface library', 5)
      expect(reactResults.length).toBeGreaterThan(0)

      const topReactResult = reactResults[0]
      expect(topReactResult.content.toLowerCase()).toContain('react')
    }, 30000) // 30 second timeout for API calls

    it.skipIf(!OPENAI_API_KEY)('should find semantic relationships', async () => {
      await indexer.initialize(OPENAI_API_KEY)

      const docs = [
        {
          content: 'Python is a high-level programming language known for its simplicity and readability.',
          metadata: {
            source: 'python-intro',
            title: 'Python Programming',
            type: 'guide',
            timestamp: Date.now(),
          },
        },
        {
          content: 'NumPy is a Python library for numerical computing and array operations.',
          metadata: {
            source: 'numpy-guide',
            title: 'NumPy Guide',
            type: 'documentation',
            timestamp: Date.now(),
          },
        },
      ]

      await indexer.indexDocuments(docs)

      const results = await indexer.search('python programming libraries', 2)
      expect(results.length).toBe(2)

      // Both documents should be found with reasonable similarity
      expect(results[0].score).toBeGreaterThan(0.3) // Adjusted for text-embedding-3-large
    }, 30000)

    it.skipIf(!OPENAI_API_KEY)('should build document graph from search', async () => {
      await indexer.initialize(OPENAI_API_KEY)

      const docs = [
        {
          content: 'LangChain is a framework for developing applications powered by language models.',
          metadata: {
            source: 'langchain',
            title: 'LangChain',
            type: 'documentation',
            timestamp: Date.now(),
          },
        },
        {
          content: 'Vector databases store high-dimensional embeddings for semantic search.',
          metadata: {
            source: 'vectordb',
            title: 'Vector Databases',
            type: 'article',
            timestamp: Date.now(),
          },
        },
        {
          content: 'Embeddings are numerical representations of text that capture semantic meaning.',
          metadata: {
            source: 'embeddings',
            title: 'Text Embeddings',
            type: 'guide',
            timestamp: Date.now(),
          },
        },
      ]

      await indexer.indexDocuments(docs)

      const graph = await indexer.searchRelated('semantic search technology', 3)

      expect(graph).toHaveProperty('nodes')
      expect(graph).toHaveProperty('edges')
      expect(graph.nodes.length).toBeGreaterThan(0)
      expect(graph.edges.length).toBeGreaterThan(0)

      // Verify node structure
      const node = graph.nodes[0]
      expect(node).toHaveProperty('id')
      expect(node).toHaveProperty('content')
      expect(node).toHaveProperty('metadata')
      expect(node).toHaveProperty('score')

      // Verify edge structure
      if (graph.edges.length > 0) {
        const edge = graph.edges[0]
        expect(edge).toHaveProperty('source')
        expect(edge).toHaveProperty('target')
        expect(edge).toHaveProperty('weight')
      }
    }, 30000)

    it.skipIf(!OPENAI_API_KEY)('should handle large documents with chunking', async () => {
      await indexer.initialize(OPENAI_API_KEY)

      const longContent = 'This is a sentence about AI. '.repeat(200) // ~6000 characters

      const docs = [
        {
          content: longContent,
          metadata: {
            source: 'long-doc',
            title: 'Long Document',
            type: 'article',
            timestamp: Date.now(),
          },
        },
      ]

      const result = await indexer.indexDocuments(docs)
      expect(result.indexed).toBe(1)
      expect(result.chunks).toBeGreaterThan(1) // Should be split into multiple chunks

      const searchResults = await indexer.search('AI', 5)
      expect(searchResults.length).toBeGreaterThan(0)
    }, 30000)
  })

  describe('Error Handling', () => {
    it('should throw error without API key', async () => {
      await expect(indexer.initialize('')).rejects.toThrow('OpenAI API key is required')
    })

    it('should throw error when indexing without initialization', async () => {
      const docs = [
        {
          content: 'Test',
          metadata: {
            source: 'test',
            title: 'Test',
            type: 'test',
            timestamp: Date.now(),
          },
        },
      ]

      await expect(indexer.indexDocuments(docs)).rejects.toThrow('Indexer not initialized')
    })

    it('should throw error when searching without initialization', async () => {
      await expect(indexer.search('test')).rejects.toThrow('Indexer not initialized')
    })

    it('should handle empty documents array', async () => {
      if (OPENAI_API_KEY) {
        await indexer.initialize(OPENAI_API_KEY)
        const result = await indexer.indexDocuments([])
        expect(result.indexed).toBe(0)
        expect(result.chunks).toBe(0)
      }
    })
  })
})
