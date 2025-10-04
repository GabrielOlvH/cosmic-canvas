import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { documentIndexer } from '@/lib/document-indexer'

export const Route = createFileRoute('/api/index-documents')({
  loader: async ({ request }) => {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405 })
    }

    try {
      const body = await request.json()
      const { documents, apiKey } = body

      if (!apiKey) {
        return json({ error: 'API key is required' }, { status: 400 })
      }

      if (!documents || !Array.isArray(documents)) {
        return json({ error: 'Documents array is required' }, { status: 400 })
      }

      // Initialize if not already done
      try {
        await documentIndexer.initialize(apiKey)
      } catch (error) {
        // Already initialized, continue
      }

      const result = await documentIndexer.indexDocuments(documents)

      return json({
        success: true,
        ...result,
      })
    } catch (error) {
      console.error('Error indexing documents:', error)
      return json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  },
})
